import { Product, ProductDailyPrice, Supermarket } from '@prisma/client'

export async function productFillData(
  product: Product & {
    dailyPrices: ProductDailyPrice[]
    supermarket: Supermarket
  },
) {
  const { dailyPrices, supermarket, ...productWithoutDailyPrices } = product
  const productFilled = {
    ...productWithoutDailyPrices,
    supermarket: supermarket.name,
    price: dailyPrices[dailyPrices.length - 1].price,
    hasPromotion:
      dailyPrices[dailyPrices.length - 1].hasPromotion,
    promoPrice: dailyPrices[dailyPrices.length - 1].promoPrice,
    // Variation % of the last 2 prices if we have more than 2 prices
    diffPercentage: dailyPrices[0].diffPercentage,
    available: product.available,
  }
  return productFilled
}
