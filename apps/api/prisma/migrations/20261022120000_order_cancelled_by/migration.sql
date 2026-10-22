-- Buyurtmani kim bekor qilgani: xaridor, ombor xodimi (admin) yoki kuryer (qaytargan).
CREATE TYPE "CancelledBy" AS ENUM ('CUSTOMER', 'STAFF', 'COURIER');
ALTER TABLE "Order" ADD COLUMN "cancelledBy" "CancelledBy";

-- Eski bekor qilinganlar: kuryer qaytargan bo'lsa COURIER, omborga qaytarishni xaridorning o'zi qilgan bo'lsa CUSTOMER, aks holda STAFF.
UPDATE "Order" o SET "cancelledBy" = (CASE
  WHEN EXISTS (SELECT 1 FROM "Delivery" d WHERE d."orderId" = o.id AND d.status = 'RETURNED') THEN 'COURIER'
  WHEN EXISTS (SELECT 1 FROM "StockMovement" m WHERE m."orderId" = o.id AND m.type = 'RETURN' AND m."userId" = o."userId") THEN 'CUSTOMER'
  ELSE 'STAFF'
END)::"CancelledBy"
WHERE o.status = 'CANCELLED';
