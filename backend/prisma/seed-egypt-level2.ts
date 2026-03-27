import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface CenterEntry {
  name: string;
  villages: string[];
}

interface GovernorateEntry {
  name: string;
  centers: CenterEntry[];
}

// ──────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────
const prisma = new PrismaClient();

const JSON_PATH = path.join(__dirname, 'egypt_level2_full.json');

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function loadJson(): GovernorateEntry[] {
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`JSON file not found at: ${JSON_PATH}`);
  }
  const raw = fs.readFileSync(JSON_PATH, 'utf-8');
  return JSON.parse(raw) as GovernorateEntry[];
}

// ──────────────────────────────────────────────
// Main seed logic
// ──────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting Egypt Level-2 seed...\n');

  const data = loadJson();

  let govCreated   = 0;
  let govSkipped   = 0;
  let cenCreated   = 0;
  let vilCreated   = 0;

  for (const govEntry of data) {
    // ── 1. Upsert Governorate (unique by name) ──────────────────
    const governorate = await prisma.governorate.upsert({
      where:  { name: govEntry.name },
      update: {},
      create: { name: govEntry.name },
    });

    const isNew = governorate.createdAt.getTime() === governorate.updatedAt.getTime();
    isNew ? govCreated++ : govSkipped++;

    console.log(`${isNew ? '✅' : '⏭️ '} Governorate: ${governorate.name}`);

    // ── 2. Process Centers ──────────────────────────────────────
    for (const centerEntry of govEntry.centers) {
      // Prevent duplicate Centers within the same Governorate
      let center = await prisma.center.findFirst({
        where: {
          name:          centerEntry.name,
          governorateId: governorate.id,
        },
      });

      if (!center) {
        center = await prisma.center.create({
          data: {
            name:          centerEntry.name,
            governorateId: governorate.id,
          },
        });
        cenCreated++;
        console.log(`  ➕ Center: ${center.name}`);
      } else {
        console.log(`  ⏭️  Center already exists: ${center.name}`);
      }

      // ── 3. Bulk-insert Villages (skipDuplicates) ──────────────
      if (centerEntry.villages.length > 0) {
        // Fetch existing village names for this center to calculate count delta
        const existingVillages = await prisma.village.findMany({
          where:  { centerId: center.id },
          select: { name: true },
        });
        const existingNames = new Set(existingVillages.map((v) => v.name));

        const newVillages = centerEntry.villages
          .filter((v) => !existingNames.has(v))
          .map((name) => ({ name, centerId: center!.id }));

        if (newVillages.length > 0) {
          const result = await prisma.village.createMany({
            data:           newVillages,
            skipDuplicates: true,
          });
          vilCreated += result.count;
          console.log(`     🏘️  Inserted ${result.count} village(s) into "${center.name}"`);
        }
      }
    }

    console.log(''); // blank line between governorates
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log('─────────────────────────────────────');
  console.log('✅ Seed complete!');
  console.log(`   Governorates → created: ${govCreated}, skipped: ${govSkipped}`);
  console.log(`   Centers      → created: ${cenCreated}`);
  console.log(`   Villages     → created: ${vilCreated}`);
  console.log('─────────────────────────────────────');
}

// ──────────────────────────────────────────────
// Run
// ──────────────────────────────────────────────
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
