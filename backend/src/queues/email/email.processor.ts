import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from '../../email/email.service';
import { QUEUE_EMAIL, EmailJobName } from '../queues.constants';

type VerificationPayload = { email: string; fullName: string; token: string };
type PasswordResetPayload = { email: string; fullName: string; token: string };
type AppStatusPayload = {
  to: string;
  name: string;
  jobTitle: string;
  statusLabel: string;
};

@Processor(QUEUE_EMAIL, { concurrency: 5 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case EmailJobName.SEND_VERIFICATION: {
        const d = job.data as VerificationPayload;
        await this.emailService.sendVerificationEmail(d.email, d.fullName, d.token);
        break;
      }
      case EmailJobName.SEND_PASSWORD_RESET: {
        const d = job.data as PasswordResetPayload;
        await this.emailService.sendPasswordResetEmail(d.email, d.fullName, d.token);
        break;
      }
      case EmailJobName.SEND_APPLICATION_STATUS: {
        const d = job.data as AppStatusPayload;
        await this.emailService.sendApplicationStatusEmail(
          d.to,
          d.name,
          d.jobTitle,
          d.statusLabel,
        );
        break;
      }
      default:
        this.logger.warn(`[EmailProcessor] Unknown job name: ${job.name}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`[email] ${job.name}#${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `[email] ${job.name}#${job.id} failed` +
        ` (attempt ${job.attemptsMade}/${job.opts.attempts ?? '?'}): ${error.message}`,
    );
  }
}
