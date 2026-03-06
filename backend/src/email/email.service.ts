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
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Verify your email – JobNova',
        html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Verify your email – JobNova</title>
  </head>
  <body style="margin:0;padding:0;background:#0B1220;font-family:Arial,system-ui,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B1220;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0F172A;border-radius:10px;border:1px solid #1E293B;box-shadow:0 12px 40px rgba(15,23,42,0.7);">
            <tr>
              <td style="padding:20px 24px 12px 24px;border-bottom:1px solid #1E293B;">
                <table role="presentation" width="100%">
                  <tr>
                    <td align="right" style="font-size:20px;font-weight:700;color:#F8FAFC;">
                      JobNova
                    </td>
                    <td align="left" style="font-size:11px;color:#93C5FD;">
                      منصة التوظيف الذكية
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.4;color:#F8FAFC;">
                  مرحباً ${fullName} 👋
                </h1>
                <p style="margin:0 0 8px 0;font-size:14px;line-height:1.7;color:#E5E7EB;">
                  شكراً لانضمامك إلى <strong>JobNova</strong>. قبل أن تبدأ في التقديم على الوظائف، نحتاج لتأكيد بريدك الإلكتروني.
                </p>
                <p style="margin:0 0 16px 0;font-size:13px;line-height:1.7;color:#9CA3AF;">
                  اضغط على الزر بالأسفل لتفعيل حسابك والبدء في استكشاف الفرص المناسبة لك.
                </p>
                <p style="margin:0 0 24px 0;" align="center">
                  <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;border-radius:999px;background:#2563EB;color:#F8FAFC;text-decoration:none;font-size:14px;font-weight:600;">
                    تأكيد البريد الإلكتروني
                  </a>
                </p>
                <p style="margin:0 0 8px 0;font-size:12px;line-height:1.7;color:#94A3B8;word-break:break-all;">
                  أو يمكنك نسخ الرابط التالي ولصقه في المتصفح:
                  <br />
                  <a href="${verifyUrl}" style="color:#60A5FA;text-decoration:underline;">
                    ${verifyUrl}
                  </a>
                </p>
                <p style="margin:12px 0 0 0;font-size:12px;line-height:1.7;color:#6B7280;">
                  إذا لم تقم بإنشاء هذا الحساب، فيمكنك تجاهل هذا البريد بأمان ولن يتم تفعيل أي شيء.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 20px 24px;border-top:1px solid #1E293B;">
                <p style="margin:0;font-size:11px;color:#6B7280;line-height:1.6;text-align:center;">
                  JobNova · منصة التوظيف الذكية<br />
                  © ${new Date().getFullYear()} JobNova. جميع الحقوق محفوظة.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send verification email', err);
    }
  }

  async sendPasswordResetEmail(email: string, fullName: string, token: string) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Reset your password – JobNova',
        html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Reset your password – JobNova</title>
  </head>
  <body style="margin:0;padding:0;background:#0B1220;font-family:Arial,system-ui,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B1220;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0F172A;border-radius:10px;border:1px solid #1E293B;box-shadow:0 12px 40px rgba(15,23,42,0.7);">
            <tr>
              <td style="padding:20px 24px 12px 24px;border-bottom:1px solid #1E293B;">
                <table role="presentation" width="100%">
                  <tr>
                    <td align="right" style="font-size:20px;font-weight:700;color:#F8FAFC;">
                      JobNova
                    </td>
                    <td align="left" style="font-size:11px;color:#93C5FD;">
                      منصة التوظيف الذكية
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.4;color:#F8FAFC;">
                  إعادة تعيين كلمة المرور
                </h1>
                <p style="margin:0 0 8px 0;font-size:14px;line-height:1.7;color:#E5E7EB;">
                  مرحباً ${fullName}، تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في <strong>JobNova</strong>.
                </p>
                <p style="margin:0 0 16px 0;font-size:13px;line-height:1.7;color:#9CA3AF;">
                  إذا كنت أنت من قام بهذا الطلب، اضغط على الزر التالي لإنشاء كلمة مرور جديدة.
                </p>
                <p style="margin:0 0 24px 0;" align="center">
                  <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;border-radius:999px;background:#EF4444;color:#F8FAFC;text-decoration:none;font-size:14px;font-weight:600;">
                    إعادة تعيين كلمة المرور
                  </a>
                </p>
                <p style="margin:0 0 8px 0;font-size:12px;line-height:1.7;color:#94A3B8;word-break:break-all;">
                  أو يمكنك نسخ الرابط التالي ولصقه في المتصفح:
                  <br />
                  <a href="${resetUrl}" style="color:#60A5FA;text-decoration:underline;">
                    ${resetUrl}
                  </a>
                </p>
                <p style="margin:8px 0 0 0;font-size:12px;line-height:1.7;color:#F97316;">
                  لأسباب أمنية، سينتهي هذا الرابط خلال 30 دقيقة ولن يكون صالحاً بعد ذلك.
                </p>
                <p style="margin:8px 0 0 0;font-size:12px;line-height:1.7;color:#6B7280;">
                  إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد بأمان.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 20px 24px;border-top:1px solid #1E293B;">
                <p style="margin:0;font-size:11px;color:#6B7280;line-height:1.6;text-align:center;">
                  JobNova · منصة التوظيف الذكية<br />
                  © ${new Date().getFullYear()} JobNova. جميع الحقوق محفوظة.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send password reset email', err);
    }
  }
}
