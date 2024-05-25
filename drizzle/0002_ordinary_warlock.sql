/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'product_daily_prices'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

ALTER TABLE "product_daily_prices" DROP CONSTRAINT "product_daily_prices_pkey";
ALTER TABLE "product_daily_prices" ADD CONSTRAINT "product_date_pk" PRIMARY KEY("date","product_id");