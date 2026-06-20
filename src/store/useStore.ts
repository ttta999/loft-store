import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Currency = 'USD' | 'UZS'
type Language = 'ru' | 'uz'

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

interface AppState {
  language: Language
  currency: Currency
  exchangeRate: number
  cart: CartItem[]
  favorites: FavoriteItem[]
  chatId: string | null
  setLanguage: (lang: Language) => void
  setCurrency: (curr: Currency) => void
  setExchangeRate: (rate: number) => void
  updateExchangeRate: () => Promise<void>
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, size: string) => void
  clearCart: () => void
  getTotalPrice: () => number
  addToFavorites: (item: FavoriteItem) => void
  removeFromFavorites: (productId: string) => void
  isFavorite: (productId: string) => boolean
  setChatId: (id: string | null) => void
}

// ✅ Функция получения курса валют с CBU.uz
const fetchExchangeRateFromCBU = async (): Promise<number> => {
  try {
    // Вариант 1: Используем API Центрального Банка Узбекистана
    // CBU предоставляет курсы в формате JSON
    const response = await fetch('https://cbu.uz/ru/currency/rates/')
    
    // Если страница HTML, парсим её
    const html = await response.text()
    
    // Ищем курс USD в HTML (пример: 1 USD = 12058.45)
    const usdMatch = html.match(/1\s*USD\s*=\s*([\d\s.,]+)/i)
    if (usdMatch && usdMatch[1]) {
      const rate = parseFloat(usdMatch[1].replace(/\s/g, '').replace(',', '.'))
      if (rate > 0) {
        console.log('✅ Курс получен с CBU.uz:', rate)
        return rate
      }
    }
    
    // Если не нашли в HTML, используем fallback API
    return await fetchExchangeRateFromAPI()
    
  } catch (error) {
    console.error('❌ Ошибка получения курса с CBU.uz:', error)
    // Fallback на внешний API
    return await fetchExchangeRateFromAPI()
  }
}

// ✅ Fallback API (если CBU.uz недоступен)
const fetchExchangeRateFromAPI = async (): Promise<number> => {
  try {
    // Используем бесплатный API
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const data = await response.json()
    
    const rate = data.rates?.UZS || 13000
    console.log('✅ Курс получен с exchangerate-api.com:', rate)
    return rate
  } catch (error) {
    console.error('❌ Ошибка получения курса с API:', error)
    return 13000 // Дефолтное значение
  }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: 'ru',
      currency: 'USD',
      exchangeRate: 13000,
      cart: [],
      favorites: [],
      chatId: null,

      setLanguage: (lang) => set({ language: lang }),
      setCurrency: (curr) => set({ currency: curr }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),

      // ✅ Функция обновления курса
      updateExchangeRate: async () => {
        const rate = await fetchExchangeRateFromCBU()
        set({ exchangeRate: rate })
        
        // Сохраняем время последнего обновления
        localStorage.setItem('exchangeRateUpdatedAt', new Date().toISOString())
      },

      addToCart: (item) => set((state) => {
        if (item.isSpecialOrder) {
          return { cart: [...state.cart, item] }
        }

        if (item.quantity < 0) {
          return {
            cart: state.cart.map(i => 
              (i.productId === item.productId && i.size === item.size) 
                ? { ...i, quantity: Math.max(1, i.quantity - 1) } 
                : i
            )
          }
        }
        
        const existing = state.cart.find(i => i.productId === item.productId && i.size === item.size)
        if (existing) {
          return {
            cart: state.cart.map(i => 
              (i.productId === item.productId && i.size === item.size) 
                ? { ...i, quantity: i.quantity + item.quantity } 
                : i
            )
          }
        }
        return { cart: [...state.cart, item] }
      }),

      removeFromCart: (productId, size) => set((state) => ({
        cart: state.cart.filter(i => !(i.productId === productId && i.size === size))
      })),

      clearCart: () => set({ cart: [] }),

      getTotalPrice: () => {
        const state = get()
        const totalUsd = state.cart.reduce((sum, item) => sum + (item.priceUsd * item.quantity), 0)
        return totalUsd
      },

      addToFavorites: (item) => set((state) => {
        const exists = state.favorites.find(i => i.productId === item.productId)
        if (exists) {
          return state
        }
        return { favorites: [...state.favorites, item] }
      }),

      removeFromFavorites: (productId) => set((state) => ({
        favorites: state.favorites.filter(i => i.productId !== productId)
      })),

      isFavorite: (productId) => {
        const state = get()
        return state.favorites.some(i => i.productId === productId)
      },

      setChatId: (id) => set({ chatId: id }),
    }),
    { name: 'loft-store' }
  )
)

// ✅ Автоматическое обновление курса при загрузке приложения
if (typeof window !== 'undefined') {
  // Проверяем когда последний раз обновляли курс
  const lastUpdate = localStorage.getItem('exchangeRateUpdatedAt')
  const now = new Date()
  const shouldUpdate = !lastUpdate || 
    (now.getTime() - new Date(lastUpdate).getTime()) > (60 * 60 * 1000) // Каждые 60 минут

  if (shouldUpdate) {
    console.log('🔄 Обновляем курс валют...')
    useStore.getState().updateExchangeRate()
  }
}