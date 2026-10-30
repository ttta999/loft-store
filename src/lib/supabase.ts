import { dataCache } from './resourceCache'
import { createDataFetch } from './dataFetch'
import { createClient } from '@supabase/supabase-js'
import { storeApi } from './api'
import { cacheProducts, cacheSizes } from './productCache'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: createDataFetch(() => dataCache.clear()) } })

// ========== ПОПУЛЯРНОСТЬ ==========
const popularityCache = {
  data: null as Record<string, number> | null,
  updatedAt: 0,
}
const POPULARITY_CACHE_TTL = 10 * 60 * 1000

export const fetchProductPopularity = async (force = false): Promise<Record<string, number>> => {
  const age = Date.now() - popularityCache.updatedAt
  if (!force && popularityCache.data && age < POPULARITY_CACHE_TTL) {
    return popularityCache.data
  }
  try {
    const { data, error } = await supabase.rpc('get_product_popularity')
    if (error) {
      console.error('❌ Ошибка получения популярности:', error)
      return popularityCache.data || {}
    }
    const map: Record<string, number> = {}
    for (const row of (data as any[]) || []) {
      map[row.product_id] = Number(row.sold_count) || 0
    }
    popularityCache.data = map
    popularityCache.updatedAt = Date.now()
    return map
  } catch (error) {
    console.error('❌ Ошибка запроса популярности:', error)
    return popularityCache.data || {}
  }
}

export const getProductSoldCount = async (productId: string): Promise<number> => {
  const map = await fetchProductPopularity()
  return map[productId] || 0
}

// ========== ТОВАРЫ ==========
export const getProducts = async (force = false) => {
  if (force) dataCache.invalidate('http:')
  return dataCache.load('catalog:products', async () => {
    const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (error) throw error
    cacheProducts(data || [])
    return data || []
  }, 60_000, force)
}
export const getCachedBrands = (): any[] | null => dataCache.get('catalog:brands')
export const getBrands = async (force = false): Promise<any[]> => {
  if (force) dataCache.invalidate('http:')
  return dataCache.load('catalog:brands', async () => {
    const { data, error } = await supabase.from('brands').select('*').eq('is_active', true).order('name')
    if (error) throw error
    return data || []
  }, 300_000, force)
}

// ✅ ЦВЕТА ТОВАРА
export interface ProductColor {
  id: string
  product_id: string
  name_ru: string
  name_uz: string | null
  hex_code: string | null
  images: string[]
  sort_order: number
}

export const getProductColors = (productId: string): Promise<ProductColor[]> =>
  dataCache.load(`colors:${productId}`, async () => {
    const { data, error } = await supabase.from('product_colors').select('*').eq('product_id', productId).order('sort_order', { ascending: true })
    if (error) throw error
    return (data || []) as ProductColor[]
  }, 60_000)
export const invalidateColorsCache = (productId: string) => {
  dataCache.invalidate(`colors:${productId}`)
  dataCache.invalidate('http:')
}

// ✅ Размеры: по товару + (опционально) цвету
export const getProductSizes = (productId: string, colorId?: string | null) =>
  dataCache.load(`variant-sizes:${productId}:${colorId || 'all'}`, async () => {
    let query = supabase.from('product_variants').select('size_value, color_id').eq('product_id', productId).gt('stock', 0)
    query = colorId ? query.eq('color_id', colorId) : query.is('color_id', null)
    const { data, error } = await query
    if (error) throw error
    const rows = data || []
    cacheSizes(productId, rows.map(v => v.size_value), colorId)
    return rows
  }, 30_000)

// ✅ Проверка стока с учётом цвета
export const checkProductStock = async (
  productId: string,
  size: string,
  quantity: number,
  colorId?: string | null
): Promise<{ available: boolean; error?: string }> => {
  let query = supabase
    .from('product_variants')
    .select('stock')
    .eq('product_id', productId)
    .eq('size_value', size)

  if (colorId) {
    query = query.eq('color_id', colorId)
  } else {
    query = query.is('color_id', null)
  }

  const { data: variant, error } = await query.single()

  if (error || !variant) {
    return { available: false, error: `К сожалению, этот вариант временно отсутствует` }
  }

  if ((variant.stock || 0) < quantity) {
    if (variant.stock === 0) {
      return { available: false, error: `Этот вариант закончился. Мы уже работаем над пополнением! 🙏` }
    } else {
      return { available: false, error: `Осталось только ${variant.stock} шт.` }
    }
  }

  return { available: true }
}

// ========== КАТЕГОРИИ ==========
export interface CategoryTree {
  id: string
  name_ru: string
  name_uz: string
  icon: string
  sort_order: number
  is_active: boolean
  subcategories: SubcategoryRow[]
}

export interface SubcategoryRow {
  id: string
  category_id: string
  name_ru: string
  name_uz: string
  size_type: string
  sizes: string[]
  sort_order: number
  is_active: boolean
  icon: string | null
}

export const getCategoriesTree = async (force = false): Promise<CategoryTree[] | null> => {
  if (force) dataCache.invalidate('http:')
  try {
    const [{ data: cats, error: catsErr }, { data: subs, error: subsErr }] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('subcategories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    ])
    if (catsErr || subsErr) {
      console.error('❌ Ошибка загрузки категорий:', catsErr || subsErr)
      return null
    }
    const subsByCategory = new Map<string, SubcategoryRow[]>()
    for (const s of (subs || []) as any[]) {
      const row: SubcategoryRow = {
        ...s,
        sizes: Array.isArray(s.sizes) ? s.sizes : [],
        icon: typeof s.icon === 'string' ? s.icon : null,
      }
      const list = subsByCategory.get(s.category_id) || []
      list.push(row)
      subsByCategory.set(s.category_id, list)
    }
    const allSub: SubcategoryRow = {
      id: 'all', category_id: '', name_ru: 'Все товары', name_uz: 'Barcha mahsulotlar',
      size_type: 'all', sizes: [], sort_order: -1, is_active: true, icon: 'all',
    }
    return ((cats || []) as any[]).map((c) => ({
      ...c,
      subcategories: [allSub, ...(subsByCategory.get(c.id) || [])],
    }))
  } catch (error) {
    console.error('❌ Ошибка getCategoriesTree:', error)
    return null
  }
}

// Customer data and mutations are served by the authenticated backend.
export const createOrder = async (orderData: any, requestKey: string) => {
  try { return await storeApi('createOrder', { order: orderData, requestKey }) }
  catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : 'Не удалось оформить заказ' } } }
}
export const createOrderFromSpecial = (requestId: string, orderData: any, requestKey: string) =>
  createOrder({ ...orderData, special_order_id: String(requestId) }, requestKey)
export const deleteUnpaidOrder = async (orderId: string): Promise<boolean> => {
  try { await storeApi('cancelOrder', { orderId, unpaidOnly: true }); return true } catch { return false }
}
