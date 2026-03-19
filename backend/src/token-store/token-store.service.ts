/**
 * TokenStoreService — Abstraction layer for refresh token persistence.
 *
 * Current implementation: PostgreSQL via Prisma.
 * Future implementation: Redis (swap this file only — zero changes elsewhere).
 *
 * Contract:
 *  - store()    → HMAC-SHA256 hash & persist a new refresh token for a user
 *  - validate() → constant-time compare incoming token against stored digest
 *  - revoke()   → set refreshTokenHash = null (logout / reuse detection)
 *
 * Security notes:
 *  - HMAC-SHA256 is appropriate here: the token itself is a high-entropy JWT
 *    (cryptographically random), so bcrypt's slow KDF adds no meaningful
 *    brute-force resistance while costing ~100 ms per request.
 *  - timingSafeEqual prevents timing oracle attacks on the comparison.
 *  - The HMAC key is JWT_REFRESH_SECRET (≥ 32 chars, validated at startup).
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenStoreService {
  private readonly hmacSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.hmacSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private digest(token: string): string {
    return createHmac('sha256', this.hmacSecret).update(token).digest('hex');
  }

  /** Hash and store a new refresh token for the given user. */
  async store(userId: string, refreshToken: string): Promise<void> {
    const hash = this.digest(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  /**
   * Validate an incoming refresh token against the stored digest.
   * Returns true if valid, false if invalid or no token stored.
   */
  async validate(userId: string, refreshToken: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refreshTokenHash: true },
    });

    if (!user?.refreshTokenHash) return false;

    const stored = Buffer.from(user.refreshTokenHash, 'hex');
    const expected = Buffer.from(this.digest(refreshToken), 'hex');

    // Buffers must be the same length for timingSafeEqual; they always will be
    // (both are 64-char hex → 32-byte buffers), but guard defensively.
    if (stored.length !== expected.length) return false;

    return timingSafeEqual(stored, expected);
  }

  /**
   * Revoke the refresh token for a user.
   * Used on: logout, suspicious reuse detection, password change.
   */
  async revoke(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }
}
