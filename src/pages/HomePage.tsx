import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useStore, isProductOnSale, getEffectivePriceUsd, filterVisibleProducts } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { Heart, ArrowRight, ShoppingBag, User as UserIcon, Sparkles } from 'lucide-react'

const CACHE_FRESH_MS = 5 * 60 * 1000
const POPULARITY_FRESH_MS = 10 * 60 * 1000

const getItemsLabelRu = (count: number): string => {
  const lastTwo = count % 100
  const lastOne = count % 10
  if (lastTwo >= 11 && lastTwo <= 19) return 'товаров'
  if (lastOne === 1) return 'товар'
  if (lastOne >= 2 && lastOne <= 4) return 'товара'
  return 'товаров'
}

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
    getProductsCacheAge,
    popularityMap,
    getPopularityAge,
    telegramUser,
    ensureCategories,
  } = useStore()

  // ✅ Категории из БД: raw = null пока не загрузились (нужно для фильтрации товаров)
  const categoriesRaw = ensureCategories()
  const categories = categoriesRaw || []
  // ✅ Товары только активных категорий/подкатегорий
  const visibleItems = filterVisibleProducts(productsCache?.items || [], categoriesRaw)

  const hasLoadedRef = useRef(false)
  const hasLoadedPopularityRef = useRef(false)

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadProducts()
  }, [])

  useEffect(() => {
    if (hasLoadedPopularityRef.current) return
    hasLoadedPopularityRef.current = true

    if (getPopularityAge() > POPULARITY_FRESH_MS) {
      useStore.getState().updatePopularity()
    }
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

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const getNewProducts = (limit: number = 6) => {
    const items = visibleItems
    return [...items]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }

  const getPopularProducts = (limit: number = 6) => {
    const items = visibleItems
    const pop = popularityMap || {}

    return [...items]
      .filter((p) => (pop[p.id] || 0) > 0)
      .sort((a, b) => (pop[b.id] || 0) - (pop[a.id] || 0))
      .slice(0, limit)
  }

  const getDiscountProducts = (limit: number = 6) => {
    if (!saleModeEnabled) return []
    const items = visibleItems
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
      <Link to={`/product/${product.id}`} className="block">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-[#E8E2D5] dark:border-dark-border hover:shadow-md transition-shadow cursor-pointer">
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
                e.stopPropagation()
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
              className="absolute top-2 right-2 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:scale-110 transition-transform border border-transparent dark:border-dark-border"
            >
              <Heart
                size={18}
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
              <p className="text-[#8A8275] dark:text-gray-500 text-xs line-through mt-1">
                {formatPrice(product.price_usd)}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center px-3 py-2.5 border-t border-[#E8E2D5] dark:border-dark-border bg-[#F5F1E8]/60 dark:bg-dark-accent/40">
            <span className="text-xs text-[#8A8275] dark:text-gray-300">
              {language === 'ru' ? 'Цена' : 'Narx'}
            </span>
            <span className={`text-sm font-bold ${onSale ? 'text-[#9B3B3B] dark:text-red-400' : 'text-[#1B2A4A] dark:text-white'}`}>
              {formatPrice(effectivePrice)}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  const SectionHeader = ({
    emoji,
    title,
    titleColor = 'text-[#1B2A4A] dark:text-white',
    count,
    moreLabel,
    onMore,
  }: {
    emoji: string
    title: string
    titleColor?: string
    count?: number
    moreLabel?: string
    onMore?: () => void
  }) => (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <h3 className={`font-bold ${titleColor}`}>{title}</h3>
        {count !== undefined && count > 0 && (
          <span className="text-xs text-[#8A8275] dark:text-gray-300">
            ({count})
          </span>
        )}
      </div>
      {onMore && moreLabel && (
        <button
          onClick={onMore}
          className="text-sm text-[#8A8275] dark:text-gray-300 hover:text-[#1B2A4A] dark:hover:text-[#C9A961] flex items-center gap-1 transition-colors"
        >
          {moreLabel}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  )

  if (!productsCache) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
        <div className="p-4">
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <ShoppingBag size={18} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                LOFT MENS SHOP
              </h1>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                {language === 'ru' ? 'Магазин мужской одежды' : 'Erkaklar kiyimi do\'koni'}
              </p>
            </div>
          </div>

          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B2A4A] dark:border-gold mx-auto mb-3"></div>
            <p className="text-sm text-[#8A8275] dark:text-gray-300">
              {language === 'ru' ? 'Загрузка товаров...' : 'Mahsulotlar yuklanmoqda...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const newProducts = getNewProducts(6)
  const popularProducts = getPopularProducts(6)
  const discountProducts = getDiscountProducts(6)

  const userName = telegramUser
    ? `${telegramUser.firstName} ${telegramUser.lastName || ''}`.trim()
    : (language === 'ru' ? 'Гость' : 'Mehmon')

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <div className="p-4">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center gap-3">
          {telegramUser?.photoUrl ? (
            <img
              src={telegramUser.photoUrl}
              alt="Avatar"
              className="w-12 h-12 rounded-full object-cover border border-[#E8E2D5] dark:border-dark-border flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border rounded-full flex items-center justify-center flex-shrink-0">
              <UserIcon size={22} className="text-[#8A8275] dark:text-gray-300" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[#1B2A4A] dark:text-white truncate">
              {language === 'ru' ? `Привет, ${userName.split(' ')[0]} 👋` : `Salom, ${userName.split(' ')[0]} 👋`}
            </h1>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5 truncate">
              {language === 'ru' ? 'Что ищете сегодня?' : 'Bugun nima qidiryapsiz?'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={18} className="text-[#1B2A4A] dark:text-white" />
          </div>
        </div>

        {/* ✅ Категории — из БД через ensureCategories() */}
        <SectionHeader
          emoji="🗂"
          title={language === 'ru' ? 'Категории' : 'Kategoriyalar'}
          count={categories.length + 1}
        />
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-6 overflow-hidden divide-y divide-[#E8E2D5] dark:divide-dark-border">
          {categories.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#8A8275] dark:text-gray-300">
              {language === 'ru' ? 'Загрузка категорий...' : 'Kategoriyalar yuklanmoqda...'}
            </div>
          ) : (
            categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="w-full flex items-center gap-3 p-3.5 hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                  <span className="text-lg leading-none">{cat.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1B2A4A] dark:text-white truncate">
                    {language === 'ru' ? cat.name_ru : cat.name_uz}
                  </p>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                    {cat.subcategories.length - 1} {language === 'ru'
                      ? getItemsLabelRu(cat.subcategories.length - 1)
                      : 'ta pastki kategoriya'}
                  </p>
                </div>
                <ArrowRight size={18} className="text-[#8A8275] dark:text-gray-300 flex-shrink-0" />
              </button>
            ))
          )}
          <button
            onClick={() => navigate('/brands')}
            className="w-full flex items-center gap-3 p-3.5 hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <span className="text-lg leading-none">🏷️</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1B2A4A] dark:text-white truncate">
                {language === 'ru' ? 'Бренды' : 'Brendlar'}
              </p>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                {language === 'ru' ? 'Все производители' : 'Barcha ishlab chiqaruvchilar'}
              </p>
            </div>
            <ArrowRight size={18} className="text-[#8A8275] dark:text-gray-300 flex-shrink-0" />
          </button>
        </div>

        {discountProducts.length > 0 && (
          <div className="mb-6">
            <SectionHeader
              emoji="💰"
              title={language === 'ru' ? 'Скидки' : 'Chegirmalar'}
              titleColor="text-[#9B3B3B] dark:text-red-400"
              count={discountProducts.length}
              moreLabel={language === 'ru' ? 'Все скидки' : 'Barcha chegirmalar'}
              onMore={() => navigate('/all-products', { state: { sortBy: 'sale' } })}
            />
            <div className="grid grid-cols-2 gap-3">
              {discountProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        {newProducts.length > 0 && (
          <div className="mb-6">
            <SectionHeader
              emoji="✨"
              title={language === 'ru' ? 'Новые товары' : 'Yangi mahsulotlar'}
              count={newProducts.length}
              moreLabel={language === 'ru' ? 'Больше' : 'Ko\'proq'}
              onMore={() => navigate('/all-products', { state: { sortBy: 'newest' } })}
            />
            <div className="grid grid-cols-2 gap-3">
              {newProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        {popularProducts.length > 0 && (
          <div className="mb-6">
            <SectionHeader
              emoji="🔥"
              title={language === 'ru' ? 'Популярные' : 'Mashhurlar'}
              count={popularProducts.length}
              moreLabel={language === 'ru' ? 'Больше' : 'Ko\'proq'}
              onMore={() => navigate('/all-products', { state: { sortBy: 'popular' } })}
            />
            <div className="grid grid-cols-2 gap-3">
              {popularProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        {discountProducts.length === 0 && newProducts.length === 0 && popularProducts.length === 0 && (
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border mx-auto mb-3 flex items-center justify-center">
              <Sparkles size={24} className="text-[#8A8275] dark:text-gray-300" />
            </div>
            <p className="text-sm font-medium text-[#1B2A4A] dark:text-white mb-1">
              {language === 'ru' ? 'Скоро появятся товары' : 'Tez orada mahsulotlar paydo bo\'ladi'}
            </p>
            <p className="text-xs text-[#8A8275] dark:text-gray-300">
              {language === 'ru'
                ? 'Загляните в категории или к брендам'
                : 'Kategoriyalar yoki brendlarga qarang'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}