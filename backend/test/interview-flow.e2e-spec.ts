/**
 * Interview flow e2e tests.
 * Requires: DATABASE_URL in .env and all Prisma migrations applied (including Job.updatedAt, InterviewSession, etc.).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ts = Date.now();
const candidateUser = {
  fullName: 'Interview Candidate E2E',
  email: `interview_cand_${ts}@test.com`,
  password: 'Test123456!',
  role: 'candidate',
};
const hrUser = {
  fullName: 'Interview HR E2E',
  email: `interview_hr_${ts}@test.com`,
  password: 'Test123456!',
  role: 'hr',
};
const hrUser2 = {
  fullName: 'Interview HR2 E2E',
  email: `interview_hr2_${ts}@test.com`,
  password: 'Test123456!',
  role: 'hr',
};
const otherCandidate = {
  fullName: 'Other Candidate E2E',
  email: `interview_other_${ts}@test.com`,
  password: 'Test123456!',
  role: 'candidate',
};

describe('Interview Flow (e2e)', () => {
  let app: INestApplication;
  let candidateToken: string;
  let otherCandidateToken: string;
  let hrToken: string;
  let hr2Token: string;
  let applicationId: string;
  let sessionId: string;
  let jobId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('setup', () => {
    it('registers candidate and HR users', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(candidateUser)
        .expect(201);
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(hrUser)
        .expect(201);
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(hrUser2)
        .expect(201);
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(otherCandidate)
        .expect(201);
      const prisma = app.get(PrismaService);
      await prisma.user.updateMany({
        where: {
          email: {
            in: [
              candidateUser.email,
              hrUser.email,
              hrUser2.email,
              otherCandidate.email,
            ],
          },
        },
        data: { emailVerified: true },
      });
    });

    it('logs in candidate and HR', async () => {
      const candRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: candidateUser.email, password: candidateUser.password })
        .expect(200);
      candidateToken = candRes.body.accessToken;

      const hrRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: hrUser.email, password: hrUser.password })
        .expect(200);
      hrToken = hrRes.body.accessToken;

      const hr2Res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: hrUser2.email, password: hrUser2.password })
        .expect(200);
      hr2Token = hr2Res.body.accessToken;

      const otherRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: otherCandidate.email, password: otherCandidate.password })
        .expect(200);
      otherCandidateToken = otherRes.body.accessToken;
    });

    it('HR creates org and job', async () => {
      const orgRes = await request(app.getHttpServer())
        .post('/v1/orgs')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ name: 'Interview Test Org', slug: `interview-org-${ts}` })
        .expect(201);
      const orgId = orgRes.body.id;

      const jobRes = await request(app.getHttpServer())
        .post('/v1/jobs')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          organizationId: orgId,
          title: 'Interview Test Job',
          partnerName: 'Test Partner',
        })
        .expect(201);
      jobId = jobRes.body.id;
    });

    it('candidate applies to job', async () => {
      const appRes = await request(app.getHttpServer())
        .post('/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobId })
        .expect(201);
      applicationId = appRes.body.id;
    });
  });

  describe('1) Candidate start interview', () => {
    it('authenticated candidate can start interview for own application', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/interviews/start')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ applicationId })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('active');
      expect(Array.isArray(res.body.messages)).toBe(true);
      expect(res.body.messages.length).toBe(1);
      expect(res.body.messages[0].role).toBe('bot');
      sessionId = res.body.id;
    });
  });

  describe('2) Candidate cannot start for another application', () => {
    it('returns 403 when candidate tries to start for another candidate application', async () => {
      const otherAppRes = await request(app.getHttpServer())
        .post('/v1/applications')
        .set('Authorization', `Bearer ${otherCandidateToken}`)
        .send({ jobId })
        .expect(201);
      const otherAppId = otherAppRes.body.id;

      await request(app.getHttpServer())
        .post('/v1/interviews/start')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ applicationId: otherAppId })
        .expect(403);
    });
  });

  describe('3) Starting interview twice is safe', () => {
    it('second start returns existing session without creating duplicate', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/interviews/start')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ applicationId })
        .expect(201);

      expect(res.body.id).toBe(sessionId);
      expect(res.body.messages.length).toBe(1);
    });
  });

  describe('4) Candidate answer flow', () => {
    it('candidate can answer; message stored and next bot question returned', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/interviews/${sessionId}/answer`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ content: 'إجابة تجريبية للسؤال الأول' })
        .expect(201);

      expect(res.body.messages.length).toBe(3);
      expect(res.body.messages[0].role).toBe('bot');
      expect(res.body.messages[1].role).toBe('candidate');
      expect(res.body.messages[1].content).toBe('إجابة تجريبية للسؤال الأول');
      expect(res.body.messages[2].role).toBe('bot');
      expect(res.body.currentStep).toBe(1);
    });
  });

  describe('5) Empty answer rejected', () => {
    it('empty string returns 400', async () => {
      await request(app.getHttpServer())
        .post(`/v1/interviews/${sessionId}/answer`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ content: '' })
        .expect(400);
    });

    it('whitespace-only returns 400', async () => {
      await request(app.getHttpServer())
        .post(`/v1/interviews/${sessionId}/answer`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ content: '   \n\t  ' })
        .expect(400);
    });
  });

  describe('6) Completing the interview', () => {
    it('after all 8 answers session is completed and summary generated', async () => {
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post(`/v1/interviews/${sessionId}/answer`)
          .set('Authorization', `Bearer ${candidateToken}`)
          .send({ content: `إجابة ${i + 2}` })
          .expect(201);
      }

      const lastRes = await request(app.getHttpServer())
        .post(`/v1/interviews/${sessionId}/answer`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ content: 'الإجابة الأخيرة' })
        .expect(201);

      expect(lastRes.body.status).toBe('completed');
      expect(lastRes.body.summary).toBeDefined();
    });

    it('no further answer accepted after completion', async () => {
      await request(app.getHttpServer())
        .post(`/v1/interviews/${sessionId}/answer`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ content: 'أي إضافة بعد الإكمال' })
        .expect(400);
    });
  });

  describe('7) Candidate session ownership', () => {
    it('candidate cannot fetch another candidate session', async () => {
      await request(app.getHttpServer())
        .get(`/v1/interviews/${sessionId}`)
        .set('Authorization', `Bearer ${otherCandidateToken}`)
        .expect(403);
    });

    it('owner candidate can fetch own session', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/interviews/${sessionId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);
      expect(res.body.id).toBe(sessionId);
      expect(res.body.status).toBe('completed');
    });
  });

  describe('8) HR list and detail access', () => {
    it('HR can list interviews for their organization', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/hr/interviews')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
      const found = res.body.items.find((s: { id: string }) => s.id === sessionId);
      expect(found).toBeDefined();
    });

    it('HR can open one interview detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/hr/interviews/${sessionId}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      expect(res.body.id).toBe(sessionId);
      expect(res.body.candidate).toBeDefined();
      expect(res.body.job).toBeDefined();
      expect(res.body.messages).toBeDefined();
    });

    it('HR from other org cannot access this interview', async () => {
      await request(app.getHttpServer())
        .post('/v1/orgs')
        .set('Authorization', `Bearer ${hr2Token}`)
        .send({ name: 'Other Org', slug: `other-org-${ts}` })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/v1/hr/interviews/${sessionId}`)
        .set('Authorization', `Bearer ${hr2Token}`)
        .expect(403);
    });
  });

  describe('9) HR decision update', () => {
    it('HR can set shortlist', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/hr/interviews/${sessionId}/decision`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ decision: 'shortlist' })
        .expect(200);

      expect(res.body.hrDecision).toBe('shortlist');
      expect(res.body.status).toBe('reviewed');
    });

    it('HR can set reject', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/hr/interviews/${sessionId}/decision`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ decision: 'reject' })
        .expect(200);
      expect(res.body.hrDecision).toBe('reject');
    });

    it('HR can set needs review', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/hr/interviews/${sessionId}/decision`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ decision: 'needs review' })
        .expect(200);
      expect(res.body.hrDecision).toBe('needs review');
    });
  });

  describe('10) Non-HR cannot access HR endpoints', () => {
    it('candidate gets 403 on GET /v1/hr/interviews', async () => {
      await request(app.getHttpServer())
        .get('/v1/hr/interviews')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(403);
    });

    it('candidate gets 403 on GET /v1/hr/interviews/:id', async () => {
      await request(app.getHttpServer())
        .get(`/v1/hr/interviews/${sessionId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(403);
    });

    it('candidate gets 403 on PATCH decision', async () => {
      await request(app.getHttpServer())
        .patch(`/v1/hr/interviews/${sessionId}/decision`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ decision: 'shortlist' })
        .expect(403);
    });
  });
});
