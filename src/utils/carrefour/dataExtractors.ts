export class JsonCarrefourReader {
  private jsonObject: Record<string, unknown>
  private linktext: string

  constructor(jsonData: string) {
    // Inicialización del objeto JSON
    this.jsonObject = JSON.parse(jsonData) as Record<string, unknown>
    this.linktext = Array.from(Object.entries(this.jsonObject))[0][0]
      .split(':')[1]
      .trim()
  }

  public getLinkText(): string {
    return this.linktext
  }

  public getProductName(): string | null {
    return this.getNonPrefixedProp<string>('productName')
  }

  public getBrandName(): string | null {
    return this.getNonPrefixedProp<string>('brand')
  }

  public getBarCode(): string | null {
    const bar = this.getNonPrefixedProp<string>('ean', 'items.0')
    if (!bar) return null
    return bar
  }

  public getImageUrl(): string | null {
    const images = this.getNonPrefixedProp<Array<Record<string, any>>>('images', 'items.0')
    const image = images![0] as Record<string, any>

    const imagePropId = image.id
    if (!imagePropId) return null

    const imageUrl = (this.jsonObject[imagePropId] as any).imageUrl
    if (!imageUrl) return null

    return imageUrl
  }

  public getPrice(): number | null {
    const price = this.getPrefixedProp<number>(
      'Price',
      'items.0.sellers.0.commertialOffer',
    )
    if (!price) return null

    if (this.hasDiscount().state && price === this.getPriceWithoutDiscount()) {
      const teasers = this.getPrefixedProp<Array<Record<string, any>>>(
        'teasers',
        'items.0.sellers.0.commertialOffer',
      )

      const discountTeaser = teasers![teasers!.length - 1]
      const teaserId = discountTeaser['id']

      const discountInfo = this.jsonObject[teaserId] as Record<
        string,
        any
      > | null
      if (discountInfo) {
        const discountName = discountInfo['name']
        const percentagePattern = /\b\d{1,3}(?:[.,]\d+)?\s?%/g
        const percentages = discountName
          .match(percentagePattern)
          .map((p: string) => {
            // Eliminar el símbolo % y reemplazar la coma por un punto
            const numeroStr = p.replace('%', '').replace(',', '.')
            // Convertir a número flotante
            return parseFloat(numeroStr)
          }) as number[]

        const discountPercentage = percentages[0]
        return price * ((100 - discountPercentage / 2) / 100)
      }
    }

    return price
  }

  public getPriceWithoutDiscount(): number | null {
    const price = this.getPrefixedProp<number>(
      'PriceWithoutDiscount',
      'items.0.sellers.0.commertialOffer',
    )

    if (!price) return null
    return price
  }

  public getCategory(): string | null {
    const categories =
      this.getNonPrefixedProp<Record<string, any>>('categories')
    if (!categories) return null

    const json: string[] = categories['json']
    if (!json) return null

    return json[json.length - 1]?.trim().replaceAll('/', '')
  }

  public isAvailable(): boolean {
    // TODO!: FOR NOW THIS IS CALCULATED BY DEFAULT WITH THE AMOUNT UNTIL WE CAN SOLVE THE PROBLEM
    const availableQuantity = this.getPrefixedProp<number>(
      'AvailableQuantity',
      'items.0.sellers.0.commertialOffer',
    )
    if (!availableQuantity) return false

    return availableQuantity > 0
  }

  public hasDiscount(): { state: boolean; minimumQuantity: number } {
    const price =
      this.getPrefixedProp<number>(
        'Price',
        'items.0.sellers.0.commertialOffer',
      ) ?? null
    const priceWithoutDiscount =
      this.getPrefixedProp<number>(
        'PriceWithoutDiscount',
        'items.0.sellers.0.commertialOffer',
      ) ?? null

    if (!price || !priceWithoutDiscount)
      return { state: false, minimumQuantity: 1 }

    if (price === priceWithoutDiscount) {
      // here we have a validation to know if has a different type of discount
      const teasers = this.getPrefixedProp<Array<Record<string, any>>>(
        'teasers',
        'items.0.sellers.0.commertialOffer',
      )

      const discountTeaser = teasers![teasers!.length - 1]
      const teaserConditionsId = (discountTeaser['id'] as string).concat(
        '.conditions',
      )
      const conditions = this.jsonObject[teaserConditionsId] as Record<
        string,
        any
      > | null
      let minimumQuantity = 1

      if (conditions) {
        minimumQuantity = conditions['minimumQuantity']
      }
      if (teasers && teasers.length > 1) {
        return { state: true, minimumQuantity }
      }
    }

    return { state: price < priceWithoutDiscount, minimumQuantity: 1 }
  }

  private getNonPrefixedProp<T>(
    nestedPath: string,
    complementaryPrimaryKey?: string,
  ): T | null {
    try {
      const steps = nestedPath.split('.')
      let base: any =
        this.jsonObject[
          `Product:${this.linktext}${
            complementaryPrimaryKey ? '.' + complementaryPrimaryKey : ''
          }`
        ]
      for (let i = 0; i < steps.length; i++) {
        base = base[steps[i]]
      }
      return base
    } catch (e: any) {
      return null
    }
  }

  private getPrefixedProp<T>(
    prop: string,
    complementaryPrimaryKey?: string,
  ): T | null {
    try {
      const steps = prop.split('.')
      let base: any =
        this.jsonObject[
          `$Product:${this.linktext}${
            complementaryPrimaryKey ? '.' + complementaryPrimaryKey : ''
          }`
        ]
      for (let i = 0; i < steps.length; i++) {
        base = base[steps[i]]
      }
      return base
    } catch (e: any) {
      return null
    }
  }
}
