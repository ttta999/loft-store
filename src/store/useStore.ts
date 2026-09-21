import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, fetchProductPopularity, getProducts } from '../lib/supabase'

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

interface CartItem {
  productId: string
  name: string
  priceUsd: number
  size: string
  quantity: number
  image: string
  isSpecialOrder?: boolean
  specialRequestId?: string
}

interface FavoriteItem {
  productId: string
  name: string
  priceUsd: number
  image: string
}

interface CachedProducts {
  items: any[]
  updatedAt: number
}

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
  popularityMap: Record<string, number> | null
  popularityUpdatedAt: number
  setLanguage: (lang: Language) => void
  setCurrency: (curr: Currency) => void
  setExchangeRate: (rate: number) => void
  setSaleModeEnabled: (enabled: boolean) => void
  setTheme: (theme: Theme) => void
  setTelegramUser: (user: TelegramUser | null) => void
  setProductsCache: (items: any[]) => void
  setPopularityMap: (map: Record<string, number>) => void
  getProductsCacheAge: () => number
  getPopularityAge: () => number
  getProductSoldCount: (productId: string) => number
  updateExchangeRate: () => Promise<void>
  updateSaleMode: () => Promise<void>
  updatePopularity: (force?: boolean) => Promise<void>
  // ✅ НОВОЕ: вернуть кеш если свежий, иначе тихо обновить в фоне
  ensureProducts: (maxAgeMs?: number) => any[] | null
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, size: string) => void
  clearCart: () => void
  getTotalPrice: () => number
  addToFavorites: (item: FavoriteItem) => void
  removeFromFavorites: (productId: string) => void
  isFavorite: (productId: string) => boolean
  setChatId: (id: string | null) => void
}

const fetchExchangeRateFromDB = async (): Promise<{ rate: number; version: number } | null> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'exchange_rate')
      .single()
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
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'sale_mode_enabled')
      .single()
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
      popularityMap: null,
      popularityUpdatedAt: 0,

      setLanguage: (lang) => set({ language: lang }),
      setCurrency: (curr) => set({ currency: curr }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
      setSaleModeEnabled: (enabled) => set({ saleModeEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
      setTelegramUser: (user) => set({ telegramUser: user }),
      setProductsCache: (items) =>
        set({ productsCache: { items, updatedAt: Date.now() } }),
      setPopularityMap: (map) =>
        set({ popularityMap: map, popularityUpdatedAt: Date.now() }),

      getProductsCacheAge: () => {
        const cache = get().productsCache
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
        const storedVersion = localStorage.getItem('exchangeRateVersion')
        if (!(storedVersion && Number(storedVersion) === version)) {
          set({ exchangeRate: rate })
          localStorage.setItem('exchangeRateVersion', version.toString())
        }
        localStorage.setItem('exchangeRateUpdatedAt', new Date().toISOString())
      },

      updateSaleMode: async () => {
        const enabled = await fetchSaleModeFromDB()
        if (enabled !== null && enabled !== get().saleModeEnabled) {
          set({ saleModeEnabled: enabled })
          console.log('🏷️ Режим скидок:', enabled ? 'ВКЛ' : 'ВЫКЛ')
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

      // ✅ НОВОЕ: обеспечивает данные без блокировки UI
      // Возвращает кеш синхронно (или null если его нет).
      // Если кеш устарел — запускает фоновое обновление (без setState loading=true).
      ensureProducts: (maxAgeMs = 5 * 60 * 1000) => {
        const state = get()
        const age = state.getProductsCacheAge()

        if (state.productsCache && age < maxAgeMs) {
          return state.productsCache.items
        }

        // Фоновое обновление — не блокирует UI
        getProducts()
          .then((data) => {
            if (data && data.length > 0) {
              get().setProductsCache(data)
            }
          })
          .catch((err) => {
            console.error('❌ ensureProducts background fetch failed:', err)
          })

        // Возвращаем текущий (пусть устаревший) кеш, если есть
        return state.productsCache?.items || null
      },

      addToCart: (item) =>
        set((state) => {
          if (item.isSpecialOrder) {
            return { cart: [...state.cart, item] }
          }
          if (item.quantity < 0) {
            return {
              cart: state.cart.map((i) =>
                i.productId === item.productId && i.size === item.size
                  ? { ...i, quantity: Math.max(1, i.quantity - 1) }
                  : i
              ),
            }
          }
          const existing = state.cart.find(
            (i) => i.productId === item.productId && i.size === item.size
          )
          if (existing) {
            return {
              cart: state.cart.map((i) =>
                i.productId === item.productId && i.size === item.size
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            }
          }
          return { cart: [...state.cart, item] }
        }),

      removeFromCart: (productId, size) =>
        set((state) => ({
          cart: state.cart.filter(
            (i) => !(i.productId === productId && i.size === size)
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
        set((state) => ({
          favorites: state.favorites.filter((i) => i.productId !== productId),
        })),
      isFavorite: (productId) => {
        const state = get()
        return state.favorites.some((i) => i.productId === productId)
      },
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
  // ✅ Pre-warm productsCache при старте приложения
  useStore.getState().ensureProducts()

  setInterval(() => {
    useStore.getState().updateExchangeRate()
    useStore.getState().updateSaleMode()
    useStore.getState().updatePopularity()
    useStore.getState().ensureProducts()
  }, 5 * 60 * 1000)

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      useStore.getState().updateExchangeRate()
      useStore.getState().updateSaleMode()
      useStore.getState().updatePopularity()
      useStore.getState().ensureProducts()
    }
  })
}