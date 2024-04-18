import { Product, ProductDailyPrice } from "@prisma/client";

export async function productFillData(product: Product & { dailyPrices: ProductDailyPrice[] }) {
    const { dailyPrices, ...productWithoutDailyPrices } = product
    const productFilled = {
        ...productWithoutDailyPrices,
        price: product.dailyPrices[product.dailyPrices.length - 1].price,
        hasPromotion: product.dailyPrices[product.dailyPrices.length - 1].hasPromotion,
        promoPrice: product.dailyPrices[product.dailyPrices.length - 1].promoPrice,
        // Variation % of the last 2 prices if we have more than 2 prices
        variationDay: product.dailyPrices.length > 1 ? ((product.dailyPrices[product.dailyPrices.length - 1].price - product.dailyPrices[product.dailyPrices.length - 2].price) / product.dailyPrices[product.dailyPrices.length - 2].price) * 100 : 0,
        // difference % between actual price and promo price
        variationPromo: product.dailyPrices[product.dailyPrices.length - 1].hasPromotion ? ((product.dailyPrices[product.dailyPrices.length - 1].promoPrice - product.dailyPrices[product.dailyPrices.length - 1].price) / product.dailyPrices[product.dailyPrices.length - 1].price) * 100 : 0,
        available: product.available
    }
    return productFilled
}