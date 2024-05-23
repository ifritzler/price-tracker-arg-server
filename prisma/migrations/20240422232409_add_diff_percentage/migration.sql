-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductDailyPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "hasDiscount" BOOLEAN NOT NULL,
    "price" REAL NOT NULL,
    "discountPrice" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "diffPercentage" REAL NOT NULL DEFAULT 0.0,
    CONSTRAINT "ProductDailyPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProductDailyPrice" ("date", "hasDiscount", "id", "price", "productId", "discountPrice") SELECT "date", "hasDiscount", "id", "price", "productId", "discountPrice" FROM "ProductDailyPrice";
DROP TABLE "ProductDailyPrice";
ALTER TABLE "new_ProductDailyPrice" RENAME TO "ProductDailyPrice";
CREATE INDEX "product_id_index" ON "ProductDailyPrice"("productId");
CREATE UNIQUE INDEX "ProductDailyPrice_productId_date_key" ON "ProductDailyPrice"("productId", "date");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
