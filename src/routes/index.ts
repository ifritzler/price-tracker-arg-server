import { Hono } from "hono";
import { cors } from "hono/cors";
import { RegExpRouter } from "hono/router/reg-exp-router";
import { SmartRouter } from "hono/router/smart-router";
import { TrieRouter } from "hono/router/trie-router";
import { db } from "../database/prisma";
import { productFillData } from "../utils/productFillData";

const api = new Hono({
    router: new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()],
    })
})
api.use('*', cors({ origin: ['http://localhost:3000', 'https://localhost:3000'], }))


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
            data: {
                product,
                dailyPrice
            }
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