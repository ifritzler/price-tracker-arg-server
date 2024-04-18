import { Hono } from "hono";
import { cors } from "hono/cors";
import { RegExpRouter } from "hono/router/reg-exp-router";
import { SmartRouter } from "hono/router/smart-router";
import { TrieRouter } from "hono/router/trie-router";
import { db } from "../database/prisma";
import { productFillData } from "../utils/productFillData";
import { getProductDataCarrefour } from '../utils/carrefour';
import { getProductDataCoto } from "../utils/coto";

const api = new Hono({
    router: new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()],
    })
});

// Middleware para manejar CORS
api.use('*', cors({ origin: ['http://localhost:3000', 'https://localhost:3000'] }));

// Actualizar fluctuaciones diarias de productos
api.post('products/update', async (c) => {
    try {
        const currentTime = new Date();
        const allowedTime = new Date(currentTime);
        allowedTime.setHours(8, 15, 0, 0); // Establecer la hora permitida a las 8:15 AM

        if (currentTime < allowedTime) {
            c.status(403);
            return c.json({ error: 'Forbidden: Update can only be performed after 8:15 AM' });
        }

        const lastDaylyPrices = await db.productDailyPrice.groupBy({
            by: ['productId'],
            _max: {
                date: true
            },
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Establecer la hora a 00:00:00

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const productsToUpdate = lastDaylyPrices.filter(daylyPrice => {
            const lastDaylyPriceDate = new Date(daylyPrice._max.date as Date);
            lastDaylyPriceDate.setHours(0, 0, 0, 0); // Establecer la hora a 00:00:00
            return lastDaylyPriceDate < yesterday;
        });
        
        if (productsToUpdate.length === 0) {
            c.status(409);
            return c.json({ error: 'No products to update' });
        }

        const updates = await Promise.all(productsToUpdate.map(async product => {
            const supermarket = product.productId.includes('carrefour') ? 'carrefour' : 'coto';
            const url = product.productId;
        
            try {
                if (supermarket === 'carrefour') {
                    return await getProductDataCarrefour(url);
                } else if (supermarket === 'coto') {
                    return await getProductDataCoto(url);
                }
            } catch (e) {
                console.error(`Error en getProductData (${supermarket}):`, e);
                return null;
            }
        }));

        await db.productDailyPrice.createMany({
            data: updates.filter(update => update !== null).map(update => ({
                productId: update?.pid as string,
                hasPromotion: Boolean(update?.hasPromotion),
                price: update?.realPrice as number,
                promoPrice: update?.promoPrice as number,
                date: new Date()
            }))
        });

        return c.json({ data: productsToUpdate });
    } catch (e) {
        console.error('Error en la actualización de productos:', e);
        c.status(500);
        return c.json({ error: 'Internal server error' });
    }
});


// Obtener todos los productos
api.get('products', async (c) => {
    try {
        const products = await db.product.findMany({
            include: {
                dailyPrices: true
            }
        });

        const filledProducts = await Promise.all(products.map(async product => await productFillData(product)));

        return c.json({ data: filledProducts });
    } catch (e) {
        console.error('Error al obtener productos:', e);
        c.status(500);
        return c.json({ error: 'Internal server error' });
    }
});

// Buscar un solo producto
api.post('product/search', async (c) => {
    try {
        const { pid } = await c.req.json();
        if (!pid) {
            c.status(400);
            return c.json({ error: 'Product ID is required' });
        }

        const product = await db.product.findFirstOrThrow({
            where: {
                productId: pid
            },
            include: {
                dailyPrices: true
            }
        });

        return c.json({ data: await productFillData(product) });
    } catch (e) {
        console.error('Error al buscar un producto:', e);
        c.status(404);
        return c.json({ error: 'Producto no encontrado' });
    }
});

// Guardar un producto por primera vez
api.post('product', async (c) => {
    try {
        const { pid, title, supermercado: supermarket, productUrl, imageUrl, category, hasPromotion, realPrice, promoPrice } = await c.req.json();

        const [product, dailyPrice] = await db.$transaction([
            db.product.create({
                data: {
                    productId: pid,
                    title,
                    supermarket,
                    url: productUrl,
                    imageUrl,
                    category,
                }
            }),
            db.productDailyPrice.create({
                data: {
                    productId: pid,
                    hasPromotion: hasPromotion === 'on' ? true : false,
                    price: parseFloat(realPrice),
                    promoPrice: parseFloat(promoPrice),
                }
            }),
        ]);

        return c.json({
            data: await productFillData({
                ...product,
                dailyPrices: [dailyPrice]
            })
        });
    } catch (e) {
        console.error('Error al guardar un producto:', e);
        c.status(400);
        return c.json({ error: 'Bad request' });
    }
});

export default api;
