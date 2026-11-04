CREATE TABLE "Cart" (
    "id" UUID NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Cart" ("id")
SELECT DISTINCT "cartId" FROM "CartItem";

ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey"
    FOREIGN KEY ("cartId") REFERENCES "Cart"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
