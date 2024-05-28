import { and, desc, eq, gt, ilike, or, sql } from 'drizzle-orm'
import {
  categories as categoriesTable,
  productDailyPrices as productDailyPricesTable,
  products as productsTable,
  supermarkets as supermarketsTable,
} from '../database/schema.js'
import { getOnlyDateWithoutHours, isMorning, TimeEstimator } from '../utils/date.js'
import { db } from '../database/postgres.js'
import { getProductDataCarrefour } from '../utils/carrefour/carrefour.js';

export async function getProducts(
  filters: { p: string; inc: string; q: string },
  LIMIT_PRODUCTS_PER_PAGE: number,
  PAGE: number,
) {
  const { p, inc, q } = filters
  return await Promise.all([
    db
      .select({
        id: productsTable.id,
        title: productsTable.title,
        url: productsTable.url,
        imageUrl: productsTable.imageUrl,
        categoryId: productsTable.categoryId,
        supermarketId: productsTable.supermarketId,
        category: {
          name: categoriesTable.name,
        },
        supermarket: {
          name: supermarketsTable.name,
        },
        dailyPrices: productDailyPricesTable,
      })
      .from(productsTable)
      .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .innerJoin(supermarketsTable, eq(productsTable.supermarketId, supermarketsTable.id))
      .innerJoin(
        productDailyPricesTable,
        and(
          eq(productsTable.id, productDailyPricesTable.productId),
          isMorning()
            ? eq(
                productDailyPricesTable.date,
                getOnlyDateWithoutHours().minus({ day: 1 }).toSQLDate()!,
              )
            : eq(
                productDailyPricesTable.date,
                getOnlyDateWithoutHours().toSQLDate()!,
              ),
        ),
      )
      .where(
        and(
          eq(productsTable.available, true),
          p === 'true' ? eq(productDailyPricesTable.hasDiscount, true) : undefined,
          inc === 'true'
            ? gt(productDailyPricesTable.diffPercentage, String(0.0))
            : undefined,
          q !== ''
            ? or(
                ilike(productsTable.title, `%${q}%`),
                ilike(supermarketsTable.name, `%${q}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(productsTable.ean))
      .offset(LIMIT_PRODUCTS_PER_PAGE * PAGE - LIMIT_PRODUCTS_PER_PAGE)
      .limit(LIMIT_PRODUCTS_PER_PAGE),
    db
      .select({ count: sql<number>`cast(count(${productsTable.id}) as integer)` })
      .from(productsTable)
      .innerJoin(
        productDailyPricesTable,
        and(
          eq(productsTable.id, productDailyPricesTable.productId),
          isMorning()
            ? eq(
                productDailyPricesTable.date,
                getOnlyDateWithoutHours().minus({ day: 1 }).toSQLDate()!,
              )
            : eq(
                productDailyPricesTable.date,
                getOnlyDateWithoutHours().toSQLDate()!,
              ),
        ),
      )
      .innerJoin(supermarketsTable, eq(productsTable.supermarketId, supermarketsTable.id))
      .where(
        and(
          eq(productsTable.available, true),
          p === 'true' ? eq(productDailyPricesTable.hasDiscount, true) : undefined,
          inc === 'true'
            ? gt(productDailyPricesTable.diffPercentage, String(0.0))
            : undefined,
          q !== ''
            ? or(
                ilike(productsTable.title, `%${q}%`),
                ilike(supermarketsTable.name, `%${q}%`),
              )
            : undefined,
        ),
      ),
  ])
}

export async function updateEanProducts(){
  const products = await db.select().from(productsTable)
  const steps = Math.ceil(products.length / 20)
  const timeEstimator = new TimeEstimator(steps)

  for(let i = 0; i < steps; i++) {
    const slice = products.slice(i * 20, (i + 1) * 20)
    timeEstimator.startStep()

    const newData = await Promise.all(slice.map(async product => {
      const data = await getProductDataCarrefour(product.url);
      return data
    }))

    for(let j = 0; j < newData.length; j++){
      const obj = newData[j]
      if(obj) {
        await db.update(productsTable).set({ean: obj.ean }).where(eq(productsTable.url, obj.url))
      }
    }
    timeEstimator.endStep()
    timeEstimator.logEstimatedRemainingTime()
  }
}
