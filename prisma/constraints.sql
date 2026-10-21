-- Database-level safety nets that Prisma's schema language cannot express. Safe to run more than once.
ALTER TABLE "Inventory" DROP CONSTRAINT IF EXISTS inventory_onhand_nonneg;
ALTER TABLE "Inventory" ADD CONSTRAINT inventory_onhand_nonneg CHECK ("onHand" >= 0);
ALTER TABLE "Inventory" DROP CONSTRAINT IF EXISTS inventory_reserved_nonneg;
ALTER TABLE "Inventory" ADD CONSTRAINT inventory_reserved_nonneg CHECK ("reserved" >= 0);
ALTER TABLE "Inventory" DROP CONSTRAINT IF EXISTS inventory_reserved_le_onhand;
ALTER TABLE "Inventory" ADD CONSTRAINT inventory_reserved_le_onhand CHECK ("reserved" <= "onHand");
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS review_rating_range;
ALTER TABLE "Review" ADD CONSTRAINT review_rating_range CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS orderitem_qty_positive;
ALTER TABLE "OrderItem" ADD CONSTRAINT orderitem_qty_positive CHECK ("quantity" > 0);
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS product_sale_lt_base;
ALTER TABLE "Product" ADD CONSTRAINT product_sale_lt_base CHECK ("salePrice" IS NULL OR "salePrice" < "basePrice");
