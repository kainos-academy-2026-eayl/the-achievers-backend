CREATE FUNCTION recalculate_product_rating_after_review_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "Product"
    SET
        "reviewCount" = (
            SELECT COUNT(*)
            FROM "Review"
            WHERE "productId" = OLD."productId"
        ),
        "rating" = (
            SELECT ROUND(AVG("rating")::numeric, 1)
            FROM "Review"
            WHERE "productId" = OLD."productId"
        )
    WHERE "id" = OLD."productId";

    RETURN OLD;
END;
$$;

CREATE TRIGGER "Review_recalculate_product_rating_after_delete"
AFTER DELETE ON "Review"
FOR EACH ROW
EXECUTE FUNCTION recalculate_product_rating_after_review_delete();
