import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  supabase,
  fetchProductPopularity,
  getProducts,
  getCategoriesTree,
  type CategoryTree,
} from '../lib/supabase'

type Currency = 'USD' | 'UZS'
type Language = 'ru' | 'uz'
type Theme = 'light' | 'dark' | 'system'

interface TelegramUser {
  id: string
  firstName: string
  lastName: string
  username: string
  photoUrl: string
  languageCode: string
}

// ✅ CartItem с поддержкой цвета
export interface CartItem {
  productId: string
  name: string
  priceUsd: number
  size: string
  quantity: number
  image: string
  colorId?: string | null
  colorName?: string | null
  isSpecialOrder?: boolean
  specialRequestId?: string
}

interface FavoriteItem {
  productId: string
  name: string
  priceUsd: number
  image: string
}

interface CachedProducts { items: any[]; updatedAt: number }
interface CachedCategories { items: CategoryTree[]; updatedAt: number }

interface AppState {
  language: Language
  currency: Currency
  exchangeRate: number
  saleModeEnabled: boolean
  theme: Theme
  cart: CartItem[]
  favorites: FavoriteItem[]
  chatId: string | null
  telegramUser: TelegramUser | null
  productsCache: CachedProducts | null
  categoriesCache: CachedCategories | null
  popularityMap: Record<string, number> | null
  popularityUpdatedAt: number
  setLanguage: (lang: Language) => void
  setCurrency: (curr: Currency) => void
  setExchangeRate: (rate: number) => void
  setSaleModeEnabled: (enabled: boolean) => void
  setTheme: (theme: Theme) => void
  setTelegramUser: (user: TelegramUser | null) => void
  setProductsCache: (items: any[]) => void
  setCategoriesCache: (items: CategoryTree[]) => void
  setPopularityMap: (map: Record<string, number>) => void
  getProductsCacheAge: () => number
  getCategoriesCacheAge: () => number
  getPopularityAge: () => number
  getProductSoldCount: (productId: string) => number
  updateExchangeRate: () => Promise<void>
  refreshCheckout: () => Promise<{ deliveryPriceUzs: number; freeDeliveryThresholdUzs: number }>
  updateSaleMode: () => Promise<void>
  updatePopularity: (force?: boolean) => Promise<void>
  ensureProducts: (maxAgeMs?: number) => any[] | null
  ensureCategories: (maxAgeMs?: number) => CategoryTree[] | null
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, size: string, colorId?: string | null) => void
  clearCart: () => void
  getTotalPrice: () => number
  addToFavorites: (item: FavoriteItem) => void
  removeFromFavorites: (productId: string) => void
  isFavorite: (productId: string) => boolean
  setChatId: (id: string | null) => void
}

const fetchExchangeRateFromDB = async (): Promise<{ rate: number; version: number } | null> => {
  try {
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single()
    if (error || !data) return null
    const rate = (data.value as any)?.rate
    const version = (data.value as any)?.version || 0
    if (!rate || rate <= 0) return null
    return { rate, version }
  } catch (error) {
    console.error('❌ Ошибка получения курса из БД:', error)
    return null
  }
}

const fetchSaleModeFromDB = async (): Promise<boolean | null> => {
  try {
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'sale_mode_enabled').single()
    if (error || !data) return null
    return Boolean((data.value as any)?.enabled)
  } catch (error) {
    console.error('❌ Ошибка получения режима скидок:', error)
    return null
  }
}

const fetchExchangeRateFromAPI = async (): Promise<number> => {
  try {
    const response = await fetch('/api/getExchangeRate')
    if (!response.ok) throw new Error(`API returned ${response.status}`)
    const data = await response.json()
    return data.rate
  } catch (error) {
    console.error('❌ Ошибка получения курса через API:', error)
    return 12100
  }
}

export const isProductOnSale = (product: any, saleModeEnabled: boolean): boolean =>
  Boolean(saleModeEnabled && product && product.sale_price != null && Number(product.sale_price) > 0)

export const getEffectivePriceUsd = (product: any, saleModeEnabled: boolean): number =>
  isProductOnSale(product, saleModeEnabled) ? Number(product.sale_price) : (product?.price_usd || 0)
