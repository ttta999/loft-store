import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { Heart, ArrowRight } from 'lucide-react'
import { CATEGORIES } from '../data/categories'

// ✅ Кеш считается свежим 5 минут
const CACHE_FRESH_MS = 5 * 60 * 1000

export default function HomePage() {
  const navigate = useNavigate()
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
    getProductsCacheAge
  } = useStore()

  // ✅ Защита от повторной загрузки при строгом режиме React
  const hasLoadedRef = useRef(false)

  // ✅ Умная загрузка: только если нет свежего кеша
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadProducts()
  }, [])

  const loadProducts = async (force = false) => {
    const cacheAge = getProductsCacheAge()
    const hasFreshCache = productsCache && cacheAge < CACHE_FRESH_MS

    // ✅ Есть свежий кеш и не принудительно — пропускаем
    if (hasFreshCache && !force) {
      return
    }

    // ✅ Загружаем в фоне (лоадер показывается через !productsCache ниже)
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
    const productsWithOrders = items.map(product => ({
      ...product,
      orderCount: Math.floor(Math.random() * 100)
    }))

    return productsWithOrders
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, limit)
  }

  const getDiscountProducts = (limit: number = 6) => {
    if (!saleModeEnabled) return []
    const items = productsCache?.items || []
    return items
      .filter(p => p.sale_price != null && Number(p.sale_price) > 0)
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
                    image: product.images?.[0] || ''
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

            <p className={`font-bold mt-1 ${
              onSale
                ? 'text-[#9B3B3B] dark:text-red-400'
                : 'text-[#1B2A4A] dark:text-white'
            }`}>
              {formatPrice(effectivePrice)}
            </p>
          </div>
        </div>
      </Link>
    )
  }

  // ✅ Лоадер ТОЛЬКО при первом визите (когда кеша нет вообще)
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

  return (
    <div className="p-4 pb-24">
      <div className="bg-gradient-to-r from-[#1B2A4A] to-[#142038] dark:from-dark-card dark:to-dark-accent rounded-2xl p-6 mb-6 text-white shadow-md border border-transparent dark:border-dark-border">
        <h2 className="text-2xl font-bold mb-2 tracking-wide">
          {language === 'ru' ? 'Добро пожаловать в LOFT' : 'LOFTga xush kelibsiz'}
        </h2>

        <p className="text-[#C9A961] text-sm">
          {language === 'ru'
            ? 'Стильная одежда и обувь в Ташкенте'
            : 'Toshkentdagi zamonaviy kiyim va poyabzal'}
        </p>
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

      {getPopularProducts().length > 0 && (
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
            {getPopularProducts(6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}