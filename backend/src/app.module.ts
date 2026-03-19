import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { IpThrottlerGuard } from './common/guards/throttler.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { ApplicationsModule } from './applications/applications.module';
import { OrgModule } from './org/org.module';
import { AdminModule } from './admin/admin.module';
import { HrModule } from './hr/hr.module';
import { CvModule } from './cv/cv.module';
import { MessagingModule } from './messaging/messaging.module';
import { LoggerModule } from './common/logger.module';
import { envValidationSchema } from './env.validation';
import { ChatModule } from './chat/chat.module';
import { InterviewsModule } from './interviews/interviews.module';
import { HealthModule } from './health/health.module';
import { SavedJobsModule } from './saved-jobs/saved-jobs.module';
import { GovernoratesModule } from './governorates/governorates.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QueuesModule } from './queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),

    LoggerModule,

    // In-memory cache — swap store to Redis by adding `store` + `url` here
    CacheModule.register({ isGlobal: true }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Real client IP is extracted in IpThrottlerGuard via X-Forwarded-For
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL') ?? 60000,
            limit: config.get<number>('THROTTLE_LIMIT') ?? 20,
          },
        ],
      }),
    }),

    AuthModule,
    JobsModule,
    ApplicationsModule,
    OrgModule,
    AdminModule,
    HrModule,
    CvModule,
    MessagingModule,
    ChatModule,
    InterviewsModule,
    HealthModule,
    SavedJobsModule,
    GovernoratesModule,
    NotificationsModule,
    QueuesModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: IpThrottlerGuard }],
})
export class AppModule {}
