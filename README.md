# Vet Products

Veterinariya mahsulotlari onlayn do'koni: latipov.org.uz. Bu MVP, ya'ni birinchi ishlaydigan versiya.
Reja va arxitektura hujjati: https://claude.ai/code/artifact/4951a6a8-91ed-421b-a11d-739a993625b2

## Tuzilma

| Papka | Nima | Texnologiya |
| --- | --- | --- |
| `apps/api` | REST API (`/v1`), Swagger hujjati `/docs` | NestJS 11, Prisma 6, PostgreSQL 16 |
| `apps/web` | Xaridor sayti (uz/ru), admin paneli (`/uz/admin`), operator paneli (`/uz/staff`), kuryer paneli (`/uz/courier`) | Next.js 15, Tailwind CSS |

## Ishga tushirish (lokal)

Kerak: Node.js 22, pnpm 10, PostgreSQL 16 (yoki Docker).

```bash
docker compose up -d                 # PostgreSQL (yoki o'zingizniki)
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter api exec prisma migrate deploy
pnpm db:seed                         # kategoriyalar, 14 hudud, namuna mahsulotlar, xodimlar
pnpm dev:api                         # http://localhost:4000/v1, hujjat: http://localhost:4000/docs
pnpm dev:web                         # http://localhost:3000
```

`SMS_PROVIDER=console` rejimida SMS yuborilmaydi: kod API logiga yoziladi va kirish sahifasida ko'rsatiladi.

Seed yaratgan sinov akkauntlari:

| Telefon | Rol |
| --- | --- |
| +998900000001 | Admin |
| +998900000002 | Operator |
| +998900000003 | Kuryer |

## Asosiy qoidalar

- **Ombor partiyalar bo'yicha yuritiladi.** Har bir partiyaning seriyasi va yaroqlilik muddati bor. Buyurtmada avval muddati eng yaqin partiya yechiladi (FEFO). Muddati o'tgan partiya sotilmaydi.
- **Buyurtma holatlari:** NEW → CONFIRMED → PACKED (operator) → SHIPPED (kuryer olganda) → DELIVERED. Bekor qilinsa yoki kuryer qaytarsa, mahsulot omborga qaytadi.
- **Yetkazish narxi va muddati** hudud bo'yicha belgilanadi (`DeliveryZone`). Seed'dagi narxlar namuna.
- **Narxlar** so'mda, butun son.
- **Faqat retseptsiz mahsulotlar** sotiladi.

## Tekshirish

```bash
# API ishlab turganda: kirish -> buyurtma -> FEFO -> operator -> kuryer -> Payme
PAYME_KEY=<.env dagi kalit> pnpm --filter api test:e2e
```

## Integratsiyalar

| Xizmat | Holat |
| --- | --- |
| Payme (Merchant API, `/v1/webhooks/payme`) | Yozilgan, sandbox'da sinash kerak |
| Click (SHOP API, `/v1/webhooks/click/prepare` va `/complete`) | Yozilgan, sandbox'da sinash kerak |
| Eskiz.uz SMS | Yozilgan, `SMS_PROVIDER=eskiz` va login/parol kerak |
| Fiskal chek, xarita | Hali yo'q |

## Keyingi qadamlar

- Admin paneli: Excel import, hududlar, kuryerlar (API tayyor: `/v1/admin/*`). Mahsulot va kategoriyalar paneli tayyor.
- Mahsulot rasmlarini S3 yoki CDN ga ko'chirish (hozir API serverining `apps/api/uploads` papkasida).
- Refresh tokenni httpOnly cookie'ga ko'chirish.
- Payme va Click'ni sandbox'da sinash, fiskal chek integratsiyasi.
- Serverga joylash: Docker, HTTPS, latipov.org.uz va api.latipov.org.uz domenlari.
