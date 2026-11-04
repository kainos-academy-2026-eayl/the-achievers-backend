-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "UserAddresses" (
    "addressId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postcode" TEXT,

    CONSTRAINT "UserAddresses_pkey" PRIMARY KEY ("addressId")
);

-- AddForeignKey
ALTER TABLE "UserAddresses" ADD CONSTRAINT "UserAddresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
