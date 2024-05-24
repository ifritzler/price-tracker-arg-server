import { Hono } from 'hono'
import fs from 'node:fs/promises'
import { Browser, Builder, By, until } from 'selenium-webdriver'
import { db } from '../../database/postgres.js'
import { getProductDataCarrefour } from '../../utils/carrefour.js'
import { saveDataToFile } from '../../utils/files.js'
import {
  categories,
  productDailyPrices,
  products,
  supermarkets,
} from '../../database/schema.js'
import { eq } from 'drizzle-orm'
import { DateTime } from 'luxon'
import { STOP_INSERTIONS } from '../../utils/constants.js'

const crawler = new Hono()

crawler.post('/carrefour/new-links', async (c) => {
  const category = c.req.query('c')
  if (!category) {
    c.status(400)
    return c.json({
      message: 'Ingrese una categoria',
    })
  }
  const driver = await new Builder().forBrowser(Browser.FIREFOX).build()
  const links = []
  // first we need to delete the content of links-carrefour.json
  await fs.writeFile('links-carrefour.json', '[]')
  try {
    await driver.get(`https://www.carrefour.com.ar/${category}?page=1`)
    const totalPages = await driver
      .findElement(
        By.className(
          'valtech-carrefourar-search-result-0-x-paginationButtonPages undefined mr3 flex justify-center',
        ),
      )
      .getText()
    if (!totalPages) {
      return c.json({
        message: 'No hay productos suficientes en esta categoria',
      })
    }

    for (let i = 0; i < parseInt(totalPages); i++) {
      console.info('Pagina ' + (i + 1))
      await driver.get(`https://www.carrefour.com.ar/${category}?page=${i + 1}`)
      await driver.wait(
        until.elementsLocated(
          By.className(
            'valtech-carrefourar-search-result-0-x-galleryItem valtech-carrefourar-search-result-0-x-galleryItem--normal pa4',
          ),
        ),
        50000,
      )
      await driver.sleep(10000)
      // make scroll to the bottom of the page
      await driver.executeScript(
        'window.scrollTo(0, document.body.scrollHeight);',
      )
      await driver.sleep(1000)
      const elements = await driver.findElements(
        By.className(
          'vtex-product-summary-2-x-clearLink vtex-product-summary-2-x-clearLink--contentProduct h-100 flex flex-column',
        ),
      )
      console.info(elements.length)
      console.info('Guardando urls')
      for await (const element of elements) {
        const url = await element.getAttribute('href')
        links.push(url)
        // write that into a json file
        await saveDataToFile('links-carrefour.json', { url: url })
      }
      console.info('Se finalizo la pagina ' + (i + 1))
    }
  } catch (e: any) {
    console.error(e.message)
  } finally {
    await driver.quit()
    c.status(201)
    c.json({ links: links })
  }
})

crawler.post('/carrefour/new-links/update', async (c) => {
  console.time('Total Execution Time')

  // Leer el archivo links.json
  console.time('Read File')
  const jsonData = await fs.readFile('links-carrefour.json', 'utf-8')
  console.timeEnd('Read File')

  const json = JSON.parse(jsonData)
  const links = json.map((element: { url: string }) => element.url)

  const batchSize = 20
  let contador = 1

  for (let i = 0; i < links.length; i += batchSize) {
    const batchLinks = links.slice(i, i + batchSize)

    console.time(`Fetch Batch ${i / batchSize}`)
    const batchData = await Promise.all(
      batchLinks.map(async (link: string) => {
        try {
          return await getProductDataCarrefour(link)
        } catch (error) {
          console.error(`Error fetching data for link ${link}:`, error)
          return null
        }
      }),
    )
    console.timeEnd(`Fetch Batch ${i / batchSize}`)

    for (const data of batchData) {
      if (data && data.available) {
        contador++
        const id = contador
        const {
          title,
          url,
          imageUrl,
          category,
          hasDiscount,
          realPrice,
          discountPrice,
        } = data

        if (
          !title ||
          !url ||
          !imageUrl ||
          !category ||
          !realPrice ||
          !discountPrice
        ) {
          continue
        }

        console.time(`Check Product Existence ${url}`)
        const productExist = await db
          .select()
          .from(products)
          .where(eq(products.url, url))
          .limit(1)
        console.timeEnd(`Check Product Existence ${url}`)

        if (productExist.length === 0) {
          try {
            console.time(`Fetch Supermarket and Category ${url}`)
            const supermarket = await db
              .select()
              .from(supermarkets)
              .where(eq(supermarkets.name, 'carrefour'))
              .limit(1)
            const cat = await db
              .select()
              .from(categories)
              .where(eq(categories.name, category))
              .limit(1)
            console.timeEnd(`Fetch Supermarket and Category ${url}`)

            if (!supermarket.length || !cat.length) {
              continue
            }

            console.time(`Transaction Execution ${url}`)
            !STOP_INSERTIONS && await db.transaction(async (tsx) => {
              console.time(`Insert Product ${url}`)
              const product = await tsx
                .insert(products)
                .values({
                  title,
                  supermarketId: supermarket[0].id,
                  url,
                  imageUrl,
                  categoryId: cat[0].id,
                })
                .returning({ id: products.id })
              console.timeEnd(`Insert Product ${url}`)

              console.time(`Insert Daily Price ${url}`)
              const dailyPrice = await tsx
                .insert(productDailyPrices)
                .values({
                  // @ts-expect-error Error expected but is ok
                  productId: product[0].id,
                  date: DateTime.now()
                    .setZone('America/Argentina/Buenos_Aires')
                    .toSQLDate(),
                  diffPercentage: 0.0,
                  discountPrice: discountPrice,
                  hasDiscount: hasDiscount,
                  price: realPrice,
                })
                .returning()
              console.timeEnd(`Insert Daily Price ${url}`)

              console.log('Realizada la inserción del producto ', id)
              return [product[0], dailyPrice[0]]
            })
            console.timeEnd(`Transaction Execution ${url}`)
          } catch (e: unknown) {
            console.error(`Error en getProductData (${url}):`, e)
            console.info(data)
            console.info({
              title,
              url,
              imageUrl,
              category,
              hasDiscount,
              realPrice,
              discountPrice,
            })
            continue
          }
        }
      }
    }
  }

  console.timeEnd('Total Execution Time')
  return c.json(links)
})

export default crawler
