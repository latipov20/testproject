-- Operator roli olib tashlanadi: mavjud operatorlar admin bo'ladi (buyurtmalar bilan endi admin ishlaydi).
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'OPERATOR';

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('CUSTOMER', 'COURIER', 'ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramId" BIGINT,
ADD COLUMN     "telegramUsername" TEXT;

-- DropTable
DROP TABLE "OtpCode";

-- CreateTable
CREATE TABLE "TelegramLogin" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "chatId" BIGINT,
    "phone" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "codeHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLogin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLogin_token_key" ON "TelegramLogin"("token");

-- CreateIndex
CREATE INDEX "TelegramLogin_chatId_createdAt_idx" ON "TelegramLogin"("chatId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

