import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface GovEntry {
  name: string;
  cities: string[];
}

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────
const prisma = new PrismaClient();

const JSON_PATH = path.join(__dirname, 'egypt_level2_full.json');

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding Egypt governorates & cities...\n');

  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`JSON file not found: ${JSON_PATH}`);
  }

  const data: GovEntry[] = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

  let govCreated  = 0;
  let govSkipped  = 0;
  let cityCreated = 0;

  for (const entry of data) {
    // ── 1. Upsert Governorate ──────────────────────────────────
    const gov = await prisma.governorate.upsert({
      where:  { name: entry.name },
      update: {},
      create: { name: entry.name },
    });

    // Detect if this was a fresh insert
    const isNew =
      Math.abs(gov.createdAt.getTime() - gov.updatedAt.getTime()) < 1000;

    if (isNew) {
      govCreated++;
      console.log(`✅ Created governorate: ${gov.name}`);
    } else {
      govSkipped++;
      console.log(`⏭️  Governorate exists: ${gov.name}`);
    }

    // ── 2. Bulk-insert Cities (skipDuplicates) ─────────────────
    if (entry.cities.length === 0) continue;

    // Fetch already-existing city names for this governorate
    const existing = await prisma.city.findMany({
      where:  { governorateId: gov.id },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((c) => c.name));

    const newCities = entry.cities
      .filter((name) => !existingNames.has(name))
      .map((name)   => ({ name, governorateId: gov.id }));

    if (newCities.length > 0) {
      const result = await prisma.city.createMany({
        data:           newCities,
        skipDuplicates: true,   // guard against race conditions
      });
      cityCreated += result.count;
      console.log(`   ➕ Inserted ${result.count} new city/cities`);
    } else {
      console.log(`   ✔  All cities already exist`);
    }

    console.log('');
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log('─────────────────────────────────────────');
  console.log('✅ Seed complete!');
  console.log(`   Governorates → created: ${govCreated}  skipped: ${govSkipped}`);
  console.log(`   Cities       → created: ${cityCreated}`);
  console.log('─────────────────────────────────────────');
}

// ─────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
