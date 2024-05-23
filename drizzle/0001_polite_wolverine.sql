ALTER TABLE "product_daily_prices" ALTER COLUMN "price" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_daily_prices" ALTER COLUMN "discount_price" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_daily_prices" ALTER COLUMN "diff_percentage" SET DATA TYPE numeric(12, 2);