import htmlParser from 'node-html-parser'
import { getOnlyDateWithoutHours } from './date.js'
import { JsonCarrefourReader } from './dataExtractors.js'

const fetchProductHtml = async (productLink: string) => {
  if (!productLink) {
    throw new Error('Request error, some params id missing.')
  }
  const response = await fetch(productLink ?? '')
  if (response.status === 404) throw new Error('El Producto ya no existe')
  return await response.text()
}

export const getProductDataCarrefour = async (productLink: string) => {
  try {
    const html = await fetchProductHtml(productLink)
    const parsed = htmlParser.parse(html)
    const template = parsed.querySelector(
      'template[data-type="json"][data-varname="__STATE__"]',
    )
    let accessor = null

    if (template) {
      const scriptTag = template.querySelector('script')
      if (scriptTag) {
        const jsonContent = scriptTag.text
        accessor = new JsonCarrefourReader(jsonContent)
      }
    }

    if(!accessor) return null

    const available = accessor.isAvailable()
    const category = accessor.getCategory();
    const title = accessor.getProductName();
    const imageUrl = accessor.getImageUrl();
    const realPrice = accessor.getPriceWithoutDiscount();
    const hasDiscount = accessor.hasDiscount().state;
    const discountPrice = accessor.getPrice();

    return {
      title,
      category,
      realPrice,
      discountPrice,
      imageUrl,
      date: getOnlyDateWithoutHours().toSQLDate()!,
      hasDiscount,
      url: productLink ?? '',
      available,
    }
  } catch (e: Error | unknown) {
    console.error((e as Error).message)
    return null
  }
}
