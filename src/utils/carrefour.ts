import htmlParser from 'node-html-parser'
import { getOnlyDateWithoutHours } from './date.js'

const fetchProductHtml = async (productLink: string) => {
  if (!productLink) {
    throw new Error('Request error, some params id missing.')
  }
  const response = await fetch(productLink ?? '')
  return await response.text()
}

const extractPriceCarrefour = (priceContainer: any) => {
  const priceWithoutDecimals = priceContainer
    .querySelectorAll('.valtech-carrefourar-product-price-0-x-currencyInteger')
    .map((elem: any) => elem.innerText)
    .join('')
  const priceDecimals = priceContainer.querySelector(
    '.valtech-carrefourar-product-price-0-x-currencyFraction',
  )?.innerText
  return parseFloat(priceWithoutDecimals?.concat('.', priceDecimals ?? ''))
}

const extractCategory = (parsed: any) => {
  return parsed.querySelector(
    'span.vtex-breadcrumb-1-x-arrow.vtex-breadcrumb-1-x-arrow--breadcrumb-products.vtex-breadcrumb-1-x-arrow--1.vtex-breadcrumb-1-x-arrow--breadcrumb-products--1.ph2.c-muted-2',
  )?.childNodes[1].innerText
}

const isAvailable = (parsed: any) => {
  const priceContainer = parsed.querySelector(
    'div.vtex-flex-layout-0-x-flexCol.vtex-flex-layout-0-x-flexCol--product-view-prices-container',
  )
  //priceContainer has two childs?
  const childPrices = {
    child1: priceContainer?.childNodes[0].childNodes.length,
    child2: priceContainer?.childNodes[1].childNodes.length,
  }
  if (childPrices.child1 === 0 && childPrices.child2 === 0) return false
  return true
}

const extractPromoPriceCarrefour = (parsed: any) => {
  // const sellingPriceContainer = parsed.querySelector('.vtex-flex-layout-0-x-flexColChild.vtex-flex-layout-0-x-flexColChild--product-view-prices-container.pb0');
  const priceWithoutDecimals = parsed
    .querySelectorAll('.valtech-carrefourar-product-price-0-x-currencyInteger')
    .map((elem: any) => elem.innerText)
    .join('')
  if (parsed) {
    // const sellingPriceWithoutDecimals = sellingPriceContainer.querySelector('.valtech-carrefourar-product-price-0-x-currencyInteger')?.innerText;
    const sellingPriceDecimals = parsed.querySelector(
      '.valtech-carrefourar-product-price-0-x-currencyFraction',
    )?.innerText
    return parseFloat(
      priceWithoutDecimals?.concat('.', sellingPriceDecimals ?? ''),
    )
  }
  return null
}

export const getProductDataCarrefour = async (productLink: string) => {
  try {
    const html = await fetchProductHtml(productLink)
    const parsed = htmlParser.parse(html)
    const available = isAvailable(parsed)

    if (!available)
      return {
        url: productLink,
        available: false,
      }

    const category = extractCategory(parsed)
    const title =
      parsed.querySelector('.vtex-store-components-3-x-productBrand')
        ?.innerText ?? ''
    const imageElement = parsed.querySelector(
      '.vtex-store-components-3-x-productImageTag.vtex-store-components-3-x-productImageTag--product-view-images-selector.vtex-store-components-3-x-productImageTag--main.vtex-store-components-3-x-productImageTag--product-view-images-selector--main',
    )
    const imageSrc = imageElement?.getAttribute('src') ?? ''

    const priceContainer =
      parsed.querySelector(
        '.vtex-flex-layout-0-x-flexCol.vtex-flex-layout-0-x-flexCol--product-view-prices-container',
      ) ??
      parsed.querySelector(
        'div.vtex-flex-layout-0-x-flexCol.vtex-flex-layout-0-x-flexCol--product-view-prices-container',
      )
    // Si el segundo child de este elemento esta vacio significa que no esta de promo el producto

    const hasPromotion = Boolean(priceContainer?.childNodes[1].innerText !== '')
    const realPrice = hasPromotion
      ? extractPriceCarrefour(priceContainer?.childNodes[1])
      : extractPriceCarrefour(priceContainer?.childNodes[0])
    const promoPrice = !hasPromotion
      ? realPrice
      : extractPromoPriceCarrefour(priceContainer?.childNodes[0])
    return {
      title,
      category,
      realPrice,
      promoPrice,
      imageUrl: imageSrc,
      date: getOnlyDateWithoutHours(),
      hasPromotion,
      url: productLink ?? '',
      available: true,
    }
  } catch (e: any) {
    console.error(e.message)
    return null
  }
}
