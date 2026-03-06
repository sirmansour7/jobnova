import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrgAuthService } from '../org/org-auth.service';
import { InterviewSummaryService } from './interview-summary.service';

const mockPrisma = {
  application: { findUnique: jest.fn() },
  interviewSession: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  interviewMessage: { create: jest.fn() },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

const mockOrgAuth = { assertOrgAccess: jest.fn() };
const mockSummaryService = { generate: jest.fn() };

describe('InterviewsService', () => {
  let service: InterviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrgAuthService, useValue: mockOrgAuth },
        { provide: InterviewSummaryService, useValue: mockSummaryService },
      ],
    }).compile();

    service = module.get<InterviewsService>(InterviewsService);
    jest.clearAllMocks();
  });

  describe('startInterview', () => {
    it('throws Forbidden when application belongs to another candidate', async () => {
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app1',
        candidateId: 'other-user',
        jobId: 'job1',
        job: { id: 'job1', title: 'J', organizationId: 'org1' },
      });

      await expect(
        service.startInterview('app1', 'candidate-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns existing session when one exists for application', async () => {
      const existing = {
        id: 'sess1',
        applicationId: 'app1',
        jobId: 'job1',
        status: 'active',
        currentStep: 0,
        startedAt: new Date(),
        completedAt: null,
        messages: [{ id: 'm1', role: 'bot', content: 'Q1', createdAt: new Date() }],
        summary: null,
      };
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app1',
        candidateId: 'candidate-id',
        jobId: 'job1',
        job: { id: 'job1', title: 'J', organizationId: 'org1' },
      });
      mockPrisma.interviewSession.findUnique.mockResolvedValue(existing);

      const result = await service.startInterview('app1', 'candidate-id');
      expect(result.id).toBe('sess1');
      expect(result.messages).toHaveLength(1);
      expect(mockPrisma.interviewSession.create).not.toHaveBeenCalled();
    });
  });

  describe('answerInterview', () => {
    it('throws NotFound when session does not exist', async () => {
      mockPrisma.interviewSession.findUnique.mockResolvedValue(null);

      await expect(
        service.answerInterview('sess1', 'candidate-id', 'answer'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws Forbidden when session belongs to another candidate', async () => {
      mockPrisma.interviewSession.findUnique.mockResolvedValue({
        id: 'sess1',
        candidateId: 'other',
        status: 'active',
        currentStep: 0,
        messages: [],
        summary: null,
      });

      await expect(
        service.answerInterview('sess1', 'candidate-id', 'answer'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequest when session already completed', async () => {
      mockPrisma.interviewSession.findUnique.mockResolvedValue({
        id: 'sess1',
        candidateId: 'candidate-id',
        status: 'completed',
        currentStep: 8,
        messages: [],
        summary: {},
      });

      await expect(
        service.answerInterview('sess1', 'candidate-id', 'answer'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequest when content is empty or whitespace-only', async () => {
      mockPrisma.interviewSession.findUnique.mockResolvedValue({
        id: 'sess1',
        candidateId: 'candidate-id',
        status: 'active',
        currentStep: 0,
        messages: [],
        summary: null,
      });

      await expect(
        service.answerInterview('sess1', 'candidate-id', ''),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.answerInterview('sess1', 'candidate-id', '   \t\n  '),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSession', () => {
    it('throws NotFound when session does not exist', async () => {
      mockPrisma.interviewSession.findUnique.mockResolvedValue(null);

      await expect(service.getSession('sess1', 'candidate-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws Forbidden when session belongs to another candidate', async () => {
      mockPrisma.interviewSession.findUnique.mockResolvedValue({
        id: 'sess1',
        candidateId: 'other',
        applicationId: 'app1',
        jobId: 'job1',
        status: 'active',
        currentStep: 0,
        startedAt: new Date(),
        completedAt: null,
        messages: [],
        summary: null,
      });

      await expect(service.getSession('sess1', 'candidate-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
