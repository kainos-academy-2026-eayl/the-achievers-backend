-- CreateTable
CREATE TABLE "TestTable" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestTable_pkey" PRIMARY KEY ("id")
);
