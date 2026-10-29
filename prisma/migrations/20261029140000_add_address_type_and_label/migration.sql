-- AlterTable
ALTER TABLE "UserAddresses" ADD COLUMN     "addressType" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "label" TEXT;

-- Existing profiles saved a single address, which becomes the home address.
UPDATE "UserAddresses" SET "addressType" = 'home'
WHERE "addressId" IN (SELECT MIN("addressId") FROM "UserAddresses" GROUP BY "userId");

-- CreateIndex
CREATE INDEX "UserAddresses_userId_idx" ON "UserAddresses"("userId");
