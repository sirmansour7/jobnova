import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenStoreService } from '../token-store/token-store.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
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
  store: jest.fn(),
  validate: jest.fn(),
  revoke: jest.fn(),
};
const mockAudit = { log: jest.fn() };
const mockEmail = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  const prevNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: TokenStoreService, useValue: mockTokenStore },
        { provide: AuditService, useValue: mockAudit },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    process.env.NODE_ENV = prevNodeEnv;
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
      });
      await expect(
        service.register({
          fullName: 'Test',
          email: 'test@test.com',
          password: 'password123',
          role: 'candidate' as any,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and send verification email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        fullName: 'Test',
        email: 'test@test.com',
        role: 'candidate',
        emailVerified: false,
      });
      const result = await service.register({
        fullName: 'Test',
        email: 'test@test.com',
        password: 'password123',
        role: 'candidate' as any,
      });
      expect(result.email).toBe('test@test.com');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verificationToken: expect.any(String),
          }),
        }),
      );
      expect(mockEmail.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@x.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if account is locked', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        lockedUntil: new Date(Date.now() + 60000),
        failedLoginAttempts: 5,
      });
      await expect(
        service.login({ email: 'x@x.com', password: 'pass' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if email not verified', async () => {
      const hash = await bcrypt.hash('password123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'x@x.com',
        passwordHash: hash,
        lockedUntil: null,
        failedLoginAttempts: 0,
        emailVerified: false,
      });
      mockPrisma.user.update.mockResolvedValue({});
      await expect(
        service.login({ email: 'x@x.com', password: 'password123' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        emailVerified: false,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const res = await service.verifyEmail('valid-token');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { verificationToken: 'valid-token' },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          emailVerified: true,
          verificationToken: null,
        },
      });
      expect(res).toEqual({ message: 'Email verified successfully' });
    });

    it('should fail for invalid or already-used token', async () => {
      // invalid token
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('bad')).rejects.toThrow(
        BadRequestException,
      );

      // already verified
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        emailVerified: true,
      });
      await expect(service.verifyEmail('token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke token and log audit event', async () => {
      mockTokenStore.revoke.mockResolvedValue(undefined);
      await service.logout('user-1');
      expect(mockTokenStore.revoke).toHaveBeenCalledWith('user-1');
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should not reveal whether email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await service.forgotPassword({ email: 'missing@test.com' });
      expect(res).toEqual({
        message: 'If this email exists, a reset link has been sent',
      });
      expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should store hashed reset token and send reset email with raw token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u@test.com',
        fullName: 'User',
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.forgotPassword({ email: 'u@test.com' });

      expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const [, , rawToken] = mockEmail.sendPasswordResetEmail.mock.calls[0];
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

  describe('resetPassword', () => {
    it('should reset password with valid token and clear token (no reuse)', async () => {
      const rawToken = 'raw-reset-token';
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.user.findUnique.mockImplementation(async (args: any) => {
        if (args?.where?.passwordResetToken === tokenHash) {
          return {
            id: 'u1',
            passwordResetExpiry: new Date(Date.now() + 60_000),
          };
        }
        return null;
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.resetPassword({ token: rawToken, newPassword: 'newpassword123' });

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 'u1' });
      expect(updateCall.data.passwordResetToken).toBeNull();
      expect(updateCall.data.passwordResetExpiry).toBeNull();
      expect(updateCall.data.refreshTokenHash).toBeNull();

      expect(typeof updateCall.data.passwordHash).toBe('string');
      await expect(bcrypt.compare('newpassword123', updateCall.data.passwordHash)).resolves.toBe(true);

      // token reuse should fail
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: rawToken, newPassword: 'newpassword123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail with invalid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: 'bad', newPassword: 'newpassword123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail with expired token', async () => {
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
