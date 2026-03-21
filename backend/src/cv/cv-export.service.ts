import { Injectable, NotFoundException } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';

interface CvDataLike {
  fullName?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title?: string;
    company?: string;
    from?: string;
    to?: string;
    description?: string;
  }>;
  education?: Array<{
    degree?: string;
    institution?: string;
    year?: string;
  }>;
  intelligence?: {
    improvedCv?: {
      fullText?: string;
      professionalSummary?: string;
      optimizedSkills?: string[];
    };
    structuredData?: {
      yearsOfExperience?: number;
      seniority?: string;
    };
  };
}

@Injectable()
export class CvExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportCvAsPdf(
    userId: string,
    template: 'modern' | 'classic' | 'ats',
  ): Promise<Buffer> {
    const [cvRecord, userRecord] = await Promise.all([
      this.prisma.cv.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!cvRecord) {
      throw new NotFoundException('CV not found');
    }

    const cvData = (cvRecord.data ?? {}) as CvDataLike;

    // Merge user info if missing from cv.data
    const fullName =
      cvData.fullName ?? userRecord?.fullName ?? '';
    const email = cvData.email ?? userRecord?.email ?? '';
    const title = cvData.title ?? '';
    const phone = cvData.phone ?? '';
    const location = cvData.location ?? '';
    const summary =
      cvData.intelligence?.improvedCv?.professionalSummary ??
      cvData.summary ??
      '';
    const skills: string[] =
      cvData.intelligence?.improvedCv?.optimizedSkills ??
      cvData.skills ??
      [];
    const experience = cvData.experience ?? [];
    const education = cvData.education ?? [];

    let html: string;
    if (template === 'classic') {
      html = this.renderClassic({ fullName, email, title, phone, location, summary, skills, experience, education });
    } else if (template === 'ats') {
      html = this.renderAts({ fullName, email, title, phone, location, summary, skills, experience, education });
    } else {
      html = this.renderModern({ fullName, email, title, phone, location, summary, skills, experience, education });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private renderModern(data: {
    fullName: string;
    email: string;
    title: string;
    phone: string;
    location: string;
    summary: string;
    skills: string[];
    experience: CvDataLike['experience'];
    education: CvDataLike['education'];
  }): string {
    const { fullName, email, title, phone, location, summary, skills, experience, education } = data;

    const skillsHtml = skills
      .map(
        s =>
          `<span style="display:inline-block;background:#2563EB;color:#fff;border-radius:12px;padding:3px 10px;font-size:11px;margin:3px 3px 3px 0;">${this.escapeHtml(s)}</span>`,
      )
      .join('');

    const expHtml = (experience ?? [])
      .map(
        e => `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <strong style="font-size:13px;color:#0F172A;">${this.escapeHtml(e.title ?? '')}</strong>
            <span style="font-size:11px;color:#64748B;">${this.escapeHtml(e.from ?? '')}${e.to ? ' — ' + this.escapeHtml(e.to) : ''}</span>
          </div>
          <div style="font-size:12px;color:#2563EB;margin-bottom:4px;">${this.escapeHtml(e.company ?? '')}</div>
          ${e.description ? `<div style="font-size:12px;color:#475569;">${this.escapeHtml(e.description)}</div>` : ''}
        </div>`,
      )
      .join('');

    const eduHtml = (education ?? [])
      .map(
        e => `
        <div style="margin-bottom:10px;">
          <strong style="font-size:13px;color:#0F172A;">${this.escapeHtml(e.degree ?? '')}</strong>
          <div style="font-size:12px;color:#2563EB;">${this.escapeHtml(e.institution ?? '')}</div>
          ${e.year ? `<div style="font-size:11px;color:#64748B;">${this.escapeHtml(e.year)}</div>` : ''}
        </div>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', 'Tahoma', sans-serif; background: #fff; color: #1E293B; font-size: 13px; line-height: 1.6; }
    .header { background: #0F172A; color: #fff; padding: 24px 28px; border-radius: 4px 4px 0 0; }
    .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .header .subtitle { font-size: 13px; color: #93C5FD; margin-bottom: 10px; }
    .contact-row { display: flex; gap: 16px; flex-wrap: wrap; font-size: 11px; color: #CBD5E1; }
    .body { padding: 20px 28px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 13px; font-weight: 700; color: #2563EB; border-bottom: 2px solid #2563EB; padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-text { font-size: 12px; color: #475569; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${this.escapeHtml(fullName)}</h1>
    ${title ? `<div class="subtitle">${this.escapeHtml(title)}</div>` : ''}
    <div class="contact-row">
      ${email ? `<span>${this.escapeHtml(email)}</span>` : ''}
      ${phone ? `<span>${this.escapeHtml(phone)}</span>` : ''}
      ${location ? `<span>${this.escapeHtml(location)}</span>` : ''}
    </div>
  </div>
  <div class="body">
    ${summary ? `<div class="section"><div class="section-title">الملخص المهني</div><p class="summary-text">${this.escapeHtml(summary)}</p></div>` : ''}
    ${skills.length > 0 ? `<div class="section"><div class="section-title">المهارات</div><div>${skillsHtml}</div></div>` : ''}
    ${(experience ?? []).length > 0 ? `<div class="section"><div class="section-title">الخبرة العملية</div>${expHtml}</div>` : ''}
    ${(education ?? []).length > 0 ? `<div class="section"><div class="section-title">التعليم</div>${eduHtml}</div>` : ''}
  </div>
</body>
</html>`;
  }

  private renderClassic(data: {
    fullName: string;
    email: string;
    title: string;
    phone: string;
    location: string;
    summary: string;
    skills: string[];
    experience: CvDataLike['experience'];
    education: CvDataLike['education'];
  }): string {
    const { fullName, email, title, phone, location, summary, skills, experience, education } = data;

    const skillsHtml = skills
      .map(s => `<span style="display:inline-block;border:1px solid #9CA3AF;border-radius:3px;padding:2px 8px;font-size:11px;margin:2px 3px 2px 0;color:#374151;">${this.escapeHtml(s)}</span>`)
      .join('');

    const expHtml = (experience ?? [])
      .map(
        e => `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <strong style="font-size:13px;">${this.escapeHtml(e.title ?? '')}</strong>
            <span style="font-size:11px;color:#6B7280;">${this.escapeHtml(e.from ?? '')}${e.to ? ' — ' + this.escapeHtml(e.to) : ''}</span>
          </div>
          <div style="font-size:12px;color:#4B5563;font-style:italic;margin-bottom:4px;">${this.escapeHtml(e.company ?? '')}</div>
          ${e.description ? `<div style="font-size:12px;color:#374151;">${this.escapeHtml(e.description)}</div>` : ''}
        </div>`,
      )
      .join('');

    const eduHtml = (education ?? [])
      .map(
        e => `
        <div style="margin-bottom:10px;">
          <strong style="font-size:13px;">${this.escapeHtml(e.degree ?? '')}</strong>
          <div style="font-size:12px;color:#4B5563;font-style:italic;">${this.escapeHtml(e.institution ?? '')}</div>
          ${e.year ? `<div style="font-size:11px;color:#6B7280;">${this.escapeHtml(e.year)}</div>` : ''}
        </div>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', 'Tahoma', sans-serif; background: #fff; color: #111827; font-size: 13px; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
    .header h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .header .subtitle { font-size: 13px; color: #374151; margin-bottom: 8px; }
    .contact-row { font-size: 11px; color: #6B7280; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #D1D5DB; padding-bottom: 4px; margin-bottom: 12px; color: #111827; }
    .summary-text { font-size: 12px; color: #374151; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${this.escapeHtml(fullName)}</h1>
    ${title ? `<div class="subtitle">${this.escapeHtml(title)}</div>` : ''}
    <div class="contact-row">${[email, phone, location].filter(Boolean).map(v => this.escapeHtml(v)).join(' &nbsp;|&nbsp; ')}</div>
  </div>
  ${summary ? `<div class="section"><div class="section-title">الملخص المهني</div><p class="summary-text">${this.escapeHtml(summary)}</p></div>` : ''}
  ${skills.length > 0 ? `<div class="section"><div class="section-title">المهارات</div><div>${skillsHtml}</div></div>` : ''}
  ${(experience ?? []).length > 0 ? `<div class="section"><div class="section-title">الخبرة العملية</div>${expHtml}</div>` : ''}
  ${(education ?? []).length > 0 ? `<div class="section"><div class="section-title">التعليم</div>${eduHtml}</div>` : ''}
</body>
</html>`;
  }

  private renderAts(data: {
    fullName: string;
    email: string;
    title: string;
    phone: string;
    location: string;
    summary: string;
    skills: string[];
    experience: CvDataLike['experience'];
    education: CvDataLike['education'];
  }): string {
    const { fullName, email, title, phone, location, summary, skills, experience, education } = data;

    const skillsText = skills.join(' | ');

    const expHtml = (experience ?? [])
      .map(
        e => `
        <div style="margin-bottom:12px;">
          <strong style="font-size:12px;">${this.escapeHtml(e.title ?? '')}</strong> — ${this.escapeHtml(e.company ?? '')}
          <span style="float:left;font-size:11px;">${this.escapeHtml(e.from ?? '')}${e.to ? ' - ' + this.escapeHtml(e.to) : ''}</span>
          <div style="clear:both;"></div>
          ${e.description ? `<div style="font-size:12px;margin-top:2px;">${this.escapeHtml(e.description)}</div>` : ''}
        </div>`,
      )
      .join('');

    const eduHtml = (education ?? [])
      .map(
        e => `
        <div style="margin-bottom:8px;">
          <strong style="font-size:12px;">${this.escapeHtml(e.degree ?? '')}</strong> — ${this.escapeHtml(e.institution ?? '')}
          ${e.year ? ` (${this.escapeHtml(e.year)})` : ''}
        </div>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', 'Tahoma', sans-serif; background: #fff; color: #000; font-size: 12px; line-height: 1.5; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
    .contact { font-size: 11px; margin-bottom: 12px; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>${this.escapeHtml(fullName)}</h1>
  ${title ? `<div style="font-size:12px;margin-bottom:4px;">${this.escapeHtml(title)}</div>` : ''}
  <div class="contact">${[email, phone, location].filter(Boolean).map(v => this.escapeHtml(v)).join(' | ')}</div>
  ${summary ? `<div class="section"><div class="section-title">الملخص</div><p style="font-size:12px;">${this.escapeHtml(summary)}</p></div>` : ''}
  ${skills.length > 0 ? `<div class="section"><div class="section-title">المهارات</div><p style="font-size:12px;">${this.escapeHtml(skillsText)}</p></div>` : ''}
  ${(experience ?? []).length > 0 ? `<div class="section"><div class="section-title">الخبرة العملية</div>${expHtml}</div>` : ''}
  ${(education ?? []).length > 0 ? `<div class="section"><div class="section-title">التعليم</div>${eduHtml}</div>` : ''}
</body>
</html>`;
  }
}
