import { Hono } from 'hono'
import carrefour from './carrefour/index.js'
import vea from './vea/index.js'

const crawler = new Hono()

crawler.route('carrefour', carrefour)
crawler.route('vea', vea)

export default crawler
