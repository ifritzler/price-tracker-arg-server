import htmlParser from 'node-html-parser'
import { getOnlyDateWithoutHours } from './date.js'

const fetchProductHtml = async (productLink: string) => {
  if (!productLink) {
    throw new Error('Request error, some params id missing.')
  }
  const response = await fetch(productLink ?? '')
  return await response.text()
}

const extractPriceCoto = (priceContainer: any) => {
  const [integer, decimal] = priceContainer.innerText.split(',')
  const integerClean = integer.replace(/[^0-9]/g, '')
  const priceDecimals = decimal.replace(/[^0-9]/g, '')
  return parseFloat(integerClean?.concat('.', priceDecimals ?? ''))
}

const isAvailable = (html: string) => {
  const isAvailable = !html.toLowerCase().includes('no disponible')
  return isAvailable
}

const extractdiscountPriceCoto = (parsed: any) => {
  const discountPrice = parsed.innerText
  const integer = discountPrice.split('.')[0].replace('$', '')
  const decimal = discountPrice.split('.')[1]
  return parseFloat(integer?.concat('.', decimal ?? ''))
}

export const getProductDataCoto = async (productLink: string) => {
  const html = await fetchProductHtml(productLink)
  const available = isAvailable(html)
  if (!available)
    return {
      pid: productLink,
      available: false,
    }

  const parsed = htmlParser.parse(html)

  const title = parsed?.querySelector('.product_page')?.innerText ?? ''
  const imageElement = parsed?.querySelector('img.zoomImage1.img-responsive')
  const imageSrc = imageElement?.getAttribute('src') ?? ''

  const priceContainer =
    parsed?.querySelector('.atg_store_productPrice>.atg_store_newPrice') ||
    parsed?.querySelector('span.price_regular_precio')
  const hasDiscount = Boolean(
    parsed?.querySelector('span.price_discount') ||
      parsed?.querySelector('span.price_discount_gde'),
  )

  const realPrice = extractPriceCoto(priceContainer)
  const discountPrice = hasDiscount
    ? extractdiscountPriceCoto(
        parsed?.querySelector('span.price_discount') ||
          parsed?.querySelector('span.price_discount_gde'),
      )
    : realPrice

  return {
    title,
    realPrice,
    discountPrice,
    imageUrl: imageSrc,
    date: getOnlyDateWithoutHours(),
    hasDiscount,
    url: productLink ?? '',
    available: true,
  }
}
