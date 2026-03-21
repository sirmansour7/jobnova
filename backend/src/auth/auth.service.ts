import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { TokenStoreService } from '../token-store/token-store.service';
import { AuditService } from '../audit/audit.service';
import { EmailProducer } from '../queues/email/email.producer';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditEvent, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { BCRYPT_ROUNDS } from '../common/constants';

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';
const INVALID_CREDENTIALS = 'Invalid credentials';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const PASSWORD_RESET_EXPIRY_MINUTES = 30;
const FORGOT_PASSWORD_MAX_REQUESTS = 3;
const FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000;

// Pre-computed bcrypt hash used solely to equalize response timing when a
// looked-up user does not exist. bcrypt.compare() is always called so an
// attacker cannot distinguish "email not found" from "wrong password" by
// measuring latency. This hash is intentionally public — it is never matched
// against any real credential.
const DUMMY_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenStore: TokenStoreService,
    private readonly audit: AuditService,
    private readonly emailProducer: EmailProducer,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ─────────────────────────────────────────
  // Register
  // ─────────────────────────────────────────

  async register(dto: RegisterDto) {
    const { fullName, email, password, role } = dto;
    const normalizedEmail = email.toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verificationToken = randomBytes(32).toString('hex');

    const requestedRole = role ?? Role.candidate;

    if (requestedRole === Role.admin) {
      const allowAdminRegister =
        this.configService.get<string>('ALLOW_ADMIN_REGISTER') === 'true';

      if (!allowAdminRegister) {
        throw new ForbiddenException('Admin registration is disabled');
      }
    }

    const user = await this.prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        passwordHash,
        role: requestedRole,
        verificationToken,
      },
    });

    this.audit.log({ event: AuditEvent.REGISTER, userId: user.id });

    await this.emailProducer.sendVerificationEmail(
      user.email,
      user.fullName,
      verificationToken,
    );

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  }

  // ─────────────────────────────────────────
  // Email Verification
  // ─────────────────────────────────────────

  async verifyEmail(token: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user || user.deletedAt)
      throw new BadRequestException('Invalid or expired verification token');
    if (user.emailVerified)
      throw new BadRequestException('Email already verified');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    this.audit.log({ event: AuditEvent.EMAIL_VERIFIED, userId: user.id, ip });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return {
        message: 'If this email exists, a verification email has been sent',
      };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const verificationToken = randomBytes(32).toString('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken },
    });

    this.logger.log(`Queuing verification email for user ${user.id}`);
    await this.emailProducer.sendVerificationEmail(
      user.email,
      user.fullName,
      verificationToken,
    );
    this.logger.log(`Verification email queued for user ${user.id}`);

    return { message: 'Verification email sent' };
  }

  // ─────────────────────────────────────────
  // Login (with Account Lockout)
  // ─────────────────────────────────────────

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const normalizedEmail = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // ✅ FIX: Always run bcrypt.compare to prevent timing-based email enumeration.
    // When the user does not exist (or is soft-deleted) we compare against a
    // dummy hash so response time is indistinguishable from a real failed attempt.
    if (!user || user.deletedAt) {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      this.audit.log({
        event: AuditEvent.LOGIN_FAILED,
        ip,
        userAgent,
        meta: { email: normalizedEmail, reason: 'user_not_found' },
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // ✅ Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      this.audit.log({
        event: AuditEvent.LOGIN_BLOCKED,
        userId: user.id,
        ip,
        userAgent,
        meta: { lockedUntil: user.lockedUntil.toISOString() },
      });
      throw new ForbiddenException(
        `Account locked. Try again after ${user.lockedUntil.toISOString()}`,
      );
    }

    // ✅ FIX: Check emailVerified BEFORE password comparison.
    // Previously, failed attempts on unverified accounts incremented the lockout
    // counter — an attacker could lock out a new user before they ever verified.
    // We still call bcrypt.compare here so response time stays consistent.
    if (!user.emailVerified) {
      await bcrypt.compare(dto.password, user.passwordHash);
      throw new ForbiddenException('Email not verified');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatch) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
            : null,
        },
      });

      this.audit.log({
        event: AuditEvent.LOGIN_FAILED,
        userId: user.id,
        ip,
        userAgent,
        meta: { attempts, locked: shouldLock },
      });

      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // ✅ Reset failed attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const { accessToken, refreshToken } = this.issueTokens(user.id, user.role, user.tokenVersion);
    await this.tokenStore.store(user.id, refreshToken);

    this.audit.log({
      event: AuditEvent.LOGIN_SUCCESS,
      userId: user.id,
      ip,
      userAgent,
    });

    return { accessToken, refreshToken, user: this.toAuthUser(user) };
  }

  // ─────────────────────────────────────────
  // Refresh
  // ─────────────────────────────────────────

  async refresh(refreshToken: string, ip?: string) {
    let payload: { sub: string; role?: Role; jti?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const isValid = await this.tokenStore.validate(payload.sub, refreshToken);
    if (!isValid) {
      await this.tokenStore.revoke(payload.sub);
      this.audit.log({
        event: AuditEvent.TOKEN_REUSED,
        userId: payload.sub,
        ip,
        meta: { reason: 'refresh_token_reuse' },
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        emailVerified: true,
        tokenVersion: true,
      },
    });
    if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS);

    const { accessToken, refreshToken: newRefreshToken } = this.issueTokens(
      user.id,
      user.role,
      user.tokenVersion,
    );
    await this.tokenStore.store(user.id, newRefreshToken);

    this.audit.log({ event: AuditEvent.REFRESH, userId: user.id, ip });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.toAuthUser(user),
    };
  }

  // ─────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────

  async logout(userId: string, ip?: string): Promise<{ message: string }> {
    await this.tokenStore.revoke(userId);
    this.audit.log({ event: AuditEvent.LOGOUT, userId, ip });
    return { message: 'Logged out successfully' };
  }

  // ─────────────────────────────────────────
  // Forgot Password
  // ─────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto, ip?: string) {
    const normalizedEmail = dto.email.toLowerCase();

    // ✅ Per-email rate limit: max 3 requests per 15 minutes.
    // Key hashes the email so PII is never stored in the cache layer.
    // Always return the same response — don't reveal rate-limit status.
    const emailHash = createHash('sha256').update(normalizedEmail).digest('hex');
    const rlKey = `rl:fp:${emailHash}`;
    const attempts = (await this.cache.get<number>(rlKey)) ?? 0;
    if (attempts >= FORGOT_PASSWORD_MAX_REQUESTS) {
      return { message: 'If this email exists, a reset link has been sent' };
    }
    await this.cache.set(rlKey, attempts + 1, FORGOT_PASSWORD_WINDOW_MS);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // ✅ Always return same response — don't reveal if email exists or is deleted
    if (!user || user.deletedAt) {
      return { message: 'If this email exists, a reset link has been sent' };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const expiry = new Date(
      Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpiry: expiry,
      },
    });

    this.audit.log({
      event: AuditEvent.PASSWORD_RESET_REQUESTED,
      userId: user.id,
      ip,
    });

    await this.emailProducer.sendPasswordResetEmail(
      user.email,
      user.fullName,
      resetToken,
    );

    return {
      message: 'If this email exists, a reset link has been sent',
    };
  }

  // ─────────────────────────────────────────
  // Reset Password
  // ─────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto, ip?: string) {
    const resetTokenHash = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: resetTokenHash },
    });

    if (!user || user.deletedAt || !user.passwordResetExpiry) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.passwordResetExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        refreshTokenHash: null,    // invalidate refresh token
        tokenVersion: { increment: 1 }, // invalidate all outstanding access tokens
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    this.audit.log({
      event: AuditEvent.PASSWORD_RESET_SUCCESS,
      userId: user.id,
      ip,
    });

    return { message: 'Password reset successfully. Please log in again.' };
  }

  // ─────────────────────────────────────────
  // Get Me
  // ─────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        emailVerified: true,
        deletedAt: true,
      },
    });
    if (!user || user.deletedAt) throw new UnauthorizedException(INVALID_CREDENTIALS);
    const { deletedAt: _deleted, ...rest } = user;
    return rest;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updateData: { fullName?: string } = {};
    if (dto.fullName !== undefined) {
      updateData.fullName = dto.fullName;
    }

    let user: {
      id: string;
      fullName: string;
      email: string;
      role: Role;
      emailVerified: boolean;
    } | null;

    if (Object.keys(updateData).length === 0) {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          emailVerified: true,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          emailVerified: true,
        },
      });
    }

    if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS);
    return this.toAuthUser(user);
  }

  // ─────────────────────────────────────────
  // Google OAuth
  // ─────────────────────────────────────────

  async googleLogin(profile: {
    googleId: string;
    email: string;
    fullName: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      role: Role;
      emailVerified: boolean;
    };
  }> {
    const normalizedEmail = profile.email.toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      if (user.deletedAt) throw new ForbiddenException('Account disabled');
    } else {
      const passwordHash = await bcrypt.hash(
        randomBytes(32).toString('hex'),
        BCRYPT_ROUNDS,
      );
      user = await this.prisma.user.create({
        data: {
          fullName: profile.fullName,
          email: normalizedEmail,
          passwordHash,
          role: Role.candidate,
          emailVerified: true,
        },
      });
      this.audit.log({ event: AuditEvent.REGISTER, userId: user.id });
    }

    const { accessToken, refreshToken } = this.issueTokens(
      user.id,
      user.role,
      user.tokenVersion,
    );
    await this.tokenStore.store(user.id, refreshToken);
    this.audit.log({ event: AuditEvent.LOGIN_SUCCESS, userId: user.id });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    };
  }

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────

  private issueTokens(userId: string, role: Role, tokenVersion: number) {
    const accessToken = this.jwtService.sign(
      { sub: userId, role, tokenVersion },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TOKEN_EXPIRES,
      },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, role, tokenVersion, jti: randomUUID() },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_EXPIRES,
      },
    );
    return { accessToken, refreshToken };
  }

  private toAuthUser(user: {
    id: string;
    fullName: string;
    email: string;
    role: Role;
    emailVerified: boolean;
  }) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  }
}
