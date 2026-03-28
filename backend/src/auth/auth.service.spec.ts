import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { TokenStoreService } from '../token-store/token-store.service';
import { AuditService } from '../audit/audit.service';
import { EmailProducer } from '../queues/email/email.producer';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuditEvent, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};
const mockConfig = { get: jest.fn().mockReturnValue('mock-secret') };
const mockTokenStore = {
  store: jest.fn().mockResolvedValue(undefined),
  validate: jest.fn(),
  revoke: jest.fn(),
};
const mockAudit = { log: jest.fn() };
const mockEmailProducer = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};
const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

const baseUser = {
  id: 'user-1',
  fullName: 'Test User',
  email: 'test@example.com',
  passwordHash: '',
  role: Role.candidate,
  emailVerified: true,
  tokenVersion: 0,
  failedLoginAttempts: 0,
  lockedUntil: null,
  deletedAt: null,
  verificationToken: null,
  passwordResetToken: null,
  passwordResetExpiry: null,
  refreshTokenHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: TokenStoreService, useValue: mockTokenStore },
        { provide: AuditService, useValue: mockAudit },
        { provide: EmailProducer, useValue: mockEmailProducer },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockCache.get.mockResolvedValue(null);
    mockTokenStore.store.mockResolvedValue(undefined);
    mockEmailProducer.sendVerificationEmail.mockResolvedValue(undefined);
    mockEmailProducer.sendPasswordResetEmail.mockResolvedValue(undefined);
  });

  // ─────────────────────────────────────────
  // register
  // ─────────────────────────────────────────

  describe('register', () => {
    it('should create a new user and return user data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...baseUser,
        emailVerified: false,
      });

      const result = await service.register({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        role: Role.candidate,
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ verificationToken: expect.any(String) }),
        }),
      );
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe(Role.candidate);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.REGISTER }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.register({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
          role: Role.candidate,
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────
  // login
  // ─────────────────────────────────────────

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const hash = await bcrypt.hash('Password123!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash });
      mockPrisma.user.update.mockResolvedValue({ ...baseUser, passwordHash: hash });

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockTokenStore.store).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.LOGIN_SUCCESS }),
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const hash = await bcrypt.hash('CorrectPassword!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash });
      mockPrisma.user.update.mockResolvedValue({});

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPassword!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockTokenStore.store).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if account is locked', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        lockedUntil: new Date(Date.now() + 60_000),
        failedLoginAttempts: 5,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'pass' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if email not verified', async () => {
      const hash = await bcrypt.hash('Password123!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        passwordHash: hash,
        emailVerified: false,
      });
      mockPrisma.user.update.mockResolvedValue({});

      await expect(
        service.login({ email: 'test@example.com', password: 'Password123!' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────
  // googleLogin
  // ─────────────────────────────────────────

  describe('googleLogin', () => {
    it('should create a new user if email not found', async () => {
      const newUser = { ...baseUser, email: 'new@example.com', emailVerified: true };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(newUser);

      const result = await service.googleLogin({
        googleId: 'google-123',
        email: 'new@example.com',
        fullName: 'New User',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            emailVerified: true,
            role: Role.candidate,
          }),
        }),
      );
      expect(result.accessToken).toBe('mock-token');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.REGISTER }),
      );
    });

    it('should return tokens for existing user without creating a new one', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await service.googleLogin({
        googleId: 'google-123',
        email: 'test@example.com',
        fullName: 'Test User',
      });

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.LOGIN_SUCCESS }),
      );
    });
  });

  // ─────────────────────────────────────────
  // verifyEmail
  // ─────────────────────────────────────────

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', emailVerified: false });
      mockPrisma.user.update.mockResolvedValue({});

      const res = await service.verifyEmail('valid-token');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { emailVerified: true, verificationToken: null },
      });
      expect(res).toEqual({ message: 'Email verified successfully' });
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('bad')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if email already verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', emailVerified: true });
      await expect(service.verifyEmail('token')).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // logout
  // ─────────────────────────────────────────

  describe('logout', () => {
    it('should revoke token and log audit event', async () => {
      mockTokenStore.revoke.mockResolvedValue(undefined);
      await service.logout('user-1');
      expect(mockTokenStore.revoke).toHaveBeenCalledWith('user-1');
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────
  // forgotPassword
  // ─────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should not reveal whether email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await service.forgotPassword({ email: 'missing@test.com' });
      expect(res).toEqual({ message: 'If this email exists, a reset link has been sent' });
      expect(mockEmailProducer.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should store hashed reset token and send reset email with raw token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u@test.com',
        fullName: 'User',
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.forgotPassword({ email: 'u@test.com' });

      expect(mockEmailProducer.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const [, , rawToken] = mockEmailProducer.sendPasswordResetEmail.mock.calls[0];
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({
            passwordResetToken: tokenHash,
            passwordResetExpiry: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────
  // resetPassword
  // ─────────────────────────────────────────

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const rawToken = 'raw-reset-token';
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.user.findUnique.mockImplementation(async (args: any) => {
        if (args?.where?.passwordResetToken === tokenHash) {
          return { id: 'u1', passwordResetExpiry: new Date(Date.now() + 60_000) };
        }
        return null;
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.resetPassword({ token: rawToken, newPassword: 'newpassword123' });

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 'u1' });
      expect(updateCall.data.passwordResetToken).toBeNull();
      expect(updateCall.data.passwordResetExpiry).toBeNull();
      await expect(bcrypt.compare('newpassword123', updateCall.data.passwordHash)).resolves.toBe(true);
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: 'bad', newPassword: 'newpassword123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordResetExpiry: new Date(Date.now() - 60_000),
      });
      await expect(
        service.resetPassword({ token: 'expired', newPassword: 'newpassword123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
