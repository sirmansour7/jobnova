import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle, SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';

const VP = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.ip ??
    ''
  );
}

function getUA(req: Request): string {
  return req.headers['user-agent'] ?? '';
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async register(@Body(VP) body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyEmail(@Body(VP) body: VerifyEmailDto, @Req() req: Request) {
    return this.authService.verifyEmail(body.token, getIp(req));
  }

  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body(VP) body: ResendVerificationDto) {
    return this.authService.resendVerification(body.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(VP) body: LoginDto, @Req() req: Request) {
    return this.authService.login(body, getIp(req), getUA(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refresh(@Body(VP) body: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(body.refreshToken, getIp(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  async logout(@Req() req: Request & { user: { sub: string } }) {
    return this.authService.logout(req.user.sub, getIp(req));
  }

  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body(VP) body: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(body, getIp(req));
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body(VP) body: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(body, getIp(req));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  async me(@Req() req: Request & { user: { sub: string } }) {
    return this.authService.getMe(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  async updateMe(
    @Body(VP) body: UpdateProfileDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.authService.updateProfile(req.user.sub, body);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async changePassword(
    @Body(VP) body: ChangePasswordDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.authService.changePassword(
      req.user.sub,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  async deleteAccount(@Req() req: Request & { user: { sub: string } }) {
    await this.authService.deleteAccount(req.user.sub);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @SkipThrottle()
  googleAuth() {
    // Passport redirects to Google — no body needed
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @SkipThrottle()
  async googleCallback(
    @Req() req: Request & { user: { googleId: string; email: string; fullName: string } },
    @Res() res: Response,
  ) {
    const result = await this.authService.googleLogin(req.user);
    // Store tokens server-side and redirect with a short-lived one-time code only.
    // Tokens never appear in the URL, browser history, logs, or Referer headers.
    const code = await this.authService.storeOAuthCode(result);
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/google/callback?code=${code}`);
  }

  @Post('google/exchange')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async googleExchange(@Body(VP) body: GoogleExchangeDto) {
    // Returns { accessToken, refreshToken, user } and consumes the code.
    // Any second call with the same code returns 401.
    return this.authService.exchangeOAuthCode(body.code);
  }
}
