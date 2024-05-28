export class JsonVeaReader {
  private jsonObject: Record<string, unknown>
  private linktext: string

  constructor(jsonData: Record<string, any>) {
    // Inicialización del objeto JSON
    this.jsonObject = jsonData[0] as Record<string, any>
    this.linktext = this.jsonObject.linkText as string
  }

  public getLinkText(): string {
    return this.linktext
  }

  public getProductName(): string | null {
    return (this.jsonObject.productName as string) ?? null
  }

  public getBrandName(): string | null {
    return (this.jsonObject.brand as string) ?? null
  }

  public getBarCode(): string | null {
    const items = this.jsonObject.items as Array<Record<string, any>>
    const item = items[0]
    const ean = (item.ean as string) ?? null
    return ean
  }

  public getImageUrl(): string | null {
    const items = this.jsonObject.items as Array<Record<string, any>>
    const item = items[0]
    const images = item.images as Array<Record<string, any>>
    const image = images[0]
    const imageUrl = image.imageUrl as string
    return imageUrl ?? null
  }

  public getPrice(): number | null {
    const items = this.jsonObject.items as Array<Record<string, any>>
    const item = items[0]
    const seller = item.sellers[0]
    const commertialOffer = seller.commertialOffer

    const price = commertialOffer.Price

    if (!price) return null
    return price
  }

  public getPriceWithoutDiscount(): number | null {
    const items = this.jsonObject.items as Array<Record<string, any>>
    const item = items[0]
    const seller = item.sellers[0]
    const commertialOffer = seller.commertialOffer

    const price = commertialOffer.PriceWithoutDiscount

    if (!price) return null
    return price
  }

  public getCategory(): string | null {
    const categories = this.jsonObject.categories as string[]

    return categories[categories.length - 1]?.trim().replaceAll('/', '')
  }

  public isAvailable(): boolean {
    // TODO!: FOR NOW THIS IS CALCULATED BY DEFAULT WITH THE AMOUNT UNTIL WE CAN SOLVE THE PROBLEM
    const items = this.jsonObject.items as Array<Record<string, any>>
    const item = items[0]
    const seller = item.sellers[0]
    const commertialOffer = seller.commertialOffer
    const IsAvailable = commertialOffer.IsAvailable as boolean

    return IsAvailable
  }

  public async hasDiscount(): Promise<{
    state: boolean
    minimumQuantity: number
    price: number
    priceWithoutDiscount: number
  }> {
    const items = this.jsonObject.items as Array<Record<string, any>>
    const item = items[0]
    const skuId = (item.itemId as number) ?? null

    const seller = item.sellers[0]
    const commertialOffer = seller.commertialOffer

    const price = commertialOffer.Price
    const priceWithoutDiscount = commertialOffer.PriceWithoutDiscount

    if (!price || !priceWithoutDiscount)
      return {
        state: false,
        minimumQuantity: 1,
        price: price,
        priceWithoutDiscount: priceWithoutDiscount,
      }

    if (price === priceWithoutDiscount) {
      // here we have a validation to know if has a different type of discount
      const minimumQuantity = 1
      const discountValue = await this.getDiscountValue(
        skuId,
        priceWithoutDiscount,
      )

      if (discountValue > 0) {
        return {
          state: true,
          minimumQuantity,
          price: price - Math.abs(discountValue),
          priceWithoutDiscount,
        }
      }
    }

    return {
      state: price < priceWithoutDiscount,
      minimumQuantity: 1,
      price,
      priceWithoutDiscount,
    }
  }

  private async getDiscountValue(
    skuId: number,
    targetPrice: number,
  ): Promise<number> {
    const payload = {
      data: {
        orderFormId: '1',
        salesChannel: '1',
        items: [
          {
            id: '1',
            sku: skuId,
            ean: '1',
            refId: '1',
            unitMultiplier: 1,
            measurementUnit: 'UN',
            targetPrice: targetPrice,
            itemPrice: 0,
            quantity: 1,
            discountPrice: 0,
            dockId: 'M_001',
            freightPrice: 0,
            brandId: '1',
            providerCode: '0',
            description: 'ProductDescriptionExample',
          },
        ],
        paymentInformation: {
          payMode: 'CASH',
          amount: 1,
          cardSubtender: '1',
          installments: 0,
          value: '0',
        },
        localId: '1',
        clientEmail: 'x@gmail.com',
        clientData: {
          email: 'x@gmail.com',
          document: '1111111',
          corporateDocument: null,
          stateInscription: null,
        },
        shippingDestination: {
          country: 'Argentina',
          postalCode: null,
        },
        serviceId: 1,
        totals: [
          {
            id: 'Items',
            name: 'Total de los items',
            value: 0,
          },
        ],
      },
    }

    const request = await fetch('https://www.vea.com.ar/_v/tndCenco', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await request.json()
    const value = response[0]?.taxes[0]?.value ?? 0
    return value
  }
}
