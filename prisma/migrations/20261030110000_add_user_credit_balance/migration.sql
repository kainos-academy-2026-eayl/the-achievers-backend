-- IF NOT EXISTS: some local databases already have this column from an earlier experiment.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditBalancePence" INTEGER;
UPDATE "User" SET "creditBalancePence" = 0 WHERE "creditBalancePence" IS NULL;
ALTER TABLE "User" ALTER COLUMN "creditBalancePence" SET DEFAULT 0,
ALTER COLUMN "creditBalancePence" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_creditBalancePence_non_negative" CHECK ("creditBalancePence" >= 0);
