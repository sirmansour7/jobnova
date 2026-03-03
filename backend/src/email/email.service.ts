import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.get<string>('RESEND_API_KEY'));
    this.from =
      config.get<string>('EMAIL_FROM') ?? 'JobNova <noreply@jobnova.app>';
    this.frontendUrl =
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  async sendVerificationEmail(email: string, fullName: string, token: string) {
    const verifyUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'تأكيد البريد الإلكتروني — JobNova',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #3b82f6;">مرحباً ${fullName} 👋</h2>
            <p>شكراً لتسجيلك في <strong>JobNova</strong>. اضغط على الزر أدناه لتأكيد بريدك الإلكتروني:</p>
            <a href="${verifyUrl}" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
              تأكيد البريد الإلكتروني
            </a>
            <p style="color:#64748b;font-size:13px;">الرابط صالح لمدة 24 ساعة. إذا لم تقم بالتسجيل، تجاهل هذا البريد.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="color:#94a3b8;font-size:12px;">JobNova — منصة التوظيف المصرية</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send verification email', err);
    }
  }

  async sendPasswordResetEmail(email: string, fullName: string, token: string) {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'إعادة تعيين كلمة المرور — JobNova',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #3b82f6;">إعادة تعيين كلمة المرور</h2>
            <p>مرحباً ${fullName}، تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في <strong>JobNova</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
              إعادة تعيين كلمة المرور
            </a>
            <p style="color:#64748b;font-size:13px;">الرابط صالح لمدة 30 دقيقة. إذا لم تطلب ذلك، تجاهل هذا البريد.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="color:#94a3b8;font-size:12px;">JobNova — منصة التوظيف المصرية</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send password reset email', err);
    }
  }
}
