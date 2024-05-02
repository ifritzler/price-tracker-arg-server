import { Hono } from 'hono';
import fs from 'node:fs/promises';
import { Browser, Builder, By, until } from 'selenium-webdriver';
import { db } from '../../database/prisma';
import { getProductDataCarrefour } from '../../utils/carrefour';
import { getOnlyDateWithoutHours } from '../../utils/date';
import { saveDataToFile } from '../../utils/files';

const crawler = new Hono()

crawler.post('/carrefour/new-links', async (c) => {
    const category = c.req.query('c')
    if (!category) {
        c.status(400)
        return c.json({
            message: 'Ingrese una categoria'
        })
    }
    let driver = await new Builder().forBrowser(Browser.FIREFOX).build()
    const links = []
    // first we need to delete the content of links-carrefour.json
    await fs.writeFile('links-carrefour.json', '[]')
    try {
        await driver.get(`https://www.carrefour.com.ar/${category}?page=1`)
        const totalPages = await driver.findElement(By.className('valtech-carrefourar-search-result-0-x-paginationButtonPages undefined mr3 flex justify-center')).getText()
        if (!totalPages) {
            return c.json({
                message: 'No hay productos suficientes en esta categoria'
            })
        }

        for (let i = 0; i < parseInt(totalPages); i++) {
            console.info('Pagina ' + (i + 1))
            await driver.get(`https://www.carrefour.com.ar/${category}?page=${i + 1}`)
            await driver.wait(until.elementsLocated(By.className('valtech-carrefourar-search-result-0-x-galleryItem valtech-carrefourar-search-result-0-x-galleryItem--normal pa4')), 50000)
            await driver.sleep(10000)
            // make scroll to the bottom of the page
            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);");
            await driver.sleep(1000)
            const elements = await driver.findElements(By.className('vtex-product-summary-2-x-clearLink vtex-product-summary-2-x-clearLink--contentProduct h-100 flex flex-column'))
            console.info(elements.length)
            console.info('Guardando urls')
            for await (const element of elements) {
                const url = await element.getAttribute("href");
                links.push(url)
                // write that into a json file
                await saveDataToFile('links-carrefour.json', { url: url })
            }
            console.info('Se finalizo la pagina ' + (i + 1))
        }
    } catch (e: any) {
        console.error(e.message)
    }
    finally {
        await driver.quit()
        c.status(201)
        return c.json({ links: links })
    }
})

crawler.post('/carrefour/new-links/update', async (c) => {
    // First, read the links.json file
    const jsonData = await fs.readFile('links-carrefour.json', 'utf-8');
    const json = JSON.parse(jsonData);

    const links = json.map((element: any) => element.url);

    const batchSize = 10;
    let contador = 1;

    for (let i = 0; i < links.length; i += batchSize) {
        const batchLinks = links.slice(i, i + batchSize);

        await Promise.all(batchLinks.map(async (link: string) => {
            const data = await getProductDataCarrefour(link);
            console.info(`Cargando el producto n `, contador++);

            if (data && data.available) {
                const { title, url, imageUrl, category, hasPromotion, realPrice, promoPrice } = data;
                if (!title || !url || !imageUrl || !category || !realPrice || !promoPrice) return null

                const productExist = await db.product.findFirst({ where: { url: url } });

                if (!productExist) {
                    try {
                        const supermarket = await db.supermarket.findFirst({ where: { name: 'carrefour' } })
                        const cat = await db.category.findFirst({ where: { name: category } })
                        if (!supermarket) return null
                        if (!cat) return null
                        await db.$transaction(async (tsx) => {
                            const product = await tsx.product.create({
                                data: {
                                    title,
                                    supermarketId: supermarket.id,
                                    url,
                                    imageUrl,
                                    categoryId: cat.id,
                                }
                            })
                            const dailyPrice = await tsx.productDailyPrice.create({
                                data: {
                                    productId: product.id,
                                    hasPromotion: Boolean(hasPromotion),
                                    price: realPrice,
                                    promoPrice: promoPrice,
                                    date: getOnlyDateWithoutHours()
                                }
                            })
                            return [product, dailyPrice]
                        });

                    } catch (e: any) {
                        console.error(`Error en getProductData (${url}):`, e);
                        console.info(data)
                        console.info({ title, url, imageUrl, category, hasPromotion, realPrice, promoPrice })
                        return null;
                    }
                }
            }
        }));
    }

    return c.json(links);
});

export default crawler
