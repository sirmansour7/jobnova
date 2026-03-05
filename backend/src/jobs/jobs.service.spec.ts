import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrgAuthService } from '../org/org-auth.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  job: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

const mockOrgAuth = { assertOrgAccess: jest.fn() };

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrgAuthService, useValue: mockOrgAuth },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated jobs', async () => {
      mockPrisma.job.findMany.mockResolvedValue([
        { id: '1', title: 'Dev', isActive: true },
      ]);
      mockPrisma.job.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should apply search filter', async () => {
      mockPrisma.job.findMany.mockResolvedValue([]);
      mockPrisma.job.count.mockResolvedValue(0);
      await service.findAll({ search: 'developer' });
      const whereArg = mockPrisma.job.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if job not found', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return job if found', async () => {
      mockPrisma.job.findUnique.mockResolvedValue({ id: '1', title: 'Dev' });
      const result = await service.findOne('1');
      expect(result.id).toBe('1');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if job not found', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);
      await expect(service.remove('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete job if authorized', async () => {
      mockPrisma.job.findUnique.mockResolvedValue({
        id: '1',
        organizationId: 'org-1',
      });
      mockOrgAuth.assertOrgAccess.mockResolvedValue(undefined);
      mockPrisma.job.delete.mockResolvedValue({});
      const result = await service.remove('1', 'user-1');
      expect(result.message).toBe('Job deleted successfully');
    });
  });
});
