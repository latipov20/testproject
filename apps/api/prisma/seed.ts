// Boshlang'ich ma'lumotlar: kategoriyalar, hayvon turlari, hududlar, xodimlar va namuna mahsulotlar.
// Mahsulotlar va yetkazish narxlari NAMUNA — haqiqiy ro'yxat bilan almashtiriladi.
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password';

const prisma = new PrismaClient();

const categories = [
  { slug: 'vitaminlar', nameUz: 'Vitamin va mineral qo‘shimchalar', nameRu: 'Витамины и минеральные добавки' },
  { slug: 'parazitlarga-qarshi', nameUz: 'Parazitlarga qarshi vositalar', nameRu: 'Противопаразитарные средства' },
  { slug: 'gigiyena', nameUz: 'Gigiyena va parvarish', nameRu: 'Гигиена и уход' },
  { slug: 'ozuqa-qoshimchalari', nameUz: 'Ozuqa qo‘shimchalari', nameRu: 'Кормовые добавки' },
  { slug: 'jihozlar', nameUz: 'Veterinariya jihozlari', nameRu: 'Ветеринарный инвентарь' },
];

const animals = [
  { slug: 'qoramol', nameUz: 'Qoramol', nameRu: 'КРС' },
  { slug: 'qoy-echki', nameUz: 'Qo‘y va echki', nameRu: 'Овцы и козы' },
  { slug: 'parranda', nameUz: 'Parranda', nameRu: 'Птица' },
  { slug: 'ot', nameUz: 'Ot', nameRu: 'Лошади' },
  { slug: 'it', nameUz: 'It', nameRu: 'Собаки' },
  { slug: 'mushuk', nameUz: 'Mushuk', nameRu: 'Кошки' },
];

// [uz, ru, narx so'm, kun min, kun max]
const zones: [string, string, number, number, number][] = [
  ['Toshkent shahri', 'г. Ташкент', 20000, 0, 1],
  ['Toshkent viloyati', 'Ташкентская область', 30000, 1, 2],
  ['Andijon viloyati', 'Андижанская область', 40000, 2, 3],
  ['Farg‘ona viloyati', 'Ферганская область', 40000, 2, 3],
  ['Namangan viloyati', 'Наманганская область', 40000, 2, 3],
  ['Sirdaryo viloyati', 'Сырдарьинская область', 35000, 1, 2],
  ['Jizzax viloyati', 'Джизакская область', 35000, 1, 3],
  ['Samarqand viloyati', 'Самаркандская область', 40000, 2, 3],
  ['Qashqadaryo viloyati', 'Кашкадарьинская область', 45000, 2, 4],
  ['Surxondaryo viloyati', 'Сурхандарьинская область', 50000, 3, 4],
  ['Buxoro viloyati', 'Бухарская область', 45000, 2, 4],
  ['Navoiy viloyati', 'Навоийская область', 45000, 2, 4],
  ['Xorazm viloyati', 'Хорезмская область', 55000, 3, 5],
  ['Qoraqalpog‘iston Respublikasi', 'Республика Каракалпакстан', 60000, 3, 5],
];

interface SeedProduct {
  slug: string;
  category: string;
  animals: string[];
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  dosageUz: string;
  dosageRu: string;
  storageTemp: string;
  variants: { sku: string; packSize: string; price: number; oldPrice?: number }[];
}

