import { eq, sql } from 'drizzle-orm'
import { db } from '../database/postgres.js'
import {
  productDailyPrices,
  products,
  supermarkets,
} from '../database/schema.js'
import { getProductDataCarrefour } from '../utils/carrefour.js'
import { STOP_INSERTIONS } from '../utils/constants.js'
import { getOnlyDateWithoutHours } from '../utils/date.js'

type SqlQueryRawType = {
  prod_id: number
  category_id: number
  supermarket_id: number
  url: string
  supermarket_name: string
  last_update: string
  last_price: number
  available: boolean
}

export async function updateProductFluctuations(): Promise<
  | { error: string; message?: undefined }
  | { message: string; error?: undefined }
> {
  try {
    const productsToUpdate = await db.execute<SqlQueryRawType>(sql`
    select 
      ${products.id} as prod_id,
      ${products.url} as url,
      ${supermarkets.name} as supermarket_name,
      subq.last_update,
      subq.last_price,
      ${products.available}
    from ${products}
    inner join (
      select
        ${productDailyPrices.productId},
        ${productDailyPrices.date} as last_update,
        ${productDailyPrices.price} as last_price,
        ROW_NUMBER() OVER (PARTITION BY ${
          productDailyPrices.productId
        } ORDER BY ${productDailyPrices.date} DESC) AS row_num
      from
      ${productDailyPrices}
    ) subq ON subq.product_id = ${
      products.id
    } and subq.row_num = 1 and subq.last_update < ${getOnlyDateWithoutHours().toSQLDate()}
    inner join ${supermarkets} ON ${supermarkets.id} = ${products.supermarketId}
    order by prod_id
    `)

    // Si no hay productos para actualizar, retorna un error
    // console.log({ productsToUpdate })
    if (productsToUpdate.length === 0) {
      return { error: 'No products to update' }
    }

    // Actualiza los productos en lotes de 10
    const batchSize = 20
    const batches = Math.ceil(productsToUpdate.length / batchSize)
    console.info('Total Batches: ' + batches)
    for (let i = 0; i < batches; i++) {
      console.info('Batch n°: ' + i)
      const batch = productsToUpdate.slice(i * batchSize, (i + 1) * batchSize)

      const batchData = await Promise.all(
        batch.map(async (row: SqlQueryRawType) => {
          try {
            const result = await getProductDataCarrefour(row.url)
            if (!result) return result
            return {
              ...result,
              productId: row.prod_id,
              lastPrice: row.last_price,
              lastAvailable: row.available,
            }
          } catch (error) {
            console.error(`Error fetching data for link ${row.url}:`, error)
            return null
          }
        }),
      )

      // Actualiza los productos en db uno a uno
      for (let j = 0; j < batchData.length; j++) {
        const response = batchData[j]!
        // if (response.productId === 117) console.log({ response })
        try {
          if (!response || !response.available) {
            continue
          }
          if (response.available !== response.lastAvailable) {
            !STOP_INSERTIONS &&
              (await db
                .update(products)
                .set({ available: response?.available })
                .where(eq(products.url, response?.url || '')))
          }

          const diff = response.realPrice! - Number(response.lastPrice)
          const diffPercentage = (diff / Number(response.lastPrice)) * 100

          // Crea una nueva fluctuación de precio

          !STOP_INSERTIONS &&
            (await db.insert(productDailyPrices).values({
              // @ts-expect-error error expected but is ok
              productId: response.productId,
              diffPercentage: diffPercentage || 0.0,
              hasDiscount: Boolean(response.hasDiscount),
              price: response.realPrice as number,
              discountPrice: response.discountPrice as number,
              date: response.date,
              minimunQuantity: response.minimunQuantity
            }))
        } catch (error) {
          console.error(`Error into getProductData (${response}):`, error)
        }
      }
    }

    return { message: 'Product updates finished' }
  } catch (error) {
    console.error('Error while performing products updating prices:', error)
    return { error: 'Internal server error' }
  }
}
