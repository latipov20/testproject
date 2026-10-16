# Vet Products

Veterinariya mahsulotlari onlayn do'koni: latipov.org.uz. Bu MVP, ya'ni birinchi ishlaydigan versiya.
Reja va arxitektura hujjati: https://claude.ai/code/artifact/4951a6a8-91ed-421b-a11d-739a993625b2

## Tuzilma

| Papka | Nima | Texnologiya |
| --- | --- | --- |
| `apps/api` | REST API (`/v1`), Swagger hujjati `/docs` | NestJS 11, Prisma 6, PostgreSQL 16 |
| `apps/web` | Do'kon (uz/ru) faqat xaridorlar uchun; backstage: admin paneli (`/uz/admin`) va kuryer ilovasi (`/uz/courier`) | Next.js 15, Tailwind CSS |

## Ishga tushirish (lokal)

Kerak: Node.js 22, pnpm 10, PostgreSQL 16 (yoki Docker).

```bash
docker compose up -d                 # PostgreSQL (yoki o'zingizniki)
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter api exec prisma migrate deploy
pnpm db:seed                         # kategoriyalar, 14 hudud, namuna mahsulotlar, admin va kuryer
pnpm db:demo                         # demo katalog: subkategoriyalar, ~40 mahsulot, rasmlar (uploads/demo), qoldiq
pnpm dev:api                         # http://localhost:4000/v1, hujjat: http://localhost:4000/docs
pnpm dev:web                         # http://localhost:3000
```

## Rollar va kirish

| Rol | Qayerda ishlaydi | Kirish |
| --- | --- | --- |
| Xaridor | Do'kon: katalog, savat, buyurtma, kabinet | `/uz/login` |
| Admin | `/uz/admin`: buyurtmalar, mahsulotlar, kategoriyalar, ombor, kuryerlar | `/uz/admin/login` |
| Kuryer | `/uz/courier`: kimga, qaysi manzilga olib borish, qabul qiluvchining telefoni | `/uz/courier/login` |

Hamma Telegram orqali kiradi. «Vet Register» boti telefon raqamni tasdiqlaydi («Raqamni yuborish» tugmasi) va 6 xonali kod yuboradi, kod saytga kiritiladi. Tasdiqlangan raqam xaridor kabinetida saqlanadi, buyurtmani yetkazayotgan kuryer ham shu raqamni ko'radi. Rol telefon raqamga bog'langan: kuryerni admin panelda raqami bilan qo'shasiz, o'zingizni admin qilish uchun `ADMIN_PHONE=+998XXXXXXXXX pnpm db:seed`.

### Telegram botni ulash

1. Telegram'da @BotFather → `/newbot` → nomi: `Vet Register`, username: masalan `vet_register_bot`.
2. Berilgan tokenni `apps/api/.env` dagi `TELEGRAM_BOT_TOKEN=` ga yozing va API'ni qayta ishga tushiring. Logda `@<username> ishga tushdi` chiqadi.
3. Bot long polling bilan ishlaydi: webhook va ochiq domen shart emas. Bitta token bilan faqat bitta API nusxasi ishlashi kerak.

Token bo'lmasa va `AUTH_DEV_MODE=true` bo'lsa, kirish sahifasi sinov rejimida ishlaydi: raqam kiritiladi, kod sahifada chiqadi. Serverda `AUTH_DEV_MODE` ni yoqmang.

Seed yaratgan sinov akkauntlari (sinov rejimida shu raqamlar bilan kiriladi):

| Telefon | Rol |
| --- | --- |
| +998900000001 | Admin |
| +998900000003 | Kuryer |

## Asosiy qoidalar

- **Ombor partiyalar bo'yicha yuritiladi.** Har bir partiyaning seriyasi va yaroqlilik muddati bor. Buyurtmada avval muddati eng yaqin partiya yechiladi (FEFO). Muddati o'tgan partiya sotilmaydi.
- **Buyurtma holatlari:** NEW → CONFIRMED → PACKED (admin) → SHIPPED (kuryer olganda) → DELIVERED. Bekor qilinsa yoki kuryer qaytarsa, mahsulot omborga qaytadi.
- **Yetkazish narxi va muddati** hudud bo'yicha belgilanadi (`DeliveryZone`). Seed'dagi narxlar namuna.
- **Narxlar** so'mda, butun son.
- **Faqat retseptsiz mahsulotlar** sotiladi.

## Tekshirish

```bash
# API ishlab turganda (AUTH_DEV_MODE=true): kirish -> buyurtma -> FEFO -> admin -> kuryer -> Payme
PAYME_KEY=<.env dagi kalit> pnpm --filter api test:e2e
```

## Serverga joylash (Render)

`render.yaml` Blueprint: PostgreSQL 16, `vet-products-api` va `vet-products-web`, Frankfurt regionida.

1. render.com → **New → Blueprint** → `latipov20/testproject` repo → **Apply**.
2. So'ralgan maxfiy qiymatlar: `TELEGRAM_BOT_TOKEN`, `ADMIN_PHONE` (o'zingizning raqam, `+998...`), Payme/Click kalitlari. Bo'sh qoldirsa ham bo'ladi, keyin **Environment** bo'limida qo'shiladi.
3. API har ishga tushganda migratsiya, seed va demo katalogni bajaradi (upsert, qayta ishga tushirish xavfsiz).
4. Render API'ga boshqa manzil bersa, web'dagi `API_URL`/`NEXT_PUBLIC_API_URL` va API'dagi `WEB_ORIGIN` ni yangilab, web'ni qayta deploy qiling.

Serverda sinov rejimi o'chiq (`NODE_ENV=production`): kirish uchun bot tokeni shart. Bepul tarif cheklovlari `render.yaml` boshida yozilgan.

## Integratsiyalar

| Xizmat | Holat |
| --- | --- |
| Payme (Merchant API, `/v1/webhooks/payme`) | Yozilgan, sandbox'da sinash kerak |
| Click (SHOP API, `/v1/webhooks/click/prepare` va `/complete`) | Yozilgan, sandbox'da sinash kerak |
| Telegram bot «Vet Register» (kirish) | Yozilgan, `TELEGRAM_BOT_TOKEN` kerak |
| Fiskal chek, xarita | Hali yo'q |

## Keyingi qadamlar

- Admin paneli: Excel import va hududlar narxini tahrirlash (API tayyor: `/v1/admin/*`).
- Mahsulot rasmlarini S3 yoki CDN ga ko'chirish (hozir API serverining `apps/api/uploads` papkasida).
- Refresh tokenni httpOnly cookie'ga ko'chirish.
- Payme va Click'ni sandbox'da sinash, fiskal chek integratsiyasi.
- latipov.org.uz va api.latipov.org.uz domenlarini Render servislariga ulash.
