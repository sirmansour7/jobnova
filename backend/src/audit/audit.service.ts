import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Fields that must NEVER appear in audit logs
const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'accessToken',
  'secret',
];

function sanitize(
  meta?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const lower = k.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
      clean[k] = '[REDACTED]';
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export interface LogEventDto {
  event: AuditEvent;
  userId?: string;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget audit log.
   * Never throws — logging must never break the main flow.
   */
  log(dto: LogEventDto): void {
    const { event, userId, ip, userAgent, meta } = dto;

    this.prisma.auditLog
      .create({
        data: {
          event,
          userId: userId ?? null,
          ip: ip ?? null,
          userAgent: userAgent ?? null,
          meta: (sanitize(meta) ?? {}) as Prisma.InputJsonValue,
        },
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[AuditService] Failed to write log:', msg);
      });
  }
}
