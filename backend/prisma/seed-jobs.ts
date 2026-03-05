import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Create default org
  let org = await prisma.organization.findUnique({ where: { slug: 'jobnova-partners' } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'JobNova Partners', slug: 'jobnova-partners' },
    });
    console.log('Created org:', org.name);
  }

  // Create default admin user
  let admin = await prisma.user.findUnique({ where: { email: 'admin@jobnova.app' } });
  if (!admin) {
    const passwordHash = await bcrypt.hash('Admin@123456', 12);
    admin = await prisma.user.create({
      data: {
        fullName: 'Admin JobNova',
        email: 'admin@jobnova.app',
        passwordHash,
        role: 'admin',
        emailVerified: true,
      },
    });
    // Add admin as OWNER of org
    await prisma.membership.create({
      data: { userId: admin.id, organizationId: org.id, roleInOrg: 'OWNER' },
    });
    console.log('Created admin:', admin.email);
  }

  // Read JSON file - try multiple locations
  const possiblePaths = [
    path.join(__dirname, '../data/partners_arabic_tags.json'),
    path.join(__dirname, '../../partners_arabic_tags.json'),
    path.join(__dirname, '../partners_arabic_tags.json'),
    'C:/Users/Omar Mansour/Downloads/partners_arabic_tags.json',
    'F:/jobnova/partners_arabic_tags.json',
  ];

  let data: any[] = [];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('Found data file at:', p);
      data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      break;
    }
  }

  if (data.length === 0) {
    console.log('No data file found. Checked paths:', possiblePaths);
    return;
  }

  console.log(`Importing ${data.length} jobs...`);

  let inserted = 0;
  for (const item of data) {
    await prisma.job.create({
      data: {
        organizationId: org.id,
        title: item.jobTitle ?? item.title ?? item.job_title ?? item.وظيفة ?? 'وظيفة',
        partnerName: item.companyName ?? item.partnerName ?? item.partner_name ?? item.شركة ?? org.name,
        description: item.description ?? item.وصف ?? null,
        governorate: item.governorate ?? item.محافظة ?? null,
        city: item.city ?? item.مدينة ?? null,
        category: item.category ?? item.تخصص ?? item.القطاع ?? null,
        isActive: true,
      },
    });
    inserted++;
  }

  console.log(`✅ Successfully inserted ${inserted} jobs`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
