-- Admin paneli uchun login/parol va superadmin belgisi.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "login" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "superAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
