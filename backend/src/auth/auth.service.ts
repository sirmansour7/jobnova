import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TokenStoreService } from '../token-store/token-store.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuditEvent, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { BCRYPT_ROUNDS } from '../common/constants';

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';
const INVALID_CREDENTIALS = 'Invalid credentials';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const PASSWORD_RESET_EXPIRY_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenStore: TokenStoreService,
    private readonly audit: AuditService,
    private readonly emailService: EmailService,
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
      const nodeEnv = this.configService.get<string>('NODE_ENV');
      const allowAdminRegister =
        this.configService.get<string>('ALLOW_ADMIN_REGISTER') === 'true';

      if (nodeEnv === 'production' && !allowAdminRegister) {
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

    await this.emailService.sendVerificationEmail(
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

    if (!user)
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

  // ─────────────────────────────────────────
  // Login (with Account Lockout)
  // ─────────────────────────────────────────

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const normalizedEmail = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
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

    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    // ✅ Reset failed attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const { accessToken, refreshToken } = this.issueTokens(user.id, user.role);
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
        event: AuditEvent.SUSPICIOUS_ACTIVITY,
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
      },
    });
    if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS);

    const { accessToken, refreshToken: newRefreshToken } = this.issueTokens(
      user.id,
      user.role,
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // ✅ Always return same response — don't reveal if email exists
    if (!user) {
      return { message: 'If this email exists, a reset link has been sent' };
    }

    const resetToken = randomBytes(32).toString('hex');
    const expiry = new Date(
      Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: expiry,
      },
    });

    this.audit.log({
      event: AuditEvent.PASSWORD_RESET_REQUESTED,
      userId: user.id,
      ip,
    });

    await this.emailService.sendPasswordResetEmail(
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
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: dto.token },
    });

    if (!user || !user.passwordResetExpiry) {
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
        refreshTokenHash: null, // Force logout all sessions
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
      },
    });
    if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS);
    return user;
  }

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────

  private issueTokens(userId: string, role: Role) {
    const accessToken = this.jwtService.sign(
      { sub: userId, role },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TOKEN_EXPIRES,
      },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, role, jti: randomUUID() },
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
