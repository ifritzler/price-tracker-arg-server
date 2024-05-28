import { Hono } from 'hono'
import {
  getProductById,
  getProductMetricsById,
  getProducts,
  getProductsByEAN,
  updateEanProducts,
} from '../../../services/products.js'

const productsRouter = new Hono()

// GET /api/products
productsRouter.get('', async (c) => {
  try {
    /**
     * Params for the request:
     * 'q' is the search param,
     * 'p' is the param who looks the products with discount and the value can be only true or false
     */
    // eslint-disable-next-line prefer-const
    let { p = 'false', inc = 'false', q = '', page = '1' } = c.req.query()
    const LIMIT_PRODUCTS_PER_PAGE = 16
    const pageNumber = Number(page)
    const PAGE = isNaN(pageNumber) ? 1 : pageNumber

    const booleanValues = ['true', 'false']
    if (!booleanValues.includes(p)) {
      p = 'false'
    }
    if (!booleanValues.includes(inc)) {
      inc = 'false'
    }

    const [response, count] = await getProducts(
      { p, inc, q },
      LIMIT_PRODUCTS_PER_PAGE,
      PAGE,
    )
    return c.json({
      data: response,
      meta: {
        totalCount: count[0].count,
        totalPages: Math.ceil(count[0].count / LIMIT_PRODUCTS_PER_PAGE),
        currentPage: PAGE,
      },
    })
  } catch (e) {
    console.error('Error al obtener productos:', e)
    c.status(500)
    return c.json({ error: 'Internal server error' })
  }
})

productsRouter.get(':id', async (c) => {
  const id = Number(c.req.param('id'))

  if (isNaN(id)) {
    return c.json(
      {
        success: false,
        message: 'Product id must be a number',
      },
      400,
    )
  }

  const product = await getProductById(id)
  if (!product) {
    return c.json(
      {
        success: false,
        message: 'Product not found',
      },
      400,
    )
  }

  return c.json({
    success: true,
    data: product,
  })
})

productsRouter.get('/ean/:ean', async (c) => {
  const ean = c.req.param('ean')

  if (!ean) return c.notFound()
  const product = await getProductsByEAN(ean)
  if (!product) {
    return c.json(
      {
        success: false,
        message: 'Product not found',
      },
      404,
    )
  }

  return c.json({
    success: true,
    data: product,
  })
})

productsRouter.get('/metrics/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const { d } = c.req.query()

  if (isNaN(id) || (d && isNaN(Number(d)))) {
    return c.json(
      {
        success: false,
        message: 'Bad request',
      },
      400,
    )
  }

  const metrics = await getProductMetricsById(id, Number(d) ?? 7)
  if (!metrics) {
    return c.json(
      {
        success: false,
        message: 'Metrics not found for product id: ' + id,
      },
      400,
    )
  }

  return c.json({
    success: true,
    data: metrics,
  })
})

productsRouter.put('update/ean', async (c) => {
  await updateEanProducts()
  return c.json({ success: true })
})
export default productsRouter
