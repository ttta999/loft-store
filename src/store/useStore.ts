import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

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

// ✅ Получение курса из Supabase settings
const fetchExchangeRateFromDB = async (): Promise<{ rate: number; version: number } | null> => {
  try {
    console.log('🔄 Запрашиваем курс из Supabase settings...')
    
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'exchange_rate')
      .single()
    
    console.log('📊 Ответ от Supabase:', { data, error })
    
    if (error) {
      console.error('❌ Ошибка Supabase:', error)
      return null
    }
    
    if (!data) {
      console.warn('⚠️ Запись exchange_rate не найдена в БД')
      return null
    }
    
    const rate = (data.value as any)?.rate
    const version = (data.value as any)?.version || 0
    
    console.log('✅ Курс из БД:', rate, 'Версия:', version)
    
    if (!rate || rate <= 0) {
      console.warn('⚠️ Неверный курс в БД:', rate)
      return null
    }
    
    return { rate, version }
  } catch (error) {
    console.error('❌ Ошибка получения курса из БД:', error)
    return null
  }
}

// ✅ Fallback: получение курса через API
const fetchExchangeRateFromAPI = async (): Promise<number> => {
  try {
    console.log('🔄 Запрашиваем курс через API...')
    
    const response = await fetch('/api/getExchangeRate')
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }
    
    const data = await response.json()
    console.log('✅ Курс из API:', data.rate)
    return data.rate
  } catch (error) {
    console.error('❌ Ошибка получения курса через API:', error)
    return 12100 // Fallback
  }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: 'ru',
      currency: 'UZS', // ✅ ИЗМЕНЕНО: валюта по умолчанию UZS
      exchangeRate: 12100,
      cart: [],
      favorites: [],
      chatId: null,

      setLanguage: (lang) => set({ language: lang }),
      setCurrency: (curr) => set({ currency: curr }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),

      // ✅ Функция обновления курса из БД с проверкой версии
      updateExchangeRate: async () => {
        console.log('🔄 Начинаем обновление курса...')
        
        const dbData = await fetchExchangeRateFromDB()
        
        if (!dbData) {
          console.warn('⚠️ Не удалось получить курс из БД, используем API')
          const fallbackRate = await fetchExchangeRateFromAPI()
          set({ exchangeRate: fallbackRate })
          localStorage.setItem('exchangeRateUpdatedAt', new Date().toISOString())
          return
        }
        
        const { rate, version } = dbData
        const storedVersion = localStorage.getItem('exchangeRateVersion')
        
        // ✅ Проверяем изменилась ли версия курса
        if (storedVersion && Number(storedVersion) === version) {
          console.log('✅ Курс не изменился (версия:', version, ')')
        } else {
          console.log('🆕 Курс обновлён! Версия:', storedVersion, '→', version)
          set({ exchangeRate: rate })
          localStorage.setItem('exchangeRateVersion', version.toString())
          toast.info(`Курс обновлён: ${rate.toLocaleString()} сум`)
        }
        
        // Сохраняем время последнего обновления
        const now = new Date().toISOString()
        localStorage.setItem('exchangeRateUpdatedAt', now)
        console.log('💾 Курс сохранён в localStorage, время:', now)
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
  console.log('🔄 Инициализация курса валют...')
  
  // ✅ Обновляем курс сразу при загрузке
  useStore.getState().updateExchangeRate()
  
  // ✅ Периодическая проверка каждые 5 минут
  setInterval(() => {
    console.log('⏰ Периодическая проверка курса...')
    useStore.getState().updateExchangeRate()
  }, 5 * 60 * 1000) // 5 минут
  
  // ✅ Обновление при возврате на вкладку
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('👁️ Вкладка активна, проверяем курс...')
      useStore.getState().updateExchangeRate()
    }
  })
}

// ✅ Функция для показа toast (добавляем если нет)
const toast = {
  info: (message: string) => {
    console.log('ℹ️', message)
    // Если используешь sonner, замени на:
    // import { toast } from 'sonner'
    // toast.info(message)
  }
}