import { Hono } from 'hono'
import { db } from '../../../database/prisma.js'
import { getOnlyDateWithoutHours } from '../../../utils/date.js'

const productsRouter = new Hono()

// GET /api/products
productsRouter.get('', async (c) => {
  console.log('epoch: ' + getOnlyDateWithoutHours().getTime())
  try {
    /**
     * Params for the request:
     * 'q' is the search param,
     * 'p' is the param who looks the products with discount and the value can be only true or false
     */
    // eslint-disable-next-line prefer-const
    let { page = '1', p = 'false', inc = 'false', q = '' } = c.req.query()

    const booleanValues = ['true', 'false']
    if (!booleanValues.includes(p)) {
      p = 'false'
    }
    if (!booleanValues.includes(inc)) {
      inc = 'false'
    }

    const filterConditions = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      AND: [] as any,
    }

    if (p === 'true') {
      filterConditions.AND.push({
        dailyPrices: {
          some: {
            AND: [{ hasPromotion: true }, { date: getOnlyDateWithoutHours() }],
          },
        },
      })
    }

    if (inc === 'true') {
      filterConditions.AND.push({
        dailyPrices: {
          some: {
            AND: [
              { diffPercentage: { gt: 0 } },
              { date: getOnlyDateWithoutHours() },
            ],
          },
        },
      })
    }

    if (q !== '') {
      filterConditions.AND.push({
        OR: [
          {
            title: { contains: q },
            supermarket: { name: { contains: q } },
          },
        ],
      })
    }

    const pageSize = 16
    const totalCount = await db.product.count({
      where: filterConditions,
    })
    const totalPages = Math.ceil(totalCount / pageSize)
    const currentPage = parseInt(page)
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = Math.min(currentPage * pageSize, totalCount)

    const products =
      totalCount === 0
        ? []
        : await db.product.findMany({
            where: filterConditions,
            include: {
              dailyPrices: {
                orderBy: {
                  date: 'desc',
                },
                take: 1,
              },
              supermarket: true,
              category: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
            orderBy: {
              id: 'asc',
            },
            skip: startIndex, // Saltar los productos anteriores a la página actual
            take: pageSize, // Obtener solo los productos de la página actual
          })

    return c.json({
      data: products,
      meta: {
        totalCount,
        totalPages,
        currentPage,
        startIndex,
        endIndex,
      },
    })
  } catch (e) {
    console.error('Error al obtener productos:', e)
    c.status(500)
    return c.json({ error: 'Internal server error' })
  }
})

productsRouter.get('/discounts', async (c) => {
  const products = await db.product.findMany({
    where: {
      dailyPrices: {
        some: {
          diffPercentage: {
            lt: 0.0,
          },
        },
      },
    },
    include: {
      dailyPrices: {
        orderBy: {
          date: 'desc',
        },
        take: 1,
      },
      category: true,
      supermarket: true,
    },
  })
  return c.json({
    success: true,
    data: products,
  })
})

productsRouter.post('/', async (c) => {
  try {
    const {
      title,
      supermercado,
      productUrl,
      imageUrl,
      category,
      hasPromotion,
      realPrice,
      promoPrice,
    } = await c.req.json()

    if (
      !title ||
      !supermercado ||
      !productUrl ||
      !imageUrl ||
      !category ||
      !realPrice ||
      !promoPrice
    )
      throw new Error('Faltan datos')

    const supermarket = await db.supermarket.findFirst({
      where: {
        name: supermercado,
      },
    })
    const cat = await db.category.findFirst({
      where: {
        name: category,
      },
    })
    if (!supermarket) throw new Error('Supermercado no encontrado')
    if (!cat) throw new Error('Categoria no encontrada')

    const product = await db.$transaction(async (tsx) => {
      const product = await tsx.product.create({
        data: {
          title,
          supermarketId: supermarket.id,
          url: productUrl,
          imageUrl,
          categoryId: cat.id,
        },
        include: {
          supermarket: true,
          category: true,
          dailyPrices: true,
        },
      })

      const dailyPrice = await tsx.productDailyPrice.create({
        data: {
          productId: product.id,
          hasPromotion: hasPromotion === 'on' ? true : false,
          price: parseFloat(realPrice),
          promoPrice: parseFloat(promoPrice),
          date: getOnlyDateWithoutHours(),
          diffPercentage: 0.0,
        },
      })
      return {
        ...product,
        dailyPrices: [dailyPrice],
      }
    })

    return c.json({
      data: product,
    })
  } catch (e) {
    console.error('Error al guardar un producto:', e)
    c.status(400)
    return c.json({ error: 'Bad request' })
  }
})

productsRouter.get('/:id', async (c) => {
  try {
    const { id } = c.req.param()
    const idn = parseInt(id)
    if (!id || isNaN(idn)) {
      c.status(400)
      return c.json({ error: 'Product ID is required' })
    }
    const product = await db.product.findFirst({
      where: { id: idn },
      include: {
        dailyPrices: true,
      },
    })
    if (!product) {
      c.status(404)
      return c.json({ error: 'Product not found' })
    }
    return c.json({ data: product })
  } catch (e) {
    console.error('Error al buscar un producto:', e)
    c.status(404)
    return c.json({ error: 'Producto no encontrado' })
  }
})

export default productsRouter
