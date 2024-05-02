import { Product, ProductDailyPrice, Supermarket } from "@prisma/client";

export async function productFillData(product: Product & { dailyPrices: ProductDailyPrice[], supermarket: Supermarket }) {
    const { dailyPrices, supermarket, ...productWithoutDailyPrices } = product
    const productFilled = {
        ...productWithoutDailyPrices,
        supermarket: supermarket.name,
        price: product.dailyPrices[product.dailyPrices.length - 1].price,
        hasPromotion: product.dailyPrices[product.dailyPrices.length - 1].hasPromotion,
        promoPrice: product.dailyPrices[product.dailyPrices.length - 1].promoPrice,
        // Variation % of the last 2 prices if we have more than 2 prices
        diffPercentage: product.dailyPrices[0].diffPercentage,
        available: product.available
    }
    return productFilled
}