ALTER TABLE "User" ALTER COLUMN "creditBalancePence" SET DEFAULT 10000000;
-- Existing accounts never had a way to get credit, so give them the same £100,000 starting balance.
UPDATE "User" SET "creditBalancePence" = 10000000 WHERE "creditBalancePence" = 0;