const products: SeedProduct[] = [
  {
    slug: 'multivitamin-kompleksi',
    category: 'vitaminlar',
    animals: ['qoramol', 'qoy-echki', 'ot'],
    titleUz: 'Multivitamin kompleksi (namuna)',
    titleRu: 'Мультивитаминный комплекс (образец)',
    descriptionUz: 'Vitamin yetishmasligining oldini olish uchun suyuq qo‘shimcha.',
    descriptionRu: 'Жидкая добавка для профилактики витаминной недостаточности.',
    dosageUz: 'Qo‘llanmaga muvofiq, ichimlik suviga qo‘shib beriladi.',
    dosageRu: 'Согласно инструкции, добавляется в питьевую воду.',
    storageTemp: '+5…+25 °C',
    variants: [
      { sku: 'MVK-100', packSize: '100 ml', price: 45000 },
      { sku: 'MVK-500', packSize: '500 ml', price: 180000, oldPrice: 200000 },
    ],
  },
  {
    slug: 'parranda-vitamin-kukuni',
    category: 'vitaminlar',
    animals: ['parranda'],
    titleUz: 'Parranda uchun vitamin kukuni (namuna)',
    titleRu: 'Витаминный порошок для птицы (образец)',
    descriptionUz: 'Tovuq va boshqa parrandalar uchun suvda eriydigan kukun.',
    descriptionRu: 'Водорастворимый порошок для кур и другой птицы.',
    dosageUz: 'Qo‘llanmaga muvofiq.',
    dosageRu: 'Согласно инструкции.',
    storageTemp: 'Quruq joyda, +25 °C gacha',
    variants: [{ sku: 'PVK-200', packSize: '200 g', price: 32000 }],
  },
  {
    slug: 'burga-kanaga-qarshi-tomchi',
    category: 'parazitlarga-qarshi',
    animals: ['it', 'mushuk'],
    titleUz: 'Burga va kanaga qarshi tomchi (namuna)',
    titleRu: 'Капли от блох и клещей (образец)',
    descriptionUz: 'Yelkaga tomiziladigan tashqi vosita.',
    descriptionRu: 'Наружное средство для нанесения на холку.',
    dosageUz: 'Hayvon vazniga qarab, qo‘llanmaga muvofiq.',
    dosageRu: 'В зависимости от веса животного, согласно инструкции.',
    storageTemp: '+5…+25 °C',
    variants: [
      { sku: 'BKT-S', packSize: '4 kg gacha', price: 38000 },
      { sku: 'BKT-L', packSize: '10–20 kg', price: 52000 },
    ],
  },
  {
    slug: 'it-mushuk-shampuni',
    category: 'gigiyena',
    animals: ['it', 'mushuk'],
    titleUz: 'It va mushuk uchun shampun (namuna)',
    titleRu: 'Шампунь для собак и кошек (образец)',
    descriptionUz: 'Yumshoq tarkibli parvarish shampuni.',
    descriptionRu: 'Мягкий ухаживающий шампунь.',
    dosageUz: 'Ho‘l junga surting, 3–5 daqiqadan keyin yuving.',
    dosageRu: 'Нанести на влажную шерсть, смыть через 3–5 минут.',
    storageTemp: '+5…+30 °C',
    variants: [{ sku: 'SHM-250', packSize: '250 ml', price: 28000 }],
  },
  {
    slug: 'tuyoq-malhami',
    category: 'gigiyena',
    animals: ['qoramol', 'qoy-echki', 'ot'],
    titleUz: 'Tuyoq parvarishi uchun malham (namuna)',
    titleRu: 'Мазь для ухода за копытами (образец)',
    descriptionUz: 'Tuyoqni yorilishdan himoya qiladi.',
    descriptionRu: 'Защищает копыта от растрескивания.',
    dosageUz: 'Toza tuyoqqa yupqa qatlam surtiladi.',
    dosageRu: 'Наносить тонким слоем на чистое копыто.',
    storageTemp: '+5…+25 °C',
    variants: [{ sku: 'TYM-400', packSize: '400 g', price: 65000 }],
  },
  {
    slug: 'mineral-blok',
    category: 'ozuqa-qoshimchalari',
    animals: ['qoramol', 'qoy-echki'],
    titleUz: 'Mineral yalama blok (namuna)',
    titleRu: 'Минеральный лизунец (образец)',
    descriptionUz: 'Tuz va mikroelementlar manbai.',
    descriptionRu: 'Источник соли и микроэлементов.',
    dosageUz: 'Oxurga yoki maxsus ushlagichga qo‘yiladi.',
    dosageRu: 'Размещается в кормушке или держателе.',
    storageTemp: 'Quruq joyda',
    variants: [{ sku: 'MBL-5', packSize: '5 kg', price: 42000 }],
  },
  {
    slug: 'buzoq-elektrolit',
    category: 'ozuqa-qoshimchalari',
    animals: ['qoramol'],
    titleUz: 'Buzoqlar uchun elektrolit kukuni (namuna)',
    titleRu: 'Электролит для телят (образец)',
    descriptionUz: 'Suyuqlik va tuzlar muvozanatini tiklash uchun.',
    descriptionRu: 'Для восстановления водно-солевого баланса.',
    dosageUz: 'Qo‘llanmaga muvofiq, iliq suvda eritiladi.',
    dosageRu: 'Согласно инструкции, растворить в тёплой воде.',
    storageTemp: 'Quruq joyda, +25 °C gacha',
    variants: [{ sku: 'BEL-100', packSize: '100 g × 10', price: 75000 }],
  },
  {
    slug: 'shprits-tarqatgich',
    category: 'jihozlar',
    animals: ['qoramol', 'qoy-echki', 'ot'],
    titleUz: 'Dozalovchi shprits-tarqatgich (namuna)',
    titleRu: 'Шприц-дозатор (образец)',
    descriptionUz: 'Suyuq vositalarni og‘iz orqali berish uchun.',
    descriptionRu: 'Для перорального введения жидких средств.',
    dosageUz: '',
    dosageRu: '',
    storageTemp: '',
    variants: [{ sku: 'SHT-50', packSize: '50 ml', price: 55000 }],
  },
];

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

