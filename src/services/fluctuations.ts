import { db } from "../database/prisma";
import { getProductDataCarrefour } from "../utils/carrefour";
import { getProductDataCoto } from "../utils/coto";
import { getOnlyDateWithoutHours } from "../utils/date";

export async function updateProductFluctuations(): Promise<{ error: string; message?: undefined; } | { message: string; error?: undefined; }> {
    try {
        // Obtiene la fecha actual sin horas
        const currentDayTimeWithoutHours = getOnlyDateWithoutHours();

        // Consulta para obtener productos cuya última fecha de precio no sea hoy
        const productsToUpdate = await db.product.findMany({
            include: {
                supermarket: true,
                category: true,
                dailyPrices: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 2
                },
            },
            where: {
                NOT: {
                    dailyPrices: {
                        some: {
                            date: {
                                gte: currentDayTimeWithoutHours
                            }
                        }
                    }
                }
            }
        });

        // Si no hay productos para actualizar, retorna un error
        if (productsToUpdate.length === 0) {
            return { error: 'No products to update' };
        }

        // Actualiza los productos en lotes de 10
        const batchSize = 10;
        const batches = Math.ceil(productsToUpdate.length / batchSize);
        for (let i = 0; i < batches; i++) {
            const batch = productsToUpdate.slice(i * batchSize, (i + 1) * batchSize);
            // Actualiza los productos en paralelo
            await Promise.all(batch.map(async product => {
                const supermarket = product.url.includes('carrefour') ? 'carrefour' : 'coto';
                const productId = product.id;
                const url = product.url;

                try {
                    let response;
                    if (supermarket === 'carrefour') {
                        response = await getProductDataCarrefour(url);
                    } else if (supermarket === 'coto') {
                        response = await getProductDataCoto(url);
                    }

                    // Si el producto está disponible, actualiza su información
                    if (response?.available) {
                        await db.product.update({
                            where: { id: productId },
                            data: { available: response.available }
                        });
                        const diff = response.realPrice! - product.dailyPrices[0].price
                        const diffPercentage = diff / product.dailyPrices[0].price * 100;

                        // Crea una nueva fluctuación de precio
                        await db.productDailyPrice.create({
                            data: {
                                productId: productId,
                                hasPromotion: Boolean(response.hasPromotion),
                                price: response.realPrice as number,
                                promoPrice: response.promoPrice as number,
                                date: response.date as Date,
                                diffPercentage: diffPercentage || 0.0
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Error into getProductData (${productId}):`, error);
                }
            }));
        }

        return { message: 'Product updates finished' };
    } catch (error) {
        console.error('Error while performing products updating prices:', error);
        return { error: 'Internal server error' };
    }
}