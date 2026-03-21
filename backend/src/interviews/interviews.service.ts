import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response as ExpressResponse } from 'express';
import { HrDecision, InterviewType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrgAuthService } from '../org/org-auth.service';
import { AiProducer } from '../queues/ai/ai.producer';
import { CreateScheduleInterviewDto } from './dto/create-schedule-interview.dto';
import { UpdateScheduleInterviewDto } from './dto/update-schedule-interview.dto';
import {
  INTERVIEW_QUESTIONS,
  INTERVIEW_QUESTIONS_COUNT,
} from './constants/interview-questions';

const SESSION_INCLUDE = {
  messages: { orderBy: { createdAt: 'asc' as const } },
  summary: true,
  application: {
    select: {
      id: true,
      status: true,
      jobId: true,
      candidateId: true,
      job: { select: { id: true, title: true, organizationId: true } },
    },
  },
  job: {
    select: {
      id: true,
      title: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  },
  candidate: {
    select: { id: true, fullName: true, email: true },
  },
};

const SCHEDULED_INTERVIEW_INCLUDE = {
  application: {
    select: {
      id: true,
      status: true,
      candidate: { select: { id: true, fullName: true, email: true } },
      job: { select: { id: true, title: true } },
    },
  },
};

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAuth: OrgAuthService,
    private readonly aiProducer: AiProducer,
    private readonly config: ConfigService,
  ) {}

  async startInterview(applicationId: string, candidateId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { select: { id: true, title: true, organizationId: true } },
      },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.candidateId !== candidateId)
      throw new ForbiddenException('Not your application');

    const existing = await this.prisma.interviewSession.findUnique({
      where: { applicationId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, summary: true },
    });
    if (existing) {
      return this.toSessionResponse(existing);
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const s = await tx.interviewSession.create({
        data: {
          applicationId,
          candidateId,
          jobId: application.jobId,
          status: 'active',
          currentStep: 0,
        },
      });
      await tx.interviewMessage.create({
        data: {
          sessionId: s.id,
          role: 'bot',
          content: INTERVIEW_QUESTIONS[0],
        },
      });
      return tx.interviewSession.findUniqueOrThrow({
        where: { id: s.id },
        include: { messages: { orderBy: { createdAt: 'asc' } }, summary: true },
      });
    });
    return this.toSessionResponse(session);
  }

  async answerInterview(
    sessionId: string,
    candidateId: string,
    content: string,
  ) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, summary: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.candidateId !== candidateId)
      throw new ForbiddenException('Not your interview session');
    if (session.status !== 'active')
      throw new BadRequestException('Interview already completed');

    const contentTrimmed = (content ?? '').trim();
    if (!contentTrimmed)
      throw new BadRequestException(
        'Answer cannot be empty or whitespace-only',
      );

    const nextStep = session.currentStep + 1;
    const isLastQuestion = nextStep >= INTERVIEW_QUESTIONS_COUNT;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.interviewMessage.create({
        data: { sessionId, role: 'candidate', content: contentTrimmed },
      });

      if (isLastQuestion) {
        await tx.interviewSession.update({
          where: { id: sessionId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            currentStep: nextStep,
          },
        });
      } else {
        await tx.interviewSession.update({
          where: { id: sessionId },
          data: { currentStep: nextStep },
        });
        await tx.interviewMessage.create({
          data: {
            sessionId,
            role: 'bot',
            content: INTERVIEW_QUESTIONS[nextStep],
          },
        });
      }

      return tx.interviewSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: 'asc' } }, summary: true },
      });
    });

    if (isLastQuestion) {
      // Queue summary generation so the response returns immediately.
      // The client can poll GET /interviews/sessions/:id for the summary.
      await this.aiProducer.queueInterviewSummary(sessionId);
    }

    return this.toSessionResponse(updated);
  }

  /**
   * Streaming version of answerInterview.
   * Saves the candidate answer, then streams the next AI question token-by-token
   * using Groq (falls back to static questions when API key is absent).
   *
   * Caller MUST set SSE response headers and call res.flushHeaders() BEFORE
   * invoking this method.
   */
  async answerInterviewStream(
    sessionId: string,
    candidateId: string,
    content: string,
    res: ExpressResponse,
  ): Promise<void> {
    // ── 1. Validate ───────────────────────────────────────────────────────────
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: {
        candidateId: true,
        status: true,
        currentStep: true,
        messages: {
          orderBy: { createdAt: 'asc' as const },
          select: { role: true, content: true },
        },
        job: { select: { title: true } },
        candidate: { select: { fullName: true } },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.candidateId !== candidateId)
      throw new ForbiddenException('Not your interview session');
    if (session.status !== 'active')
      throw new BadRequestException('Interview already completed');

    const contentTrimmed = (content ?? '').trim();
    if (!contentTrimmed)
      throw new BadRequestException('Answer cannot be empty');

    const nextStep = session.currentStep + 1;
    const isLastQuestion = nextStep >= INTERVIEW_QUESTIONS_COUNT;

    // ── 2. Persist candidate answer + update session ──────────────────────────
    await this.prisma.$transaction([
      this.prisma.interviewMessage.create({
        data: { sessionId, role: 'candidate', content: contentTrimmed },
      }),
      this.prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
          currentStep: nextStep,
          ...(isLastQuestion && {
            status: 'completed',
            completedAt: new Date(),
          }),
        },
      }),
    ]);

    // ── 3. Last question → complete ───────────────────────────────────────────
    if (isLastQuestion) {
      void this.aiProducer.queueInterviewSummary(sessionId);
      this.sseWrite(res, { type: 'done', status: 'completed', step: nextStep });
      res.end();
      return;
    }

    // ── 4. Build Groq conversation history ───────────────────────────────────
    const jobTitle = session.job?.title ?? 'الوظيفة';
    const candidateName = session.candidate?.fullName ?? 'المرشح';

    const systemPrompt =
      `أنت محاور توظيف ذكي اسمك "نوفا" تعمل لمنصة JobNova المصرية.\n` +
      `تجري مقابلة تعارف مع مرشح اسمه "${candidateName}" لوظيفة "${jobTitle}".\n\n` +
      `هدفك جمع هذه المعلومات بشكل محادثة طبيعية (واحدة تلو الأخرى):\n` +
      `1. الخلفية المهنية وسنوات الخبرة\n` +
      `2. أهم المهارات التقنية\n` +
      `3. الراتب المتوقع (جنيه مصري فقط)\n` +
      `4. موعد الإتاحة للعمل\n\n` +
      `قواعد صارمة:\n` +
      `- سؤال واحد فقط في كل رد\n` +
      `- ردود قصيرة (2-3 جمل كحد أقصى)\n` +
      `- العربية الفصحى البسيطة\n` +
      `- شجّع المرشح بجملة قصيرة ثم اسأل السؤال التالي\n` +
      `- لا تكرر أسئلة سبق طرحها\n` +
      `- بعد جمع كل المعلومات: اشكر "${candidateName}" وأخبره أن بياناته ستُرسل للمسؤول`;

    const groqHistory = [
      ...session.messages.map((m) => ({
        role: m.role === 'bot' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      })),
      { role: 'user' as const, content: contentTrimmed },
    ];

    // ── 5. Stream from Groq (or fallback) ────────────────────────────────────
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    let fullContent = '';

    if (apiKey) {
      try {
        const groqRes = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              max_tokens: 150,
              temperature: 0.7,
              stream: true,
              messages: [
                { role: 'system', content: systemPrompt },
                ...groqHistory,
              ],
            }),
          },
        );

        if (!groqRes.ok || !groqRes.body) {
          throw new Error(`Groq ${groqRes.status}: ${groqRes.statusText}`);
        }

        const reader = groqRes.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6).trim();
            if (payload === '[DONE]') break outer;
            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const token = parsed.choices?.[0]?.delta?.content ?? '';
              if (token) {
                fullContent += token;
                this.sseWrite(res, { type: 'token', content: token });
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        this.logger.warn(`Groq streaming failed, using fallback: ${String(err)}`);
        // Fallback handled below
      }
    }

    // Fallback: static question when Groq is unavailable or errored
    if (!fullContent) {
      const fallback = INTERVIEW_QUESTIONS[nextStep];
      fullContent = fallback;
      this.sseWrite(res, { type: 'token', content: fallback });
    }

    // ── 6. Persist AI response ───────────────────────────────────────────────
    const saved = await this.prisma.interviewMessage.create({
      data: { sessionId, role: 'bot', content: fullContent },
    });

    this.sseWrite(res, {
      type: 'done',
      status: 'active',
      step: nextStep,
      messageId: saved.id,
    });
    res.end();
  }

  /** Writes a single SSE data line to the response. */
  private sseWrite(res: ExpressResponse, payload: Record<string, unknown>): void {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  async getSession(sessionId: string, candidateId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, summary: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.candidateId !== candidateId)
      throw new ForbiddenException('Not your interview session');
    return this.toSessionResponse(session);
  }

  async listForHr(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        roleInOrg: { in: ['OWNER', 'HR'] },
      },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    if (orgIds.length === 0) return { items: [] };

    const sessions = await this.prisma.interviewSession.findMany({
      where: { job: { organizationId: { in: orgIds } } },
      include: SESSION_INCLUDE,
      orderBy: { startedAt: 'desc' },
    });
    return { items: sessions.map((s) => this.toHrSessionResponse(s)) };
  }

  async getForHr(sessionId: string, userId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: SESSION_INCLUDE,
    });
    if (!session) throw new NotFoundException('Session not found');
    await this.orgAuth.assertOrgAccess(userId, session.job.organizationId);
    return this.toHrSessionResponse(session);
  }

  async updateDecision(sessionId: string, userId: string, decision: HrDecision) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { job: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    await this.orgAuth.assertOrgAccess(userId, session.job.organizationId);

    const updated = await this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        hrDecision: decision,
        hrDecisionAt: new Date(),
        status: 'reviewed',
      },
      include: SESSION_INCLUDE,
    });
    return this.toHrSessionResponse(updated);
  }

  private toSessionResponse(session: {
    id: string;
    applicationId: string;
    candidateId: string;
    jobId: string;
    status: string;
    currentStep: number;
    startedAt: Date;
    completedAt: Date | null;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: Date;
    }>;
    summary: unknown;
  }) {
    return {
      id: session.id,
      applicationId: session.applicationId,
      jobId: session.jobId,
      status: session.status,
      currentStep: session.currentStep,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      messages: session.messages,
      summary: session.summary,
    };
  }

  private toHrSessionResponse(session: {
    id: string;
    applicationId: string;
    candidateId: string;
    jobId: string;
    status: string;
    currentStep: number;
    startedAt: Date;
    completedAt: Date | null;
    hrDecision: HrDecision | null;
    hrDecisionAt: Date | null;
    application: unknown;
    job: unknown;
    candidate: unknown;
    messages: unknown;
    summary: unknown;
  }) {
    return {
      id: session.id,
      applicationId: session.applicationId,
      jobId: session.jobId,
      status: session.status,
      currentStep: session.currentStep,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      hrDecision: session.hrDecision,
      hrDecisionAt: session.hrDecisionAt,
      application: session.application,
      job: session.job,
      candidate: session.candidate,
      messages: session.messages,
      summary: session.summary,
    };
  }

  // --- Scheduled Interview (Interview model) ---

  async createInterview(
    dto: CreateScheduleInterviewDto,
    organizationId: string,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: dto.applicationId },
      include: { job: { select: { organizationId: true } } },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.job.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Application does not belong to your organization',
      );
    }
    const interview = await this.prisma.interview.create({
      data: {
        applicationId: dto.applicationId,
        scheduledAt: new Date(dto.scheduledAt),
        durationMins: dto.durationMins ?? 60,
        type: dto.type ?? InterviewType.ONLINE,
        location: dto.location ?? null,
        notes: dto.notes ?? null,
      },
      include: SCHEDULED_INTERVIEW_INCLUDE,
    });
    return interview;
  }

  async findInterviewsByOrg(organizationId: string) {
    const list = await this.prisma.interview.findMany({
      where: {
        application: {
          job: { organizationId },
        },
      },
      include: SCHEDULED_INTERVIEW_INCLUDE,
      orderBy: { scheduledAt: 'desc' },
    });
    return list;
  }

  async updateInterview(
    id: string,
    dto: UpdateScheduleInterviewDto,
    organizationId: string,
  ) {
    const existing = await this.prisma.interview.findUnique({
      where: { id },
      include: { application: { include: { job: true } } },
    });
    if (!existing) throw new NotFoundException('Interview not found');
    if (existing.application.job.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Interview does not belong to your organization',
      );
    }
    const interview = await this.prisma.interview.update({
      where: { id },
      data: {
        ...(dto.applicationId != null && { applicationId: dto.applicationId }),
        ...(dto.scheduledAt != null && {
          scheduledAt: new Date(dto.scheduledAt),
        }),
        ...(dto.durationMins != null && { durationMins: dto.durationMins }),
        ...(dto.type != null && { type: dto.type }),
        ...(dto.location !== undefined && { location: dto.location ?? null }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        ...(dto.status != null && { status: dto.status }),
      },
      include: SCHEDULED_INTERVIEW_INCLUDE,
    });
    return interview;
  }

  async removeInterview(id: string, organizationId: string) {
    const existing = await this.prisma.interview.findUnique({
      where: { id },
      include: { application: { include: { job: true } } },
    });
    if (!existing) throw new NotFoundException('Interview not found');
    if (existing.application.job.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Interview does not belong to your organization',
      );
    }
    await this.prisma.interview.delete({ where: { id } });
  }
}
