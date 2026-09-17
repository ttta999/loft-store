const productById: Record<string, any> = {}
const sizesByProduct: Record<string, string[]> = {}

export const cacheProducts = (items: any[] | null | undefined) => {
  if (!Array.isArray(items)) return
  for (const p of items) {
    if (p && p.id != null) {
      productById[String(p.id)] = p
    }
  }
}

export const cacheProduct = (product: any) => {
  if (product && product.id != null) {
    productById[String(product.id)] = product
  }
}

export const getCachedProduct = (id: string | number | undefined | null): any | null => {
  if (id == null) return null
  return productById[String(id)] || null
}

export const cacheSizes = (id: string | number, sizes: string[]) => {
  sizesByProduct[String(id)] = sizes
}

export const getCachedSizes = (id: string | number | undefined | null): string[] | null => {
  if (id == null) return null
  return sizesByProduct[String(id)] || null
}