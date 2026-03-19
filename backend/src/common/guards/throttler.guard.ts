import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Extends the default ThrottlerGuard to extract the real client IP from the
 * X-Forwarded-For header when the app is running behind a reverse proxy
 * (Nginx, Vercel, Railway, etc.).
 *
 * Without this override, all requests through a proxy share the same tracker
 * key (the proxy IP), making rate limiting ineffective.
 */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const forwarded = (req.headers as Record<string, string>)[
      'x-forwarded-for'
    ];
    const realIp = forwarded?.split(',')[0]?.trim();
    return realIp ?? (req.ip as string) ?? 'unknown';
  }
}
