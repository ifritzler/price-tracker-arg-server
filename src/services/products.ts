import { and, desc, eq, gt, ilike, or, sql } from 'drizzle-orm'
import {
  categories as categoriesTable,
  productDailyPrices as productDailyPricesTable,
  products as productsTable,
  supermarkets as supermarketsTable,
} from '../database/schema.js'
import {
  getOnlyDateWithoutHours,
  isMorning,
  TimeEstimator,
} from '../utils/date.js'
import { db } from '../database/postgres.js'
import { getProductDataCarrefour } from '../utils/carrefour/carrefour.js'

interface ProductBase {
  id: number
  title: string
  url: string
  imageUrl: string
  categoryId: number
  categoryName: string
  supermarketId: number
  supermarketName: string
  available: boolean | null
  ean: string | null
}

interface ProductMetric {
  id: number
  productId: number
  hasDiscount: boolean
  price: number
  discountPrice: number
  date: string
  diffPercentage: number
  minimunQuantity: number | null
}

export async function getProducts(
  filters: { p: string; inc: string; q: string; supId: string },
  LIMIT_PRODUCTS_PER_PAGE: number,
  PAGE: number,
) {
  const { p, inc, q, supId } = filters
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
      .innerJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.id),
      )
      .innerJoin(
        supermarketsTable,
        eq(productsTable.supermarketId, supermarketsTable.id),
      )
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
          supId && supId !== '0' && supId !== ''
            ? eq(supermarketsTable.id, Number(supId))
            : undefined,
          p === 'true'
            ? eq(productDailyPricesTable.hasDiscount, true)
            : undefined,
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
      .select({
        count: sql<number>`cast(count(${productsTable.id}) as integer)`,
      })
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
      .innerJoin(
        supermarketsTable,
        eq(productsTable.supermarketId, supermarketsTable.id),
      )
      .where(
        and(
          eq(productsTable.available, true),
          supId && supId !== '0' && supId !== ''
            ? eq(supermarketsTable.id, Number(supId))
            : undefined,
          p === 'true'
            ? eq(productDailyPricesTable.hasDiscount, true)
            : undefined,
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

export async function getProductById(id: number): Promise<ProductBase | null> {
  const queryResult: ProductBase[] | null = await db
    .select({
      id: productsTable.id,
      title: productsTable.title,
      url: productsTable.url,
      imageUrl: productsTable.imageUrl,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      supermarketId: productsTable.supermarketId,
      supermarketName: supermarketsTable.name,
      available: productsTable.available,
      ean: productsTable.ean,
    })
    .from(productsTable)
    .innerJoin(
      supermarketsTable,
      eq(productsTable.supermarketId, supermarketsTable.id),
    )
    .innerJoin(
      categoriesTable,
      eq(categoriesTable.id, productsTable.categoryId),
    )
    .where(eq(productsTable.id, id))
    .limit(1)

  if (!queryResult.length) {
    return null
  }
  return queryResult[0]
}

export async function getProductMetricsById(
  id: number,
  daysLimit?: number,
): Promise<ProductMetric[] | null> {
  const BASE_DAYS_LIMIT = 7
  const queryResult = await db
    .select({
      date: productDailyPricesTable.date,
      id: productDailyPricesTable.id,
      productId: productDailyPricesTable.productId,
      hasDiscount: productDailyPricesTable.hasDiscount,
      price: sql<number>`CAST (${productDailyPricesTable.price} as integer)`.as(
        'price',
      ),
      discountPrice:
        sql<number>`CAST (${productDailyPricesTable.discountPrice} as integer)`.as(
          'discountPrice',
        ),
      diffPercentage:
        sql<number>`CAST (${productDailyPricesTable.diffPercentage} as integer)`.as(
          'diffPercentage',
        ),
      minimunQuantity: productDailyPricesTable.minimunQuantity,
    })
    .from(productDailyPricesTable)
    .where(eq(productDailyPricesTable.productId, id))
    .limit(daysLimit ?? BASE_DAYS_LIMIT)

  if (!queryResult) return null
  if (queryResult.length === 0) return null

  return queryResult
}

export async function getProductsByEAN(ean: string) {
  const queryResult: ProductBase[] | null = await db
    .select({
      id: productsTable.id,
      title: productsTable.title,
      url: productsTable.url,
      imageUrl: productsTable.imageUrl,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      supermarketId: productsTable.supermarketId,
      supermarketName: supermarketsTable.name,
      available: productsTable.available,
      ean: productsTable.ean,
    })
    .from(productsTable)
    .innerJoin(
      supermarketsTable,
      eq(productsTable.supermarketId, supermarketsTable.id),
    )
    .innerJoin(
      categoriesTable,
      eq(categoriesTable.id, productsTable.categoryId),
    )
    .where(eq(productsTable.ean, ean))

  if (!queryResult.length) {
    return null
  }
  return queryResult
}

export async function updateEanProducts() {
  const products = await db.select().from(productsTable)
  const steps = Math.ceil(products.length / 20)
  const timeEstimator = new TimeEstimator(steps)

  for (let i = 0; i < steps; i++) {
    const slice = products.slice(i * 20, (i + 1) * 20)
    timeEstimator.startStep()

    const newData = await Promise.all(
      slice.map(async (product) => {
        const data = await getProductDataCarrefour(product.url)
        return data
      }),
    )

    for (let j = 0; j < newData.length; j++) {
      const obj = newData[j]
      if (obj) {
        await db
          .update(productsTable)
          .set({ ean: obj.ean })
          .where(eq(productsTable.url, obj.url))
      }
    }
    timeEstimator.endStep()
    timeEstimator.logEstimatedRemainingTime()
  }
}
