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

    const fromAddress =
      config.get<string>('EMAIL_FROM') ?? 'JobNova <onboarding@resend.dev>';

    this.from = fromAddress;
    this.frontendUrl =
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    this.logger.log(`Email sender configured: ${fromAddress}`);
  }

  /**
   * Escapes a string for safe interpolation into an HTML context.
   * Must be applied to every user-supplied value before embedding in templates.
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async sendVerificationEmail(
    email: string,
    fullName: string,
    token: string,
  ): Promise<boolean> {
    this.logger.log(
      `Sending verification email: to=${email} from=${this.from} type=verification`,
    );

    // token is randomBytes(32).hex() — [0-9a-f] only, no escaping needed.
    // frontendUrl comes from validated env. Escape both for defense-in-depth.
    const safeFullName = this.escapeHtml(fullName);
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    const safeVerifyUrl = this.escapeHtml(verifyUrl);

    try {
      const result = await this.resend.emails.send({
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
                  مرحباً ${safeFullName} 👋
                </h1>
                <p style="margin:0 0 8px 0;font-size:14px;line-height:1.7;color:#E5E7EB;">
                  شكراً لانضمامك إلى <strong>JobNova</strong>. قبل أن تبدأ في التقديم على الوظائف، نحتاج لتأكيد بريدك الإلكتروني.
                </p>
                <p style="margin:0 0 16px 0;font-size:13px;line-height:1.7;color:#9CA3AF;">
                  اضغط على الزر بالأسفل لتفعيل حسابك والبدء في استكشاف الفرص المناسبة لك.
                </p>
                <p style="margin:0 0 24px 0;" align="center">
                  <a href="${safeVerifyUrl}" style="display:inline-block;padding:12px 28px;border-radius:999px;background:#2563EB;color:#F8FAFC;text-decoration:none;font-size:14px;font-weight:600;">
                    تأكيد البريد الإلكتروني
                  </a>
                </p>
                <p style="margin:0 0 8px 0;font-size:12px;line-height:1.7;color:#94A3B8;word-break:break-all;">
                  أو يمكنك نسخ الرابط التالي ولصقه في المتصفح:
                  <br />
                  <a href="${safeVerifyUrl}" style="color:#60A5FA;text-decoration:underline;">
                    ${safeVerifyUrl}
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

      const id = result?.data?.id;

      if (!id) {
        this.logger.error(
          `Verification email send returned no id: to=${email} response=${JSON.stringify(result)}`,
        );
        return false;
      }

      this.logger.log(`Verification email sent: to=${email} resendId=${id}`);
      return true;
    } catch (err) {
      const e = err as {
        name?: string;
        message?: string;
        statusCode?: number;
        type?: string;
        error?: unknown;
        response?: { data?: unknown };
      };

      const details: Record<string, unknown> = {
        name: e?.name,
        message: e?.message,
        statusCode: e?.statusCode,
        type: e?.type,
        resendError: e?.error,
      };

      if (e?.response?.data != null) {
        details.responseBody = e.response.data;
      }

      this.logger.error(
        `Failed to send verification email: to=${email} error=${e?.name ?? 'Error'}: ${e?.message ?? String(err)}`,
        JSON.stringify(details),
      );

      return false;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    fullName: string,
    token: string,
  ): Promise<boolean> {
    this.logger.log(
      `Sending password reset email: to=${email} from=${this.from} type=reset`,
    );

    const safeFullName = this.escapeHtml(fullName);
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    const safeResetUrl = this.escapeHtml(resetUrl);

    try {
      const result = await this.resend.emails.send({
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
                  مرحباً ${safeFullName}، تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في <strong>JobNova</strong>.
                </p>
                <p style="margin:0 0 16px 0;font-size:13px;line-height:1.7;color:#9CA3AF;">
                  إذا كنت أنت من قام بهذا الطلب، اضغط على الزر التالي لإنشاء كلمة مرور جديدة.
                </p>
                <p style="margin:0 0 24px 0;" align="center">
                  <a href="${safeResetUrl}" style="display:inline-block;padding:12px 28px;border-radius:999px;background:#EF4444;color:#F8FAFC;text-decoration:none;font-size:14px;font-weight:600;">
                    إعادة تعيين كلمة المرور
                  </a>
                </p>
                <p style="margin:0 0 8px 0;font-size:12px;line-height:1.7;color:#94A3B8;word-break:break-all;">
                  أو يمكنك نسخ الرابط التالي ولصقه في المتصفح:
                  <br />
                  <a href="${safeResetUrl}" style="color:#60A5FA;text-decoration:underline;">
                    ${safeResetUrl}
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

      const id = result?.data?.id;

      if (!id) {
        this.logger.error(
          `Password reset email send returned no id: to=${email} response=${JSON.stringify(result)}`,
        );
        return false;
      }

      this.logger.log(`Password reset email sent: to=${email} resendId=${id}`);
      return true;
    } catch (err) {
      const e = err as {
        name?: string;
        message?: string;
        statusCode?: number;
        type?: string;
        error?: unknown;
        response?: { data?: unknown };
      };

      const details: Record<string, unknown> = {
        name: e?.name,
        message: e?.message,
        statusCode: e?.statusCode,
        type: e?.type,
        resendError: e?.error,
      };

      if (e?.response?.data != null) {
        details.responseBody = e.response.data;
      }

      this.logger.error(
        `Failed to send password reset email: to=${email} error=${e?.name ?? 'Error'}: ${e?.message ?? String(err)}`,
        JSON.stringify(details),
      );

      return false;
    }
  }

  async sendApplicationStatusEmail(
    to: string,
    name: string,
    jobTitle: string,
    statusLabel: string,
  ): Promise<boolean> {
    this.logger.log(
      `Sending application status email: to=${to} from=${this.from} jobTitle=${jobTitle} status=${statusLabel}`,
    );

    // Escape all user-supplied values before any HTML interpolation.
    // jobTitle is also used in the plain-text `subject` header — no escaping needed there.
    const safeName = this.escapeHtml(name);
    const safeJobTitle = this.escapeHtml(jobTitle);
    const safeStatusLabel = this.escapeHtml(statusLabel);

    const subject = `تحديث حالة طلبك - ${jobTitle}`;
    const safeSubject = this.escapeHtml(subject);
    const safeBody = `مرحباً ${safeName}، تم تحديث حالة طلبك لوظيفة &ldquo;${safeJobTitle}&rdquo; إلى: ${safeStatusLabel}`;

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;padding:0;background:#0B1220;font-family:Arial,system-ui,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B1220;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0F172A;border-radius:10px;border:1px solid #1E293B;">
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 16px 0;font-size:20px;color:#F8FAFC;">تحديث حالة طلبك</h1>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#E5E7EB;">${safeBody}</p>
                <p style="margin:16px 0 0 0;font-size:12px;color:#94A3B8;">JobNova · منصة التوظيف الذكية</p>
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

      const id = result?.data?.id;

      if (!id) {
        this.logger.error(
          `Application status email send returned no id: to=${to} response=${JSON.stringify(result)}`,
        );
        return false;
      }

      this.logger.log(
        `Application status email sent: to=${to} resendId=${id}`,
      );
      return true;
    } catch (err) {
      const e = err as {
        name?: string;
        message?: string;
        statusCode?: number;
        type?: string;
        error?: unknown;
        response?: { data?: unknown };
      };

      const details: Record<string, unknown> = {
        name: e?.name,
        message: e?.message,
        statusCode: e?.statusCode,
        type: e?.type,
        resendError: e?.error,
      };

      if (e?.response?.data != null) {
        details.responseBody = e.response.data;
      }

      this.logger.error(
        `Failed to send application status email: to=${to} error=${e?.name ?? 'Error'}: ${e?.message ?? String(err)}`,
        JSON.stringify(details),
      );

      return false;
    }
  }

  async sendInterviewReminderEmail(
    to: string,
    fullName: string,
    jobTitle: string,
    scheduledAt: Date,
    role: 'candidate' | 'hr',
  ): Promise<boolean> {
    this.logger.log(
      `Sending interview reminder email: to=${to} role=${role} jobTitle=${jobTitle}`,
    );

    const safeName = this.escapeHtml(fullName);
    const safeJobTitle = this.escapeHtml(jobTitle);
    const formattedDate = this.escapeHtml(
      scheduledAt.toLocaleString('ar-EG', {
        dateStyle: 'full',
        timeStyle: 'short',
      }),
    );

    const subject =
      role === 'candidate'
        ? `تذكير: مقابلتك غداً - ${jobTitle}`
        : `تذكير: مقابلة مجدولة غداً - ${jobTitle}`;
    const safeSubject = this.escapeHtml(subject);

    const heading =
      role === 'candidate' ? 'تذكير بموعد مقابلتك' : 'تذكير: مقابلة مجدولة';
    const bodyText =
      role === 'candidate'
        ? `مرحباً ${safeName}، هذا تذكير بأن لديك مقابلة عمل لوظيفة &ldquo;${safeJobTitle}&rdquo; مجدولة في: ${formattedDate}. نتمنى لك حظاً موفقاً!`
        : `مرحباً ${safeName}، تذكير بأن هناك مقابلة مجدولة لوظيفة &ldquo;${safeJobTitle}&rdquo; في: ${formattedDate}. يرجى الاستعداد للمقابلة.`;

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${safeSubject}</title>
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
                    <td align="right" style="font-size:20px;font-weight:700;color:#F8FAFC;">JobNova</td>
                    <td align="left" style="font-size:11px;color:#93C5FD;">منصة التوظيف الذكية</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.4;color:#F8FAFC;">${heading}</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#E5E7EB;">${bodyText}</p>
                <p style="margin:0;font-size:12px;color:#94A3B8;">JobNova · منصة التوظيف الذكية</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px 20px 24px;border-top:1px solid #1E293B;">
                <p style="margin:0;font-size:11px;color:#6B7280;text-align:center;">© ${new Date().getFullYear()} JobNova. جميع الحقوق محفوظة.</p>
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

      const id = result?.data?.id;
      if (!id) {
        this.logger.error(
          `Interview reminder email returned no id: to=${to} response=${JSON.stringify(result)}`,
        );
        return false;
      }
      this.logger.log(`Interview reminder email sent: to=${to} resendId=${id}`);
      return true;
    } catch (err) {
      const e = err as { name?: string; message?: string };
      this.logger.error(
        `Failed to send interview reminder email: to=${to} error=${e?.name ?? 'Error'}: ${e?.message ?? String(err)}`,
      );
      return false;
    }
  }

  async sendPendingApplicationsEmail(
    to: string,
    fullName: string,
    pendingCount: number,
    jobTitle: string,
  ): Promise<boolean> {
    this.logger.log(
      `Sending pending applications email: to=${to} count=${pendingCount} job=${jobTitle}`,
    );

    const safeName = this.escapeHtml(fullName);
    const safeJobTitle = this.escapeHtml(jobTitle);
    const subject = `تذكير: طلبات معلقة تحتاج مراجعتك - ${jobTitle}`;
    const safeSubject = this.escapeHtml(subject);

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${safeSubject}</title>
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
                    <td align="right" style="font-size:20px;font-weight:700;color:#F8FAFC;">JobNova</td>
                    <td align="left" style="font-size:11px;color:#93C5FD;">منصة التوظيف الذكية</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.4;color:#F8FAFC;">طلبات توظيف معلقة</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#E5E7EB;">
                  مرحباً ${safeName}، يوجد <strong style="color:#F8FAFC;">${pendingCount}</strong> طلب توظيف معلق لوظيفة &ldquo;${safeJobTitle}&rdquo; منذ أكثر من 7 أيام ويحتاج إلى مراجعتك.
                </p>
                <p style="margin:0;font-size:12px;color:#94A3B8;">يرجى مراجعة لوحة التحكم لاتخاذ القرار المناسب.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px 20px 24px;border-top:1px solid #1E293B;">
                <p style="margin:0;font-size:11px;color:#6B7280;text-align:center;">© ${new Date().getFullYear()} JobNova. جميع الحقوق محفوظة.</p>
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

      const id = result?.data?.id;
      if (!id) {
        this.logger.error(
          `Pending applications email returned no id: to=${to} response=${JSON.stringify(result)}`,
        );
        return false;
      }
      this.logger.log(
        `Pending applications email sent: to=${to} resendId=${id}`,
      );
      return true;
    } catch (err) {
      const e = err as { name?: string; message?: string };
      this.logger.error(
        `Failed to send pending applications email: to=${to} error=${e?.name ?? 'Error'}: ${e?.message ?? String(err)}`,
      );
      return false;
    }
  }

  async sendJobExpiryEmail(
    to: string,
    fullName: string,
    jobTitle: string,
    expiresAt: Date,
  ): Promise<boolean> {
    this.logger.log(
      `Sending job expiry email: to=${to} jobTitle=${jobTitle} expiresAt=${expiresAt.toISOString()}`,
    );

    const safeName = this.escapeHtml(fullName);
    const safeJobTitle = this.escapeHtml(jobTitle);
    const formattedExpiry = this.escapeHtml(
      expiresAt.toLocaleString('ar-EG', { dateStyle: 'full' }),
    );
    const subject = `تنبيه: وظيفة ستنتهي قريباً - ${jobTitle}`;
    const safeSubject = this.escapeHtml(subject);

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${safeSubject}</title>
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
                    <td align="right" style="font-size:20px;font-weight:700;color:#F8FAFC;">JobNova</td>
                    <td align="left" style="font-size:11px;color:#93C5FD;">منصة التوظيف الذكية</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.4;color:#F8FAFC;">تنبيه انتهاء صلاحية وظيفة</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#E5E7EB;">
                  مرحباً ${safeName}، وظيفة &ldquo;${safeJobTitle}&rdquo; ستنتهي صلاحيتها في <strong style="color:#F97316;">${formattedExpiry}</strong>. يرجى تجديد الإعلان أو إيقاف القبول إذا كانت الوظيفة قد اكتملت.
                </p>
                <p style="margin:0;font-size:12px;color:#94A3B8;">يرجى اتخاذ الإجراء المناسب من لوحة التحكم.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px 20px 24px;border-top:1px solid #1E293B;">
                <p style="margin:0;font-size:11px;color:#6B7280;text-align:center;">© ${new Date().getFullYear()} JobNova. جميع الحقوق محفوظة.</p>
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

      const id = result?.data?.id;
      if (!id) {
        this.logger.error(
          `Job expiry email returned no id: to=${to} response=${JSON.stringify(result)}`,
        );
        return false;
      }
      this.logger.log(`Job expiry email sent: to=${to} resendId=${id}`);
      return true;
    } catch (err) {
      const e = err as { name?: string; message?: string };
      this.logger.error(
        `Failed to send job expiry email: to=${to} error=${e?.name ?? 'Error'}: ${e?.message ?? String(err)}`,
      );
      return false;
    }
  }
}
