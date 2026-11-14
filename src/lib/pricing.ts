export const isProductOnSale = (product: any, saleModeEnabled: boolean): boolean =>
  Boolean(saleModeEnabled && product && product.sale_price != null && Number(product.sale_price) > 0)

export const getEffectivePriceUsd = (product: any, saleModeEnabled: boolean): number =>
  isProductOnSale(product, saleModeEnabled) ? Number(product.sale_price) : (product?.price_usd || 0)
