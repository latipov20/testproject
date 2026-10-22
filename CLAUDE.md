# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Vet Products: an online store for veterinary products (latipov.org.uz). It is a pnpm monorepo with `apps/api` (NestJS 11, Prisma 6, PostgreSQL 16) and `apps/web` (Next.js 15 App Router, Tailwind 3). The README, code comments, commit messages and UI text are in **Uzbek (Latin script)**. Keep that language when you write comments and commits.

## Commands

```bash
docker compose up -d                          # local PostgreSQL (vet/vet@localhost:5432/vet_products)
pnpm install
cp apps/api/.env.example apps/api/.env        # AUTH_DEV_MODE=true by default
pnpm --filter api exec prisma migrate deploy  # or: pnpm db:migrate (prisma migrate dev, creates new migrations)
pnpm db:seed                                  # categories, 14 zones, sample products, staff
pnpm db:demo                                  # demo catalog (~40 products, images into apps/api/uploads/demo)
pnpm dev:api                                  # http://localhost:4000/v1, Swagger at /docs
pnpm dev:web                                  # http://localhost:3000
pnpm build                                    # builds both apps (this is also the type check; there is no linter)
```

Tests: the only test is an end-to-end smoke script, `apps/api/test/smoke.ts`, a plain `node:assert` script with no test framework. It runs against a **running** API with `AUTH_DEV_MODE=true`, no bot token, and both `PAYME_KEY` and `PAYME_MERCHANT_ID` set in the API's env (the API rejects orders for payment methods whose keys are missing; `GET /v1/payments/methods` lists the enabled ones). It covers customer login, cart, order, FEFO stock deduction, admin status changes, courier delivery and Payme JSON-RPC:

```bash
PAYME_KEY=<value from apps/api/.env> pnpm --filter api test:e2e   # API_URL overrides the target
```

After you change `schema.prisma`, run `pnpm --filter api exec prisma migrate dev --name <name>` and commit the generated migration folder.

## Architecture

### API (`apps/api`)
- Global prefix `/v1`. Global `ValidationPipe({ whitelist: true, transform: true })` and `ThrottlerGuard` (120 requests/minute). `/v1/health` deliberately does not touch the DB, because an uptime monitor pings it to keep the free-tier Render instance and the Telegram bot awake while Neon can still sleep.
- Most feature modules are a **single `*.module.ts` file** that holds the controller, service and DTOs together (`admin`, `staff`, `courier`, `cart`, `orders`, `zones`). Only `auth`, `catalog` and `payments` are split into separate files. Follow the pattern of the module you are editing.
- Auth (`src/common/auth.ts`): use `@UseGuards(AuthGuard)` with `@Roles('ADMIN' | 'COURIER')` on the controller and `@CurrentUser()` for `{ id, role }`. JWTs are signed with `JWT_ACCESS_SECRET` (1h) and `JWT_REFRESH_SECRET` (30d), and the payload is `{ sub, role, via }`.
- **Two login paths, and the role depends on the path** (`roleFor` in `auth/auth.service.ts`):
  - Telegram (`/auth/telegram/start → bot shares phone and sends a 6-digit code → /auth/telegram/verify`) always yields `CUSTOMER`, even when the user is staff.
  - Login/password (`/auth/staff/login`) yields `ADMIN`/`COURIER`, but only for users that have a `passwordHash`. The superadmin is upserted from `SUPERADMIN_LOGIN`/`SUPERADMIN_PASSWORD` on every seed. Admins create couriers and other admins in the panel.
  - The README still says staff log in via Telegram. That is out of date, so trust the code.
  - Dev mode: with `AUTH_DEV_MODE=true`, no `TELEGRAM_BOT_TOKEN` and `NODE_ENV` other than `production`, `/auth/telegram/dev-contact` returns the code directly.
- The Telegram bot (`auth/telegram.service.ts`) uses **long polling** inside the API process. Only one API instance may run per bot token.
- Route groups: public (`/products`, `/categories`, `/zones`), customer (`/cart`, `/orders`, `/me`), `/staff/*` (admin order workflow, batches, expiring stock), `/admin/*` (products, uploads, categories, zones, couriers, reports, `/admin/admins`), `/courier/*` (own deliveries) and `/webhooks/payme`, `/webhooks/click/{prepare,complete}`.
- **Bilingual content** is stored as paired columns (`titleUz`/`titleRu`, `nameUz`/`nameRu`, …). Controllers read `Accept-Language` through `langFrom()` and pick the field with `pick(obj, 'title', lang)` (`src/common/i18n.ts`), which falls back to the other language.
- **Inventory is batch-based** (`Batch` with series and expiry, plus a `StockMovement` log). Order creation deducts stock **FEFO** (earliest expiry first) and skips expired batches, inside a `prisma.$transaction` (`orders/orders.service.ts`). A cancel or a courier return puts the stock back.
- Order status flow: `NEW → CONFIRMED → PACKED` (admin) `→ SHIPPED` (courier picks up) `→ DELIVERED`. Every cancellation goes through `OrdersService.cancel(mode)`, which also sets `Order.cancelledBy` (`CUSTOMER` / `STAFF` / `COURIER`). Both the shop and the admin panel show who cancelled an order.
- Each order has a unique 8-character `Order.code` (generated in `OrdersService`, alphabet without 0/O/1/I). Admins and couriers identify orders by this code, and products by variant SKU. **Customers must never see order IDs or codes**: customer-facing order queries use `omit: { code: true }`, and the shop UI identifies an order by its date.
- Prices are integer so'm. Only non-prescription products are sold.
- Telegram ids are `BigInt`. `main.ts` patches `BigInt.prototype.toJSON` so they serialize as strings.
- Uploaded images go to `apps/api/uploads` (gitignored) and are served at `/uploads/`. Render's disk is ephemeral.

### Web (`apps/web`)
- Every route sits under `src/app/[locale]/` (`uz` | `ru`). `src/middleware.ts` adds the locale prefix (from the `locale` cookie or `Accept-Language`). It also handles the optional backstage subdomains `ADMIN_HOST`/`COURIER_HOST`: on such a host only that area is reachable, and `/admin` or `/courier` on the main domain redirect to the subdomain.
- Three areas: `(shop)` for customers, `admin/` and `courier/`. The admin and courier areas are fully client-side and are guarded by `useBackstage(area)` (`components/backstage/useBackstage.ts`), which redirects to the area's `/login` or shows "access denied" on a role mismatch.
- Two API clients:
  - `lib/api.ts`: server components (SSR) use `apiGet` with the `API_URL` env and ISR `revalidate`. Shared response types live here.
  - `lib/client.ts`: client components use `api()` with `NEXT_PUBLIC_API_URL`. It stores tokens in localStorage and retries once after `/auth/refresh` on a 401. **Sessions are stored per area** (`session`, `session:admin`, `session:courier`, keyed by URL path), so one browser can be logged into the shop, admin and courier areas at the same time. It throws `ApiError(status, message)`, and status 0 means the network is unreachable.
- UI strings are in `lib/i18n.ts` (a `uz` dictionary and a matching `ru` one). Add every new key to both.

## Deployment

`render.yaml` is a Render Blueprint (Frankfurt, free plan) with `vet-products-api` and `vet-products-web`. The database is on Neon, using a direct connection with pooling **off** so migrations work. Each service has a `buildFilter`, so a change in one app does not redeploy the other. Every time the API starts it runs `prisma migrate deploy`, then `seed.ts`, then `demo-catalog.ts`. That is why both seed scripts must stay idempotent (upserts). The API's `WEB_ORIGIN` (CORS, comma-separated) must list every web origin.
