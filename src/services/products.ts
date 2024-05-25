import { and, asc, eq, gt, ilike, or, sql } from "drizzle-orm";
import { categories, productDailyPrices, products, supermarkets } from "../database/schema.js";
import { getOnlyDateWithoutHours } from "../utils/date.js";
import { db } from "../database/postgres.js";

export async function getProducts(
    filters: { p: string; inc: string; q: string },
    LIMIT_PRODUCTS_PER_PAGE: number,
    PAGE: number,
  ) {
    console.log({...filters})
    const { p, inc, q } = filters
    return await Promise.all([
      db
        .select({
          id: products.id,
          title: products.title,
          url: products.url,
          imageUrl: products.imageUrl,
          categoryId: products.categoryId,
          supermarketId: products.supermarketId,
          category: {
            name: categories.name,
          },
          supermarket: {
            name: supermarkets.name,
          },
          dailyPrices: productDailyPrices,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .innerJoin(supermarkets, eq(products.supermarketId, supermarkets.id))
        .innerJoin(
          productDailyPrices,
          and(
            eq(products.id, productDailyPrices.productId),
            eq(productDailyPrices.date, getOnlyDateWithoutHours()),
          ),
        )
        .where(
          and(
            eq(products.available, true),
            p === 'true' ? eq(productDailyPrices.hasDiscount, true) : undefined,
            inc === 'true'
              ? gt(productDailyPrices.diffPercentage, String(0.0))
              : undefined,
            q !== ''
              ? or(
                ilike(products.title, `%${q}%`),
                ilike(supermarkets.name, `%${q}%`)
              )
              : undefined,
          ),
        )
        .orderBy(asc(products.id))
        .offset(LIMIT_PRODUCTS_PER_PAGE * PAGE - LIMIT_PRODUCTS_PER_PAGE)
        .limit(LIMIT_PRODUCTS_PER_PAGE),
      db
        .select({ count: sql<number>`cast(count(${products.id}) as integer)` })
        .from(products)
        .innerJoin(
          productDailyPrices,
          and(
            eq(products.id, productDailyPrices.productId),
            eq(productDailyPrices.date, getOnlyDateWithoutHours()),
          ),
        )
        .innerJoin(supermarkets, eq(products.supermarketId, supermarkets.id))
        .where(
          and(
            eq(products.available, true),
            p === 'true' ? eq(productDailyPrices.hasDiscount, true) : undefined,
            inc === 'true'
              ? gt(productDailyPrices.diffPercentage, String(0.0))
              : undefined,
            q !== ''
              ?  or(
                ilike(products.title, `%${q}%`),
                ilike(supermarkets.name, `%${q}%`)
              )
              : undefined,
          ),
        ),
    ])
  }