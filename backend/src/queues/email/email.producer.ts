import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_EMAIL, EmailJobName } from '../queues.constants';

const EMAIL_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
} as const;

@Injectable()
export class EmailProducer {
  constructor(@InjectQueue(QUEUE_EMAIL) private readonly queue: Queue) {}

  async sendVerificationEmail(
    email: string,
    fullName: string,
    token: string,
  ): Promise<void> {
    await this.queue.add(
      EmailJobName.SEND_VERIFICATION,
      { email, fullName, token },
      EMAIL_JOB_OPTS,
    );
  }

  async sendPasswordResetEmail(
    email: string,
    fullName: string,
    token: string,
  ): Promise<void> {
    await this.queue.add(
      EmailJobName.SEND_PASSWORD_RESET,
      { email, fullName, token },
      EMAIL_JOB_OPTS,
    );
  }

  async sendApplicationStatusEmail(
    to: string,
    name: string,
    jobTitle: string,
    statusLabel: string,
  ): Promise<void> {
    await this.queue.add(
      EmailJobName.SEND_APPLICATION_STATUS,
      { to, name, jobTitle, statusLabel },
      EMAIL_JOB_OPTS,
    );
  }
}
