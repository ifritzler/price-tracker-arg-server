import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import api from './routes/api'
import crawler from './routes/crawler'
import { createJobToUpdateProductsEachDay } from './schedule'

const app = new Hono()

app.use('*', logger())

app.route('api', api)
app.route('crawler', crawler)

const port = Number(process.env.PORT as unknown as number) || 3001
console.info(`Server is running on port ${port}`)

const updateJob = createJobToUpdateProductsEachDay();
updateJob.start();

serve({
  fetch: app.fetch,
  port
})
