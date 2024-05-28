import { Hono } from 'hono'
import fs from 'node:fs/promises'
import { Browser, Builder, By, until } from 'selenium-webdriver'
import { db } from '../../../database/postgres.js'
import { saveDataToFile } from '../../../utils/files.js'
import {
  categories,
  productDailyPrices,
  products,
  supermarkets,
} from '../../../database/schema.js'
import { eq } from 'drizzle-orm'
import { DateTime } from 'luxon'
import { STOP_INSERTIONS } from '../../../utils/constants.js'
import { TimeEstimator } from '../../../utils/date.js'
import { getProductDataVea } from '../../../utils/vea/vea.js'

const vea = new Hono()

vea.post('/new-links', async (c) => {
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
  await fs.writeFile('links-vea.json', '[]')
  try {
    await driver.get(`https://www.vea.com.ar/${category}?page=1`)
    const totalPagesContainer = await driver
      .findElement(
        By.className(
          'discoargentina-search-result-custom-1-x-span-selector-pages',
        ),
      )
      .getText()
    const totalPages = Number(totalPagesContainer.split('de ')[1])

    if (!totalPages) {
      return c.json({
        message: 'No hay productos suficientes en esta categoria',
      })
    }

    const time = new TimeEstimator(Number(totalPages))

    for (let i = 0; i < totalPages; i++) {
      time.startStep()
      await driver.get(`https://www.vea.com.ar/${category}?page=${i + 1}`)
      await driver.wait(
        until.elementsLocated(
          By.className(
            'vtex-search-result-3-x-galleryItem vtex-search-result-3-x-galleryItem--normal vtex-search-result-3-x-galleryItem--grid pa4',
          ),
        ),
        50000,
      )
      await driver.sleep(6000)
      // make scroll to the bottom of the page
      await driver.executeScript(
        'window.scrollTo(0, document.body.scrollHeight);',
      )
      await driver.sleep(1000)
      const elements = await driver.findElements(
        By.className(
          'vtex-product-summary-2-x-clearLink h-100 flex flex-column',
        ),
      )
      console.info(elements.length)
      console.info('Guardando urls')
      for await (const element of elements) {
        const url = await element.getAttribute('href')
        links.push(url)
        // write that into a json file
        await saveDataToFile('links-vea.json', { url: url })
      }
      time.endStep()
      time.logEstimatedRemainingTime()
    }
  } catch (e: any) {
    console.error(e.message)
  } finally {
    await driver.quit()
    c.status(201)
    c.json({ links: links })
  }
})

vea.post('/new-links/update', async (c) => {
  // Leer el archivo links.json
  const jsonData = await fs.readFile('links-vea.json', 'utf-8')

  const json = JSON.parse(jsonData)
  const links = json.map((element: { url: string }) => element.url)

  const batchSize = 20
  let contador = 1

  for (let i = 0; i < links.length; i += batchSize) {
    const batchLinks = links.slice(i, i + batchSize)

    const batchData: {
      title: string | null;
      category: string | null;
      realPrice: number | null;
      discountPrice: number | null;
      imageUrl: string | null;
      date: string;
      hasDiscount: number | null;
      url: string;
      available: boolean;
      minimunQuantity: number;
      ean: string | null;
  }[] | null = await Promise.all(
      batchLinks.map(async (link: string) => {
        try {
          return await getProductDataVea(link)
        } catch (error) {
          console.error(`Error fetching data for link ${link}:`, error)
          return null
        }
      }),
    )

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
          ean,
          minimunQuantity
        } = data

        if (
          !title ||
          !url ||
          !imageUrl ||
          !category ||
          !realPrice ||
          !discountPrice ||
          !ean ||
          !minimunQuantity
        ) {
          continue
        }

        const productExist = await db
          .select()
          .from(products)
          .where(eq(products.url, url))
          .limit(1)

        if (productExist.length === 0) {
          try {
            const supermarket = await db
              .select()
              .from(supermarkets)
              .where(eq(supermarkets.name, 'vea'))
              .limit(1)
            const cat = await db
              .select()
              .from(categories)
              .where(eq(categories.name, category))
              .limit(1)

            if (!supermarket.length || !cat.length) {
              continue
            }

            !STOP_INSERTIONS && await db.transaction(async (tsx) => {
              const product = await tsx
                .insert(products)
                .values({
                  title,
                  supermarketId: supermarket[0].id,
                  url,
                  imageUrl,
                  categoryId: cat[0].id,
                  ean
                })
                .returning({ id: products.id })

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
                  minimunQuantity
                })
                .returning()

              console.log('Realizada la inserción del producto ', id)
              return [product[0], dailyPrice[0]]
            })
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
              ean,
              minimunQuantity
            })
            continue
          }
        }
      }
    }
  }

  return c.json(links)
})

export default vea
