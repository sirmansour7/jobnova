import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_AI, AiJobName } from '../queues.constants';

@Injectable()
export class AiProducer {
  constructor(@InjectQueue(QUEUE_AI) private readonly queue: Queue) {}

  async queueCvAnalysis(
    userId: string,
    providerKey: string,
    version: number,
  ): Promise<void> {
    await this.queue.add(
      AiJobName.ANALYZE_CV,
      { userId, providerKey, version },
      { attempts: 2, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async queueInterviewSummary(sessionId: string): Promise<void> {
    await this.queue.add(
      AiJobName.GENERATE_INTERVIEW_SUMMARY,
      { sessionId },
      { attempts: 2, backoff: { type: 'exponential', delay: 3000 } },
    );
  }
}
