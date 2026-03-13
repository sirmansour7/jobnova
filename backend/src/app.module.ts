import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),

    LoggerModule,

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL') ?? 60000,
          limit: config.get<number>('THROTTLE_LIMIT') ?? 100,
        },
      ],
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
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
