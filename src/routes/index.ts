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
})
api.use('*', cors({ origin: ['http://localhost:3000', 'https://localhost:3000'], }))


// Update ProductDayly fluctuations
api.post('products/update', async (c) => {
    // Find the last daylyPrice for all products and only filter each which the last day of update is was yesterday or before
    const lastDaylyPrices = await db.productDailyPrice.groupBy({
        by: ['productId'],
        _max: {
            date: true
        },
    })
    
    // [
    //     {
    //       "_max": {
    //         "date": "2024-04-17T17:41:57.220Z"
    //       },
    //       "productId": "https://www.cotodigital3.com.ar/sitios/cdigi/producto/-scones-sconcito-9-de-oro-bsa-200-grm/_/A-00089952-00089952-200"
    //     },
    //     {
    //       "_max": {
    //         "date": "2024-04-17T17:38:27.388Z"
    //       },
    //       "productId": "https://www.cotodigital3.com.ar/sitios/cdigi/producto/-bizcochos-grasa-9-de-oro-paq-200-grm/_/A-00004606-00004606-200"
    //     },
    //     {
    //       "_max": {
    //         "date": "2024-04-17T13:57:14.002Z"
    //       },
    //       "productId": "https://www.carrefour.com.ar/fideos-spaghettini-barilla-n3-500-g/p"
    //     },]

    // example: if today is 18 and the last product update was 17 or before, we need to keep the productId for update now
    const productsToUpdate = lastDaylyPrices.filter(daylyPrice => {
        const lastDaylyPriceDate = new Date(daylyPrice._max.date as Date)
        const today = new Date()
        today.setDate(today.getDate() - 1)
        return lastDaylyPriceDate < today
    })

    const promises = productsToUpdate.map(async product => {
        const supermarket = product.productId.includes('carrefour') ? 'carrefour' : 'coto';
        const url = product.productId;
    
        if (supermarket === 'carrefour') {
            try {
                const productData = await getProductDataCarrefour(url);
                return productData;
            } catch (e) {
                // Manejo de errores
                console.error('Error en getProductDataCarrefour:', e);
                return null;
            }
        }
    
        if (supermarket === 'coto') {
            try {
                const productData = await getProductDataCoto(url);
                return productData;
            } catch (e) {
                // Manejo de errores
                console.error('Error en getProductDataCoto:', e);
                return null;
            }
        }
    
        return null;
    });

    const updates = await Promise.all(promises)
    
    try {
        await db.productDailyPrice.createMany({
            data: [
                ...updates.map(update => {
                    return {
                        productId: update?.pid as string,
                        hasPromotion: Boolean(update?.hasPromotion),
                        price: update?.realPrice as number,
                        promoPrice: update?.promoPrice as number,
                        date: new Date()
                    }
                })
            ]
        })
        return c.json({ data: productsToUpdate })
    }catch(e: any){
        c.status(500)
        return c.json({
            error: e.message
        })
    }
})

// Get all products
api.get('products', async (c) => {
    const products = await db.product.findMany({
        include: {
            dailyPrices: true
        }
    })
    // filled products
    return c.json({
        data: await Promise.all(products.map(async product => await productFillData(product)))
    })
})

// Get only one product
api.post('product/search', async (c) => {
    const productId = (await c.req.json())?.pid
    if (!productId) {
        c.status(400)
        return c.json({
            error: 'Product ID is required'
        })
    }
    try {
        const product = await db.product.findFirstOrThrow({
            where: {
                productId: productId
            },
            include: {
                dailyPrices: true
            }
        })
        return c.json({
            data: await productFillData(product)
        })
    } catch (e: any) {
        console.log(e.message)
        c.status(404)
        return c.json({
            error: "Producto no encontrado"
        })
    }
})

// Save product first time
api.post('product', async (c) => {
    const body = await c.req.json()

    const toSave = {
        productId: body.pid,
        title: body.title,
        supermarket: body.supermercado,
        url: body.productUrl,
        imageUrl: body.imageUrl,
        category: body.category,
    }

    const toSaveFirstDailyPrice = {
        productId: body.pid,
        hasPromotion: body.hasPromotion === 'on' ? true : false,
        price: parseFloat(body.realPrice),
        promoPrice: parseFloat(body.promoPrice),
    }

    try {
        const [product, dailyPrice] = await db.$transaction([
            db.product.create({ data: toSave }),
            db.productDailyPrice.create({ data: toSaveFirstDailyPrice }),
        ])
        return c.json({
            data: await productFillData({
                ...product,
                dailyPrices: [dailyPrice]
            })
        })
    } catch (e: any) {
        console.log(e.message)
        c.status(400)
        return c.json({
            error: e.message
        })
    }
})


export default api