// ✅ Фильтрация товаров: показываем только товары АКТИВНЫХ категорий и подкатегорий.
// categories === null → категории ещё не загрузились → не фильтруем (чтобы не мигать пустотой).
// categories === [] → все категории отключены → скрываем все товары.
export const filterVisibleProducts = (items: any[], categories: CategoryTree[] | null): any[] => {
  if (!Array.isArray(items) || items.length === 0) return items || []
  if (categories === null) return items
  const catIds = new Set(categories.map((c) => c.id))
  const subIds = new Set(
    categories.flatMap((c) => c.subcategories.filter((s) => s.id !== 'all').map((s) => s.id))
  )
  return items.filter((p) => {
    if (!p || !catIds.has(p.category)) return false
    if (p.subcategory && !subIds.has(p.subcategory)) return false
    return true
  })
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: 'ru',
      currency: 'UZS',
      exchangeRate: 12100,
      saleModeEnabled: false,
      theme: 'system',
      cart: [],
      favorites: [],
      chatId: null,
      telegramUser: null,
      productsCache: null,
      categoriesCache: null,
      popularityMap: null,
      popularityUpdatedAt: 0,

      setLanguage: (lang) => set({ language: lang }),
      setCurrency: (curr) => set({ currency: curr }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
      setSaleModeEnabled: (enabled) => set({ saleModeEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
      setTelegramUser: (user) => set({ telegramUser: user }),
      setProductsCache: (items) => set({ productsCache: { items, updatedAt: Date.now() } }),
      setCategoriesCache: (items) => set({ categoriesCache: { items, updatedAt: Date.now() } }),
      setPopularityMap: (map) => set({ popularityMap: map, popularityUpdatedAt: Date.now() }),

      getProductsCacheAge: () => {
        const cache = get().productsCache
        if (!cache) return Infinity
        return Date.now() - cache.updatedAt
      },
      getCategoriesCacheAge: () => {
        const cache = get().categoriesCache
        if (!cache) return Infinity
        return Date.now() - cache.updatedAt
      },
      getPopularityAge: () => Date.now() - (get().popularityUpdatedAt || 0),
      getProductSoldCount: (productId) => get().popularityMap?.[productId] || 0,

      updateExchangeRate: async () => {
        const dbData = await fetchExchangeRateFromDB()
        if (!dbData) {
          const fallbackRate = await fetchExchangeRateFromAPI()
          set({ exchangeRate: fallbackRate })
          localStorage.setItem('exchangeRateUpdatedAt', new Date().toISOString())
          return
        }
        const { rate, version } = dbData
        // The saved version survives reloads; the in-memory rate does not.
        // Always hydrate the current rate, even when the version is unchanged.
        set({ exchangeRate: rate })
        localStorage.setItem('exchangeRateVersion', version.toString())
        localStorage.setItem('exchangeRateUpdatedAt', new Date().toISOString())
      },

      refreshCheckout: async () => {
        const [{ data: rows, error }, products] = await Promise.all([
          supabase.from('settings').select('key, value').in('key', ['exchange_rate', 'sale_mode_enabled', 'delivery_price', 'free_delivery_threshold']),
          getProducts(),
        ])
        if (error || !rows) throw new Error('Не удалось обновить корзину. Попробуйте ещё раз.')
        const settings = Object.fromEntries(rows.map(row => [row.key, row.value]))
        const rate = Number(settings.exchange_rate?.rate)
        if (!Number.isFinite(rate) || rate <= 0) throw new Error('Не удалось получить курс магазина. Попробуйте ещё раз.')
        const sale = settings.sale_mode_enabled?.enabled === true
        const cart = get().cart.map(item => {
          if (item.isSpecialOrder) return item
          const product = products.find(product => product.id === item.productId)
          if (!product) throw new Error('Товар больше недоступен. Удалите его из корзины.')
          return { ...item, priceUsd: Number(getEffectivePriceUsd(product, sale)) }
        })
        set({ exchangeRate: rate, saleModeEnabled: sale, cart, productsCache: { items: products, updatedAt: Date.now() } })
        return {
          deliveryPriceUzs: Math.max(0, Number(settings.delivery_price?.price) || 0),
          freeDeliveryThresholdUzs: Math.max(0, Number(settings.free_delivery_threshold?.amount) || 0),
        }
      },

      updateSaleMode: async () => {
        const enabled = await fetchSaleModeFromDB()
        if (enabled !== null && enabled !== get().saleModeEnabled) {
          set({ saleModeEnabled: enabled })
        }
      },

      updatePopularity: async (force = false) => {
        try {
          const map = await fetchProductPopularity(force)
          set({ popularityMap: map, popularityUpdatedAt: Date.now() })
        } catch (error) {
          console.error('❌ Ошибка updatePopularity:', error)
        }
      },

      ensureProducts: (maxAgeMs = 5 * 60 * 1000) => {
        const state = get()
        const age = state.getProductsCacheAge()
        if (state.productsCache && age < maxAgeMs) return state.productsCache.items
        getProducts()
          .then((data) => { if (data && data.length > 0) get().setProductsCache(data) })
          .catch((err) => { console.error('❌ ensureProducts failed:', err) })
        return state.productsCache?.items || null
      },

      ensureCategories: (maxAgeMs = 5 * 60 * 1000) => {
        const state = get()
        const age = state.getCategoriesCacheAge()
        if (state.categoriesCache && age < maxAgeMs) return state.categoriesCache.items
        getCategoriesTree()
          .then((tree) => { if (tree !== null) get().setCategoriesCache(tree) })
          .catch((err) => { console.error('❌ ensureCategories failed:', err) })
        return state.categoriesCache?.items || null
      },

      // ✅ addToCart: уникальность = productId + size + colorId
      addToCart: (item) =>
        set((state) => {
          if (item.isSpecialOrder) return { cart: [...state.cart, item] }
          if (item.quantity < 0) {
            return {
              cart: state.cart.map((i) =>
                i.productId === item.productId &&
                i.size === item.size &&
                (i.colorId || null) === (item.colorId || null)
                  ? { ...i, quantity: Math.max(1, i.quantity - 1) }
                  : i
              ),
            }
          }
          const existing = state.cart.find(
            (i) =>
              i.productId === item.productId &&
              i.size === item.size &&
              (i.colorId || null) === (item.colorId || null)
          )
          if (existing) {
            return {
              cart: state.cart.map((i) =>
                i.productId === item.productId &&
                i.size === item.size &&
                (i.colorId || null) === (item.colorId || null)
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            }
          }
          return { cart: [...state.cart, item] }
        }),

      // ✅ removeFromCart: с учётом цвета
      removeFromCart: (productId, size, colorId) =>
        set((state) => ({
          cart: state.cart.filter(
            (i) => !(i.productId === productId && i.size === size && (i.colorId || null) === (colorId || null))
          ),
        })),

      clearCart: () => set({ cart: [] }),
      getTotalPrice: () => {
        const state = get()
        return state.cart.reduce((sum, item) => sum + item.priceUsd * item.quantity, 0)
      },

      addToFavorites: (item) =>
        set((state) => {
          const exists = state.favorites.find((i) => i.productId === item.productId)
          if (exists) return state
          return { favorites: [...state.favorites, item] }
        }),
      removeFromFavorites: (productId) =>
        set((state) => ({ favorites: state.favorites.filter((i) => i.productId !== productId) })),
      isFavorite: (productId) => get().favorites.some((i) => i.productId === productId),
      setChatId: (id) => set({ chatId: id }),
    }),
    {
      name: 'loft-store',
      partialize: (state) => ({
        language: state.language,
        currency: state.currency,
        theme: state.theme,
        cart: state.cart,
        favorites: state.favorites,
        productsCache: state.productsCache,
        categoriesCache: state.categoriesCache,
        popularityMap: state.popularityMap,
        popularityUpdatedAt: state.popularityUpdatedAt,
      }),
    }
  )
)

if (typeof window !== 'undefined') {
  useStore.getState().updateExchangeRate()
  useStore.getState().updateSaleMode()
  useStore.getState().updatePopularity()
  useStore.getState().ensureProducts()
  useStore.getState().ensureCategories(0)

  setInterval(() => {
    useStore.getState().updateExchangeRate()
    useStore.getState().updateSaleMode()
    useStore.getState().updatePopularity()
    useStore.getState().ensureProducts()
    useStore.getState().ensureCategories()
  }, 5 * 60 * 1000)

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      useStore.getState().updateExchangeRate()
      useStore.getState().updateSaleMode()
      useStore.getState().updatePopularity()
      useStore.getState().ensureProducts()
      useStore.getState().ensureCategories(0)
    }
  })
}