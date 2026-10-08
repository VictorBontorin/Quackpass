-- CreateEnum
CREATE TYPE "RefundMode" AS ENUM ('SELF_SERVICE', 'PRODUCER');

-- AlterTable
ALTER TABLE "Advertiser" ADD COLUMN     "commissionType" "DiscountType" NOT NULL DEFAULT 'PERCENT',
ADD COLUMN     "commissionValue" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Batch" DROP COLUMN "halfPriceCents";

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "commissionType" "DiscountType",
ADD COLUMN     "commissionValue" INTEGER;

-- Eventos antigos sem idade mínima passam a ser 18+
UPDATE "Event" SET "minAge" = 18 WHERE "minAge" IS NULL;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT '#1d4ed8',
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactInstagram" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "content" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "refundDeadlineHours" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN     "refundMode" "RefundMode" NOT NULL DEFAULT 'PRODUCER',
ADD COLUMN     "showMap" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "minAge" SET NOT NULL,
ALTER COLUMN "minAge" SET DEFAULT 18;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "commissionCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "refundedBy" TEXT,
ADD COLUMN     "ticketsEmailedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "half";

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "half";

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "producerId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Upload_producerId_idx" ON "Upload"("producerId");

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "Producer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

