-- Buyurtmaning noyob kodi: admin va kuryer uchun (xaridorga ko'rsatilmaydi).
ALTER TABLE "Order" ADD COLUMN "code" TEXT;

-- Mavjud buyurtmalarga 8 belgili kod (0/O, 1/I kabi chalkash belgilarsiz).
UPDATE "Order" o SET "code" = (
  SELECT string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
  FROM generate_series(1, 8)
  WHERE o.id IS NOT NULL
);

ALTER TABLE "Order" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");
