import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GOVERNORATES: { name: string; cities: string[] }[] = [
  { name: 'القاهرة', cities: ['مدينة نصر', 'المعادي', 'مصر الجديدة', 'التجمع الخامس', 'الدقي', 'المهندسين', 'وسط البلد', 'شبرا'] },
  { name: 'الجيزة', cities: ['الشيخ زايد', 'السادس من أكتوبر', 'الهرم', 'فيصل', 'العجوزة', 'الدقي'] },
  { name: 'الإسكندرية', cities: ['سموحة', 'جليم', 'سيدي بشر', 'المنتزه', 'العصافرة', 'ميامي'] },
  { name: 'الدقهلية', cities: ['المنصورة', 'طلخا', 'ميت غمر'] },
  { name: 'الشرقية', cities: ['الزقازيق', 'العاشر من رمضان', 'بلبيس'] },
  { name: 'القليوبية', cities: ['بنها', 'شبرا الخيمة', 'القناطر الخيرية'] },
  { name: 'الغربية', cities: ['طنطا', 'المحلة الكبرى', 'كفر الزيات'] },
  { name: 'المنوفية', cities: ['شبين الكوم', 'منوف', 'السادات'] },
  { name: 'البحيرة', cities: ['دمنهور', 'كفر الدوار', 'رشيد'] },
  { name: 'الإسماعيلية', cities: ['الإسماعيلية', 'القنطرة شرق', 'فايد'] },
  { name: 'السويس', cities: ['السويس', 'عتاقة'] },
  { name: 'بورسعيد', cities: ['بورسعيد', 'بورفؤاد'] },
  { name: 'كفر الشيخ', cities: ['كفر الشيخ', 'دسوق', 'فوه'] },
  { name: 'دمياط', cities: ['دمياط', 'رأس البر', 'الزرقا'] },
  { name: 'الفيوم', cities: ['الفيوم', 'إطسا', 'طامية'] },
  { name: 'بني سويف', cities: ['بني سويف', 'الواسطى', 'ناصر'] },
  { name: 'المنيا', cities: ['المنيا', 'ملوي', 'سمالوط'] },
  { name: 'أسيوط', cities: ['أسيوط', 'ديروط', 'منفلوط'] },
  { name: 'سوهاج', cities: ['سوهاج', 'أخميم', 'جرجا'] },
  { name: 'قنا', cities: ['قنا', 'نجع حمادي', 'قوص'] },
  { name: 'الأقصر', cities: ['الأقصر', 'الطود', 'إسنا'] },
  { name: 'أسوان', cities: ['أسوان', 'كوم أمبو', 'إدفو'] },
  { name: 'البحر الأحمر', cities: ['الغردقة', 'سفاجا', 'مرسى علم'] },
  { name: 'الوادي الجديد', cities: ['الخارجة', 'الداخلة', 'الفرافرة'] },
  { name: 'مطروح', cities: ['مرسى مطروح', 'سيوة', 'الحمام'] },
  { name: 'شمال سيناء', cities: ['العريش', 'رفح', 'الشيخ زويد'] },
  { name: 'جنوب سيناء', cities: ['شرم الشيخ', 'دهب', 'طابا'] },
  { name: 'القاهرة الجديدة', cities: ['التجمع الأول', 'التجمع الثالث', 'التجمع الخامس', 'الرحاب', 'مدينتي'] },
  { name: 'العاصمة الإدارية الجديدة', cities: ['الحي السكني الأول', 'الحي السكني الثاني', 'حي المال والأعمال'] },
];

async function main() {
  console.log('Seeding governorates and cities...');
  let created = 0;
  let skipped = 0;

  for (const gov of GOVERNORATES) {
    const existing = await prisma.governorate.findUnique({ where: { name: gov.name } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.governorate.create({
      data: {
        name: gov.name,
        cities: {
          create: gov.cities.map((cityName) => ({ name: cityName })),
        },
      },
    });
    created++;
    console.log(`Created: ${gov.name} (${gov.cities.length} cities)`);
  }

  console.log(`Done. Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

