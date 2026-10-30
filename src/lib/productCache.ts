import { dataCache } from './resourceCache'
export const cacheProducts = (products: any[]) => products.forEach(cacheProduct)
export const cacheProduct = (product: any) => { if (product?.id) dataCache.set(`product:${product.id}`, product, 300_000) }
export const getCachedProduct = (id?: string | null): any => id ? dataCache.get(`product:${id}`) : null
export const cacheSizes = (id: string, sizes: string[], colorId?: string | null) => dataCache.set(`sizes:${id}:${colorId || 'all'}`, sizes, 30_000)
export const getCachedSizes = (id?: string | null, colorId?: string | null): string[] | null => id ? dataCache.get(`sizes:${id}:${colorId || 'all'}`) : null
