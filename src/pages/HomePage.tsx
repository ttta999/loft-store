import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { Heart, ArrowRight, Search, X, TrendingUp } from 'lucide-react'
import { CATEGORIES } from '../data/categories'

const CACHE_FRESH_MS = 5 * 60 * 1000
const POPULARITY_FRESH_MS = 10 * 60 * 1000
const RECENT_SEARCHES_KEY = 'loft-recent-searches'

// ✅ Тип контекста из AppLayout
interface OutletContextType {
  showBackButton: boolean
  setShowBackButton: (show: boolean) => void
  onBackClick: (() => void) | null
  setOnBackClick: (fn: (() => void) | null) => void
  onSearchClick: (() => void) | null
  setOnSearchClick: (fn: (() => void) | null) => void
}

// ✅ OVERLAY ПОИСКА на главной странице
function SearchOverlay({ onClose, onSearch }: { onClose: () => void; onSearch: (q: string) => void }) {
  const { language } = useStore()
  const [query, setQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (saved) setRecentSearches(JSON.parse(saved))
    } catch {
      // игнорируем
    }

    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  const submitSearch = (raw: string) => {
    const q = raw.trim()
    if (!q) return
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5)
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch {
      // игнорируем
    }
    onSearch(q)
  }

  const clearRecent = () => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch {
      // игнорируем
    }
    setRecentSearches([])
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F5F1E8]/95 dark:bg-dark-bg/95 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      <div className="p-4" onClick={(e) => e.stopPropagation()}>
        {/* ✅ Шапка overlay: поле + отмена */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch(query)
              }}
              placeholder={language === 'ru' ? 'Поиск товаров...' : 'Mahsulotlarni qidirish...'}
              className="w-full p-3 pl-11 pr-10 border-2 border-[#1B2A4A] dark:border-gold rounded-xl focus:outline-none bg-white dark:bg-dark-card text-[#1B2A4A] dark:text-white placeholder:text-[#8A8275] dark:placeholder:text-gray-500 shadow-md"
            />
            <Search size={20} className="absolute left-3.5 top-3.5 text-[#1B2A4A] dark:text-gold" />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-3 text-[#8A8275] dark:text-gray-400 hover:text-[#1B2A4A] dark:hover:text-white"
              >
                <X size={20} />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-3 rounded-xl bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border text-[#1B2A4A] dark:text-white font-medium hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors"
          >
            {language === 'ru' ? 'Отмена' : 'Bekor'}
          </button>
        </div>

        {/* ✅ Кнопка поиска (появляется когда есть запрос) */}
        {query.trim() && (
          <button
            onClick={() => submitSearch(query)}
            className="w-full bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors mb-4 shadow-md"
          >
            <Search size={18} />
            {language === 'ru' ? `Найти: "${query.trim()}"` : `"${query.trim()}" ni qidirish`}
          </button>
        )}

        {/* ✅ Недавние поиски */}
        {recentSearches.length > 0 && !query.trim() && (
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#1B2A4A] dark:text-white flex items-center gap-2">
                <TrendingUp size={16} />
                {language === 'ru' ? 'Недавние поиски' : 'So\'nggi qidiruvlar'}
              </h3>
              <button
                onClick={clearRecent}
                className="text-xs text-[#8A8275] dark:text-gray-400 hover:text-[#1B2A4A] dark:hover:text-white underline"
              >
                {language === 'ru' ? 'Очистить' : 'Tozalash'}
              </button>
            </div>
            <div className="space-y-2">
              {recentSearches.map((q) => (
                <button
                  key={q}
                  onClick={() => submitSearch(q)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors text-left"
                >
                  <Search size={14} className="text-[#8A8275] dark:text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-[#1B2A4A] dark:text-white">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ✅ Пустое состояние */}
        {!query.trim() && recentSearches.length === 0 && (
          <div className="text-center py-12">
            <Search size={48} className="text-[#E8E2D5] dark:text-dark-border mx-auto mb-3" />
            <p className="text-sm text-[#8A8275] dark:text-gray-300">
              {language === 'ru'
                ? 'Начните вводить название товара'
                : 'Mahsulot nomini kiriting'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()

  // ✅ Контекст из AppLayout — регистрируем обработчик клика по лупе в шапке
  const { setOnSearchClick } = useOutletContext<OutletContextType>()

  const [showSearchOverlay, setShowSearchOverlay] = useState(false)

  const {
    language,
    currency,
    exchangeRate,
    saleModeEnabled,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    productsCache,
    setProductsCache,
    getProductsCacheAge,
    popularityMap,
    getPopularityAge,
  } = useStore()

  const hasLoadedRef = useRef(false)
  const hasLoadedPopularityRef = useRef(false)

  // ✅ Клик по лупе в IslandHeader открывает overlay (а не уводит на /search)
  useEffect(() => {
    setOnSearchClick(() => setShowSearchOverlay(true))
    return () => setOnSearchClick(null)
  }, [setOnSearchClick])

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (hasLoadedPopularityRef.current) return
    hasLoadedPopularityRef.current = true

    if (getPopularityAge() > POPULARITY_FRESH_MS) {
      useStore.getState().updatePopularity()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProducts = async (force = false) => {
    const cacheAge = getProductsCacheAge()
    const hasFreshCache = productsCache && cacheAge < CACHE_FRESH_MS
    if (hasFreshCache && !force) return

    try {
      const data = await getProducts()
      setProductsCache(data)
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error)
    }
  }

  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === 'brands') {
      navigate('/brands')
      return
    }
    navigate('/category', { state: { categoryId } })
  }

  // ✅ Отправка поиска: закрываем overlay и идём на страницу результатов
  const handleSearch = (q: string) => {
    setShowSearchOverlay(false)
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const getNewProducts = (limit: number = 6) => {
    const items = productsCache?.items || []
    return [...items]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }

  const getPopularProducts = (limit: number = 6) => {
    const items = productsCache?.items || []
    const pop = popularityMap || {}

    return [...items]
      .filter((p) => (pop[p.id] || 0) > 0)
      .sort((a, b) => (pop[b.id] || 0) - (pop[a.id] || 0))
      .slice(0, limit)
  }

  const getDiscountProducts = (limit: number = 6) => {
    if (!saleModeEnabled) return []
    const items = productsCache?.items || []
    return items
      .filter((p) => p.sale_price != null && Number(p.sale_price) > 0)
      .slice(0, limit)
  }

  const ProductCard = ({ product }: { product: any }) => {
    const onSale = isProductOnSale(product, saleModeEnabled)
    const effectivePrice = getEffectivePriceUsd(product, saleModeEnabled)
    const discountPercent = onSale
      ? Math.round((1 - Number(product.sale_price) / Number(product.price_usd)) * 100)
      : 0

    const favorite = isFavorite(product.id)

    return (
      <Link to={`/product/${product.id}`}>
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-[#E8E2D5] dark:border-dark-border hover:shadow-md transition-shadow">
          <div className="aspect-square bg-[#F5F1E8] dark:bg-dark-accent relative">
            <img
              src={product.images?.[0] || 'https://via.placeholder.com/500'}
              alt={language === 'ru' ? product.name_ru : product.name_uz}
              className="w-full h-full object-cover"
            />

            {onSale && (
              <span className="absolute top-2 left-2 bg-[#9B3B3B] text-white text-xs font-bold px-2 py-1 rounded-full">
                -{discountPercent}%
              </span>
            )}

            <button
              onClick={(e) => {
                e.preventDefault()
                if (favorite) {
                  removeFromFavorites(product.id)
                } else {
                  addToFavorites({
                    productId: product.id,
                    name: language === 'ru' ? product.name_ru : product.name_uz,
                    priceUsd: effectivePrice,
                    image: product.images?.[0] || '',
                  })
                }
              }}
              className="absolute top-2 right-2 bg-white dark:bg-dark-card rounded-full p-2 shadow-md hover:scale-110 transition-transform border border-transparent dark:border-dark-border"
            >
              <Heart
                size={20}
                className={
                  favorite
                    ? 'fill-[#9B3B3B] text-[#9B3B3B]'
                    : 'text-[#8A8275] dark:text-gray-300'
                }
              />
            </button>
          </div>

          <div className="p-3">
            <p className="text-sm font-medium truncate text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? product.name_ru : product.name_uz}
            </p>

            {onSale && (
              <p className="text-[#8A8275] dark:text-gray-400 text-xs line-through mt-1">
                {formatPrice(product.price_usd)}
              </p>
            )}

            <p
              className={`font-bold mt-1 ${
                onSale ? 'text-[#9B3B3B] dark:text-red-400' : 'text-[#1B2A4A] dark:text-white'
              }`}
            >
              {formatPrice(effectivePrice)}
            </p>
          </div>
        </div>
      </Link>
    )
  }

  if (!productsCache) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2A4A] dark:border-b-[#C9A961] mx-auto mb-4"></div>
          <p className="text-[#8A8275] dark:text-gray-300">
            {language === 'ru' ? 'Загрузка товаров...' : 'Mahsulotlar yuklanmoqda...'}
          </p>
        </div>
      </div>
    )
  }

  const popularProducts = getPopularProducts(6)

  return (
    <div className="p-4 pb-24">
      {/* ✅ HERO с кнопкой поиска внутри */}
      <div className="bg-gradient-to-r from-[#1B2A4A] to-[#142038] dark:from-dark-card dark:to-dark-accent rounded-2xl p-6 mb-6 text-white shadow-md border border-transparent dark:border-dark-border">
        <h2 className="text-2xl font-bold mb-2 tracking-wide">
          {language === 'ru' ? 'Добро пожаловать в LOFT' : 'LOFTga xush kelibsiz'}
        </h2>

        <p className="text-[#C9A961] text-sm mb-4">
          {language === 'ru'
            ? 'Стильная одежда и обувь в Ташкенте'
            : 'Toshkentdagi zamonaviy kiyim va poyabzal'}
        </p>

        <button
          onClick={() => setShowSearchOverlay(true)}
          className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 flex items-center gap-3 hover:bg-white/20 transition-colors"
        >
          <Search size={20} className="text-[#C9A961]" />
          <span className="text-sm text-white/80 text-left">
            {language === 'ru' ? 'Найти товар...' : 'Mahsulotni qidirish...'}
          </span>
        </button>
      </div>

      <h3 className="text-lg font-bold mb-3 text-[#1B2A4A] dark:text-white">
        {language === 'ru' ? 'Категории' : 'Kategoriyalar'}
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-[#E8E2D5] dark:border-dark-border hover:shadow-md flex items-center gap-3 cursor-pointer transition-all hover:bg-[#F5F1E8] dark:hover:bg-dark-accent"
          >
            <span className="text-3xl">{cat.icon}</span>
            <span className="font-medium text-sm text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? cat.name_ru : cat.name_uz}
            </span>
          </div>
        ))}

        <div
          onClick={() => navigate('/brands')}
          className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-[#E8E2D5] dark:border-dark-border hover:shadow-md flex items-center gap-3 cursor-pointer transition-all hover:bg-[#F5F1E8] dark:hover:bg-dark-accent"
        >
          <span className="text-3xl">🏷️</span>
          <span className="font-medium text-sm text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? 'Бренды' : 'Brendlar'}
          </span>
        </div>
      </div>

      {getDiscountProducts().length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3 text-[#9B3B3B] dark:text-red-400">
            {language === 'ru' ? '💰 Скидки' : '💰 Chefirmalar'}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {getDiscountProducts(6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {getNewProducts().length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? '✨ Новые товары' : '✨ Yangi mahsulotlar'}
            </h3>

            <button
              onClick={() => navigate('/all-products', { state: { sortBy: 'newest' } })}
              className="text-sm text-[#8A8275] dark:text-gray-300 hover:text-[#1B2A4A] dark:hover:text-[#C9A961] flex items-center gap-1 transition-colors"
            >
              {language === 'ru' ? 'Больше' : 'Ko\'proq'}
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {getNewProducts(6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {popularProducts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? '🔥 Популярные товары' : '🔥 Mashhur mahsulotlar'}
            </h3>

            <button
              onClick={() => navigate('/all-products', { state: { sortBy: 'popular' } })}
              className="text-sm text-[#8A8275] dark:text-gray-300 hover:text-[#1B2A4A] dark:hover:text-[#C9A961] flex items-center gap-1 transition-colors"
            >
              {language === 'ru' ? 'Больше' : 'Ko\'proq'}
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* ✅ OVERLAY ПОИСКА поверх главной */}
      {showSearchOverlay && (
        <SearchOverlay
          onClose={() => setShowSearchOverlay(false)}
          onSearch={handleSearch}
        />
      )}
    </div>
  )
}