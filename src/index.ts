import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import api from './routes/api'
import crawler from './routes/crawler'

const app = new Hono()

app.use('*', logger())
api.use('*', cors({ origin: ['http://localhost:3000', 'https://localhost:3000'] }));

app.route('/api', api)
app.route('/crawler', crawler)

const port = Number(process.env.PORT as unknown as number) || 3001
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
