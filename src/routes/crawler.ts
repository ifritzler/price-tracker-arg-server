import { Hono } from 'hono';
import fs from 'node:fs/promises';
import { Browser, Builder, By, until } from 'selenium-webdriver';
import { db } from '../database/prisma';
import { getProductDataCarrefour } from '../utils/carrefour';

const crawler = new Hono()

crawler.get('/carrefour', async (c) => {
    const category = c.req.query('c')
    if(!category){
        return c.json({
            message: 'No se encontro la categoria'
        })
    }
    let driver = await new Builder().forBrowser(Browser.FIREFOX).build()
    const links = []
    try {
        await driver.get(`https://www.carrefour.com.ar/${category}?page=1`)
        const totalPages = await driver.findElement(By.className('valtech-carrefourar-search-result-0-x-paginationButtonPages undefined mr3 flex justify-center')).getText()
        if(!totalPages) {
            return c.json({
                message: 'No hay productos suficientes en esta categoria'
            })
        }

        for (let i = 0; i < parseInt(totalPages); i++) {
            console.log('Pagina ' + (i + 1))
            await driver.get(`https://www.carrefour.com.ar/${category}?page=${i + 1}`)
            await driver.wait(until.elementsLocated(By.className('valtech-carrefourar-search-result-0-x-galleryItem valtech-carrefourar-search-result-0-x-galleryItem--normal pa4')), 50000)
            await driver.sleep(10000)
            // make scroll to the bottom of the page
            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);");
            await driver.sleep(1000)
            const elements = await driver.findElements(By.className('vtex-product-summary-2-x-clearLink vtex-product-summary-2-x-clearLink--contentProduct h-100 flex flex-column'))
            console.log(elements.length)
            console.log('Guardando urls')
            for await (const element of elements) {
                const url = await element.getAttribute("href");
                links.push(url)
                // write that into a json file
                await saveDataToFile('links-carrefour.json', { url: url })
            }
            console.log('Se finalizo la pagina ' + (i + 1))
        }
    } catch (e: any) {
        console.log(e.message)
    }
    finally {
        await driver.quit()
        return c.json({ links: links })
    }
})


async function saveDataToFile(filename: string, data: Record<string, any>) {
    try {
        // Leer el archivo existente (si existe)
        let existingData = [];
        try {
            const fileData = await fs.readFile(filename, 'utf8');
            existingData = JSON.parse(fileData);
        } catch (error) {
            // Si el archivo no existe o está vacío, no se hace nada
        }

        // Agregar el nuevo dato al array existente
        existingData.push(data);

        // Escribir los datos actualizados en el archivo
        await fs.writeFile(filename, JSON.stringify(existingData, null, 2));
        console.log(`Dato guardado en el archivo ${filename}`);
    } catch (error) {
        console.error(`Error al guardar datos en el archivo ${filename}:`, error);
    }
}


export default crawler