async function main() {
  for (const [i, c] of categories.entries()) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: c, create: { ...c, position: i } });
  }
  for (const a of animals) {
    await prisma.animalType.upsert({ where: { slug: a.slug }, update: a, create: a });
  }
  if ((await prisma.deliveryZone.count()) === 0) {
    await prisma.deliveryZone.createMany({
      data: zones.map(([regionUz, regionRu, fee, daysMin, daysMax]) => ({ regionUz, regionRu, fee, daysMin, daysMax })),
    });
  }

  // Superadmin: admin paneliga SUPERADMIN_LOGIN / SUPERADMIN_PASSWORD bilan kiradi (har startda env'dan yangilanadi).
  // Ular berilmasa admin yaratiladi, lekin parolsiz — panelga kirib bo'lmaydi.
  const adminPhone = process.env.ADMIN_PHONE || '+998900000001';
  const login = process.env.SUPERADMIN_LOGIN?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const credentials = login && password ? { login, passwordHash: await hashPassword(password) } : {};
  if (login) await prisma.user.updateMany({ where: { login, NOT: { phone: adminPhone } }, data: { login: null } });
  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: { role: 'ADMIN', superAdmin: true, ...credentials },
    create: { phone: adminPhone, name: 'Admin', role: 'ADMIN', superAdmin: true, ...credentials },
  });
  if (!login || !password) console.warn('SUPERADMIN_LOGIN/SUPERADMIN_PASSWORD berilmagan: admin paneliga kirib bo‘lmaydi');
  const courierUser = await prisma.user.upsert({
    where: { phone: '+998900000003' },
    update: { role: 'COURIER' },
    create: { phone: '+998900000003', name: 'Kuryer', role: 'COURIER' },
  });
  await prisma.courier.upsert({
    where: { userId: courierUser.id },
    update: {},
    create: { userId: courierUser.id, zoneId: 1, status: 'ACTIVE' },
  });

  for (const [idx, p] of products.entries()) {
    const { variants, animals: animalSlugs, category, ...fields } = p;
    const cat = await prisma.category.findUniqueOrThrow({ where: { slug: category } });
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...fields,
        categoryId: cat.id,
        manufacturer: 'Namuna',
        status: 'ACTIVE',
        animalTypes: { connect: animalSlugs.map((slug) => ({ slug })) },
      },
    });
    for (const v of variants) {
      const variant = await prisma.productVariant.upsert({ where: { sku: v.sku }, update: {}, create: { ...v, productId: product.id } });
      // Har bir variantga muddati turlicha bo'lgan ikki partiya: FEFO'ni ko'rsatish uchun.
      for (const [n, days, qty] of [
        [1, 90 + idx * 10, 10],
        [2, 400, 30],
      ] as const) {
        const batchNo = `${v.sku}-B${n}`;
        const exists = await prisma.batch.findUnique({ where: { variantId_batchNo: { variantId: variant.id, batchNo } } });
        if (!exists) {
          await prisma.batch.create({
            data: {
              variantId: variant.id,
              batchNo,
              expiryDate: inDays(days),
              qty,
              purchasePrice: Math.round(v.price * 0.7),
              movements: { create: { type: 'RECEIPT', qty, userId: admin.id } },
            },
          });
        }
      }
    }
  }
  console.log('Seed tayyor');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
