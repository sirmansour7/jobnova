import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_EMAIL, QUEUE_AI } from './queues.constants';
import { EmailProducer } from './email/email.producer';
import { EmailProcessor } from './email/email.processor';
import { AiProducer } from './ai/ai.producer';
import { AiProcessor } from './ai/ai.processor';
import { EmailModule } from '../email/email.module';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAiAnalysisProvider } from '../cv/analysis/openai-analysis.provider';
import { RulesAnalysisProvider } from '../cv/analysis/rules-analysis.provider';
import { InterviewSummaryService } from '../interviews/interview-summary.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          // Falls back to local Redis in development. Set REDIS_URL in production.
          url: config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        },
        defaultJobOptions: {
          // Keep last 100 completed and 200 failed jobs for inspection
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      }),
    }),
    BullModule.registerQueue({ name: QUEUE_EMAIL }, { name: QUEUE_AI }),
    EmailModule,
  ],
  providers: [
    // Producers
    EmailProducer,
    AiProducer,
    // Processors (workers)
    EmailProcessor,
    AiProcessor,
    // Dependencies needed by the AI processor
    PrismaService,
    OpenAiAnalysisProvider,
    RulesAnalysisProvider,
    InterviewSummaryService,
  ],
  exports: [EmailProducer, AiProducer],
})
export class QueuesModule {}
