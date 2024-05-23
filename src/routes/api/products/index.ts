import { Hono } from 'hono'
import { db } from '../../../database/postgres.js'
import {
  categories,
  productDailyPrices,
  products,
  supermarkets,
} from '../../../database/schema.js'
import { and, eq, asc, gt, or, ilike, lte, sql } from 'drizzle-orm'
import { DateTime } from 'luxon'

const productsRouter = new Hono()

// GET /api/products
productsRouter.get('', async (c) => {
  try {
    /**
     * Params for the request:
     * 'q' is the search param,
     * 'p' is the param who looks the products with discount and the value can be only true or false
     */
    // eslint-disable-next-line prefer-const
    let { p = 'false', inc = 'false', q = '', page = '1' } = c.req.query()
    const LIMIT_PRODUCTS_PER_PAGE = 16
    const pageNumber = Number(page)
    const PAGE = isNaN(pageNumber) ? 1 : pageNumber

    const booleanValues = ['true', 'false']
    if (!booleanValues.includes(p)) {
      p = 'false'
    }
    if (!booleanValues.includes(inc)) {
      inc = 'false'
    }

    const desiredDate = DateTime.now()
      .setZone('America/Argentina/Buenos_Aires')
      .toSQLDate()
    const date = new Date(desiredDate!)

    const [response, count] = await Promise.all([
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
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(supermarkets, eq(products.supermarketId, supermarkets.id))
        .leftJoin(
          productDailyPrices,
          and(
            eq(products.id, productDailyPrices.productId),
            lte(productDailyPrices.date, date.toISOString()),
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
                  ilike(supermarkets.name, `%${q}%`),
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
        .leftJoin(
          productDailyPrices,
          and(
            eq(products.id, productDailyPrices.productId),
            lte(productDailyPrices.date, date.toISOString()),
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
                  ilike(supermarkets.name, `%${q}%`),
                )
              : undefined,
          ),
        ),
    ])

    // const query = db
    //   .select({
    //     id: products.id,
    //     title: products.title,
    //     url: products.url,
    //     imageUrl: products.imageUrl,
    //     categoryId: products.categoryId,
    //     supermarketId: products.supermarketId,
    //     category: {
    //       name: categories.name,
    //     },
    //     supermarket: {
    //       name: supermarkets.name,
    //     },
    //     dailyPrices: productDailyPrices,
    //   })
    //   .from(products)
    //   .leftJoin(categories, eq(products.categoryId, categories.id))
    //   .leftJoin(supermarkets, eq(products.supermarketId, supermarkets.id))
    //   .leftJoin(
    //     productDailyPrices,
    //     and(
    //       eq(products.id, productDailyPrices.productId),
    //       lte(productDailyPrices.date, date.toISOString()),
    //     ),
    //   )
    //   .where(
    //     and(
    //       eq(products.available, true),
    //       p === 'true' ? eq(productDailyPrices.hasDiscount, true) : undefined,
    //       inc === 'true'
    //         ? gt(productDailyPrices.diffPercentage, String(0.0))
    //         : undefined,
    //       q !== ''
    //         ? or(
    //             ilike(products.title, `%${q}%`),
    //             ilike(supermarkets.name, `%${q}%`),
    //           )
    //         : undefined,
    //     ),
    //   )
    //   .orderBy(asc(products.id))

    // const result = await query
    return c.json({
      data: response,
      meta: {
        totalCount: count[0].count,
        totalPages: Math.ceil(count[0].count / LIMIT_PRODUCTS_PER_PAGE),
        currentPage: PAGE,
      },
    })
  } catch (e) {
    console.error('Error al obtener productos:', e)
    c.status(500)
    return c.json({ error: 'Internal server error' })
  }
})

export default productsRouter
