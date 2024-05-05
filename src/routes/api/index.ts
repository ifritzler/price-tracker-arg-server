import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { RegExpRouter } from 'hono/router/reg-exp-router'
import { SmartRouter } from 'hono/router/smart-router'
import { TrieRouter } from 'hono/router/trie-router'
import fluctuationsRouter from './fluctuations/index.js'
import productsRouter from './products/index.js'

const api = new Hono({
  router: new SmartRouter({
    routers: [new RegExpRouter(), new TrieRouter()],
  }),
})

api.use(
  '*',
  cors({
    origin: [process.env.CLIENT_DOMAIN as string],
    allowMethods:
      process.env.NODE_ENV !== 'develop' ? ['GET', 'POST'] : undefined,
  }),
)

api.route('products', productsRouter)
api.route('fluctuations', fluctuationsRouter)

export default api
