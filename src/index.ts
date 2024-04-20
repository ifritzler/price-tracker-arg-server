import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import api from './routes'
import crawler from './routes/crawler'

const app = new Hono()

app.get('/health', (c) => {
  return c.json({
    success: true
  })
})

app.route('/api', api)
app.route('/crawler', crawler)

const port = Number(process.env.PORT as unknown as number) || 3001
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
