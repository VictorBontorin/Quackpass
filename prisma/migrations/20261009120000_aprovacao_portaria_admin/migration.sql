-- CreateEnum
CREATE TYPE "ProducerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDING';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refundError" TEXT;

-- AlterTable
ALTER TABLE "Producer" ADD COLUMN     "adminNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "eventsPerMonth" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "message" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "state" TEXT,
ADD COLUMN     "status" "ProducerStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "venueType" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "checkedInBy" TEXT;

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "producerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "producerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_login_key" ON "StaffMember"("login");

-- CreateIndex
CREATE INDEX "StaffMember_producerId_idx" ON "StaffMember"("producerId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_producerId_idx" ON "PasswordResetToken"("producerId");

-- CreateIndex
CREATE INDEX "Producer_status_createdAt_idx" ON "Producer"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "Producer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "Producer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

