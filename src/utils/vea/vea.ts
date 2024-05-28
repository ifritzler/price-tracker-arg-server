import htmlParser from 'node-html-parser'
import { getOnlyDateWithoutHours } from '../date.js'
import { JsonVeaReader } from './dataExtractors.js'

const fetchProductHtml = async (productLink: string) => {
  if (!productLink) {
    throw new Error('Request error, some params id missing.')
  }
  const response = await fetch(productLink ?? '')
  if (response.status === 404) throw new Error('El Producto ya no existe')
  return await response.text()
}

const fetchProductData = async (sku: string) => {
  const response = await fetch(
    'https://www.vea.com.ar/api/catalog_system/pub/products/search?fq=skuId:' +
      sku,
  )
  const data = await response.json()
  return data
}

export const getProductDataVea = async (productLink: string) => {
  try {
    const html = await fetchProductHtml(productLink)
    const parsed = htmlParser.parse(html)
    const scriptTag = parsed.querySelector('script[type="application/ld+json"]')
    let accessor = null

    if (scriptTag) {
      const jsonContent = scriptTag.text
      const json = JSON.parse(jsonContent) as Record<string, any>
      const skuId: string = json.sku

      const data = await fetchProductData(skuId)
      accessor = new JsonVeaReader(data)
    }

    if (!accessor) return null

    const available = accessor.isAvailable()
    const category = accessor.getCategory()
    const title = accessor.getProductName()
    const imageUrl = accessor.getImageUrl()
    let price = accessor.getPriceWithoutDiscount()
    const discountPrice = accessor.getPrice()
    let hasDiscount = false

    if (price === discountPrice) {
      const discountInfo = await accessor.hasDiscount()
      hasDiscount = discountInfo.state
      price = discountInfo.price
    }

    const minimunQuantity = 1
    const ean = accessor.getBarCode()

    return {
      title,
      category,
      realPrice: price,
      discountPrice,
      imageUrl,
      date: getOnlyDateWithoutHours().toSQLDate()!,
      hasDiscount,
      url: productLink ?? '',
      available,
      minimunQuantity,
      ean,
    }
  } catch (e: Error | unknown) {
    console.error((e as Error).message)
    return null
  }
}
