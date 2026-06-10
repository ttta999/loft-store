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
  setLanguage: (lang: Language) => void
  setCurrency: (curr: Currency) => void
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, size: string) => void
  clearCart: () => void
  getTotalPrice: () => number
  addToFavorites: (item: FavoriteItem) => void
  removeFromFavorites: (productId: string) => void
  isFavorite: (productId: string) => boolean
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: 'ru',
      currency: 'USD',
      exchangeRate: 13000,
      cart: [],
      favorites: [],

      setLanguage: (lang) => set({ language: lang }),
      setCurrency: (curr) => set({ currency: curr }),

      addToCart: (item) => set((state) => {
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
      }
    }),
    { name: 'loft-store' }
  )
)