import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgAuthService } from '../org/org-auth.service';
import { InterviewSummaryService } from './interview-summary.service';
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

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAuth: OrgAuthService,
    private readonly summaryService: InterviewSummaryService,
  ) {}

  async startInterview(applicationId: string, candidateId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { select: { id: true, title: true, organizationId: true } } },
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
    return this.toSessionResponse(session!);
  }

  async answerInterview(sessionId: string, candidateId: string, content: string) {
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
      throw new BadRequestException('Answer cannot be empty or whitespace-only');

    const nextStep = session.currentStep + 1;
    const isLastQuestion = nextStep >= INTERVIEW_QUESTIONS_COUNT;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.interviewMessage.create({
        data: { sessionId, role: 'candidate', content: contentTrimmed },
      });

      if (isLastQuestion) {
        await tx.interviewSession.update({
          where: { id: sessionId },
          data: { status: 'completed', completedAt: new Date(), currentStep: nextStep },
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
      await this.summaryService.generate(sessionId);
      const withSummary = await this.prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: 'asc' } }, summary: true },
      });
      return this.toSessionResponse(withSummary!);
    }

    return this.toSessionResponse(updated);
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

  async updateDecision(sessionId: string, userId: string, decision: string) {
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
    messages: Array<{ id: string; role: string; content: string; createdAt: Date }>;
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
    hrDecision: string | null;
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
}
