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
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

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

  describe('logout', () => {
    it('should revoke token and log audit event', async () => {
      mockTokenStore.revoke.mockResolvedValue(undefined);
      await service.logout('user-1');
      expect(mockTokenStore.revoke).toHaveBeenCalledWith('user-1');
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });
});
