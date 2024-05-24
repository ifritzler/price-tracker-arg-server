import { Hono } from 'hono'
import { getProducts } from '../../../services/products.js'

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

export default productsRouter

