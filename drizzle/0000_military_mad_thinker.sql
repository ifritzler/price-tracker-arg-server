CREATE TABLE IF NOT EXISTS "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_daily_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"has_discount" boolean NOT NULL,
	"price" numeric(2) NOT NULL,
	"discount_price" numeric(2) NOT NULL,
	"date" date NOT NULL,
	"diff_percentage" numeric(2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"image_url" text NOT NULL,
	"category_id" integer NOT NULL,
	"supermarket_id" integer NOT NULL,
	"available" boolean DEFAULT true,
	CONSTRAINT "idx_url_constraint" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supermarkets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_daily_prices" ADD CONSTRAINT "product_daily_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_supermarket_id_supermarkets_id_fk" FOREIGN KEY ("supermarket_id") REFERENCES "public"."supermarkets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
