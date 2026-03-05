/**
 * TokenStoreService — Abstraction layer for refresh token persistence.
 *
 * Current implementation: PostgreSQL via Prisma.
 * Future implementation: Redis (swap this file only — zero changes elsewhere).
 *
 * Contract:
 *  - store()    → hash & persist a new refresh token for a user
 *  - validate() → bcrypt.compare incoming token against stored hash
 *  - revoke()   → set refreshTokenHash = null (logout / reuse detection)
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../common/constants';

@Injectable()
export class TokenStoreService {
  constructor(private readonly prisma: PrismaService) {}

  /** Hash and store a new refresh token for the given user. */
  async store(userId: string, refreshToken: string): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  /**
   * Validate an incoming refresh token against the stored hash.
   * Returns true if valid, false if invalid or no token stored.
   */
  async validate(userId: string, refreshToken: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refreshTokenHash: true },
    });

    if (!user?.refreshTokenHash) return false;

    return bcrypt.compare(refreshToken, user.refreshTokenHash);
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
