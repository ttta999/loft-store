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
const fetchExchangeRateFromDB = async (): Promise<number> => {
  try {
    console.log('🔄 Запрашиваем курс из БД...')
    
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'exchange_rate')
      .single()
    
    if (error || !data) {
      throw new Error('Курс не найден в БД')
    }
    
    const rate = (data.value as any)?.rate || 12100
    console.log('✅ Курс из БД:', rate)
    return rate
  } catch (error) {
    console.error('❌ Ошибка получения курса из БД:', error)
    // Fallback на API
    return await fetchExchangeRateFromAPI()
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

      // ✅ Функция обновления курса из БД
      updateExchangeRate: async () => {
        const rate = await fetchExchangeRateFromDB()
        set({ exchangeRate: rate })
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
  const lastUpdate = localStorage.getItem('exchangeRateUpdatedAt')
  const now = new Date()
  const shouldUpdate = !lastUpdate || 
    (now.getTime() - new Date(lastUpdate).getTime()) > (60 * 60 * 1000) // Каждые 60 минут

  if (shouldUpdate) {
    console.log('🔄 Обновляем курс валют...')
    useStore.getState().updateExchangeRate()
  }
}