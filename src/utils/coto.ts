import htmlParser from 'node-html-parser';

const fetchProductHtml = async (productLink: string) => {
    if (!productLink) {
        throw new Error('Request error, some params id missing.');
    }
    const response = await fetch(productLink ?? '');
    return await response.text();
};

const extractPriceCoto = (priceContainer: any) => {
    const [integer, decimal] = priceContainer.innerText.split(',');
    const integerClean = integer.replace(/[^0-9]/g, '');
    const priceDecimals = decimal.replace(/[^0-9]/g, '');
    return parseFloat(integerClean?.concat('.', priceDecimals ?? ''));
};

const extractPromoPriceCoto = (parsed: any) => {
    const promoPrice = parsed.innerText;
    const integer = promoPrice.split('.')[0].replace('$', '');
    const decimal = promoPrice.split('.')[1];
    return parseFloat(integer?.concat('.', decimal ?? ''));
};

export const getProductDataCoto = async (productLink: string) => {
    const html = await fetchProductHtml(productLink);
    const parsed = htmlParser.parse(html);

    const title = parsed.querySelector('.product_page')?.innerText ?? '';
    const imageElement = parsed.querySelector('img.zoomImage1.img-responsive');
    const imageSrc = imageElement?.getAttribute('src') ?? '';

    let priceContainer = parsed.querySelector('.atg_store_productPrice>.atg_store_newPrice') || 
                        parsed.querySelector('span.price_regular_precio');
    let hasPromotion = Boolean(parsed.querySelector('span.price_discount') || parsed.querySelector('span.price_discount_gde'));

    const realPrice = extractPriceCoto(priceContainer);
    const promoPrice = hasPromotion ? extractPromoPriceCoto(parsed.querySelector('span.price_discount') || parsed.querySelector('span.price_discount_gde'))  : realPrice;

    return {
        pid: productLink,
        title,
        realPrice,
        promoPrice,
        imageUrl: imageSrc,
        date: new Date().toLocaleDateString(),
        hasPromotion,
        url: productLink ?? '',
    };
};

