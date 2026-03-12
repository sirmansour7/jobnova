import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async toggle(
    candidateId: string,
    jobId: string,
  ): Promise<{ saved: boolean }> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const existing = await this.prisma.savedJob.findUnique({
      where: {
        candidateId_jobId: { candidateId, jobId },
      },
    });

    if (existing) {
      await this.prisma.savedJob.delete({
        where: { id: existing.id },
      });
      return { saved: false };
    }

    await this.prisma.savedJob.create({
      data: { candidateId, jobId },
    });
    return { saved: true };
  }

  async findAll(candidateId: string) {
    const saved = await this.prisma.savedJob.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            partnerName: true,
            governorate: true,
            city: true,
            jobType: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            category: true,
            organization: { select: { id: true, name: true } },
          },
        },
      },
    });
    return saved.map((s) => ({
      id: s.id,
      jobId: s.jobId,
      createdAt: s.createdAt,
      job: s.job,
    }));
  }

  async isSaved(
    candidateId: string,
    jobId: string,
  ): Promise<{ saved: boolean }> {
    const saved = await this.prisma.savedJob.findUnique({
      where: {
        candidateId_jobId: { candidateId, jobId },
      },
    });
    return { saved: !!saved };
  }
}
