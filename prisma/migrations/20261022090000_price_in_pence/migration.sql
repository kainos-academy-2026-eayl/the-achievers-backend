-- Convert existing pound values to integer pence rather than dropping data
ALTER TABLE "Product" ADD COLUMN "pricePence" INTEGER;
UPDATE "Product" SET "pricePence" = ROUND("price" * 100)::INTEGER WHERE "price" IS NOT NULL;
ALTER TABLE "Product" DROP COLUMN "price";
