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


export async function updateProductFluctuations(): Promise<
  | { error: string; message?: undefined }
  | { message: string; error?: undefined }
> {
  try {
    // Obtiene la fecha actual sin horas
    const currentDayTimeWithoutHours = getOnlyDateWithoutHours()
    console.log(currentDayTimeWithoutHours)
    // Consulta para obtener productos cuya última fecha de precio no sea hoy
    const subQuery = db
      .select({
        productId: productDailyPrices.productId,
        lastUpdate: sql`MAX(${productDailyPrices.date})`.as('lastUpdate'),
        lastPrice: productDailyPrices.price,
      })
      .from(productDailyPrices)
      .where(sql`${productDailyPrices.date} < ${getOnlyDateWithoutHours()}`)
      .groupBy(productDailyPrices.productId,productDailyPrices.price)
      .as('latest_prices')

    const productsToUpdate = await db
      .select({
        productId: products.id,
        url: products.url,
        supermarketName: supermarkets.name,
        lastUpdate: subQuery.lastUpdate,
        lastPrice: subQuery.lastPrice,
      })
      .from(products)
      .innerJoin(subQuery, eq(subQuery.productId, products.id))
      .leftJoin(supermarkets, eq(products.supermarketId, supermarkets.id))
    console.log({productsToUpdate})
    // Si no hay productos para actualizar, retorna un error
    if (productsToUpdate.length === 0) {
      return { error: 'No products to update' }
    }

    // Actualiza los productos en lotes de 10
    const batchSize = 20
    const batches = Math.ceil(productsToUpdate.length / batchSize)
    for (let i = 0; i < batches; i++) {
      const batch = productsToUpdate.slice(i * batchSize, (i + 1) * batchSize)

      const batchData = await Promise.all(
        batch.map(async (row) => {
          try {
            return await getProductDataCarrefour(row.url)
          } catch (error) {
            console.error(`Error fetching data for link ${row.url}:`, error)
            return null
          }
        }),
      )

      // Actualiza los productos en db uno a uno
      for (let j = 0; j < batchData.length; j++) {
        const row = batch.find((prod) => prod.url === batchData[j]?.url)
        try {
          if (batchData[j]?.available && row) {
            const response = batchData[j]!
            !STOP_INSERTIONS && await db
              .update(products)
              .set({ available: response?.available })
              .where(eq(products.url, response?.url || ''))

            const diff = response.realPrice! - Number(row.lastPrice)
            const diffPercentage = (diff / Number(row.lastPrice)) * 100

            // Crea una nueva fluctuación de precio

            !STOP_INSERTIONS && await db.insert(productDailyPrices).values({
              // @ts-expect-error error expected but is ok
              productId: row.productId,
              diffPercentage: diffPercentage || 0.0,
              hasDiscount: Boolean(response.hasDiscount),
              price: response.realPrice as number,
              discountPrice: response.discountPrice as number,
              date: response.date,
            })
          }
        } catch (error) {
          console.error(`Error into getProductData (${row}):`, error)
        }
      }
    }

    return { message: 'Product updates finished' }
  } catch (error) {
    console.error('Error while performing products updating prices:', error)
    return { error: 'Internal server error' }
  }
}
