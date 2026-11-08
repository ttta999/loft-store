import { useNavigate } from 'react-router-dom'
import { memo, useEffect, useMemo, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore, isProductOnSale, getEffectivePriceUsd, filterVisibleProducts } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import {
  Heart, ArrowRight, ShoppingBag, User as UserIcon, Sparkles,
  FolderOpen, Banknote, Flame, Tag,
} from 'lucide-react'
import CategoryIcon from '../components/CategoryIcon'
import { warmPage } from '../lib/pagePreload'

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

const HomeProductCard = memo(function HomeProductCard({ product, placement }: { product: any; placement: string }) {
  const navigate = useNavigate()
  const { language, currency, exchangeRate, saleModeEnabled, addToFavorites, removeFromFavorites } = useStore(useShallow(state => ({ language: state.language, currency: state.currency, exchangeRate: state.exchangeRate, saleModeEnabled: state.saleModeEnabled, addToFavorites: state.addToFavorites, removeFromFavorites: state.removeFromFavorites })))
  const formatPrice = (usd: number) => currency === 'USD' ? `$${usd}` : `${(usd * exchangeRate).toLocaleString()} сум`
  const onSale = isProductOnSale(product, saleModeEnabled)
  const effectivePrice = getEffectivePriceUsd(product, saleModeEnabled)
  const discountPercent = onSale
    ? Math.round((1 - Number(product.sale_price) / Number(product.price_usd)) * 100)
    : 0

  const favorite = useStore(state => state.favorites.some(item => item.productId === product.id))

  return (
    <div
      data-product-placement={`${placement}:${product.id}`} data-product-card={product.id}
      role="link" tabIndex={0}
      onClick={() => navigate(`/product/${product.id}`)}
      onKeyDown={event => {
        if (event.key === 'Enter' && event.target === event.currentTarget) {
          event.preventDefault()
          event.currentTarget.click()
        }
      }}
      className="self-start bg-[#FBF9F4] dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-[#E8E2D5] dark:border-dark-border hover:shadow-md transition-shadow cursor-pointer">
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
            className="absolute top-2 right-2 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:scale-[1.02] transition-transform border border-transparent dark:border-dark-border"
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
  )
})

  const SectionHeader = ({
    icon,
    title,
    titleColor = 'text-[#1B2A4A] dark:text-white',
    count,
    moreLabel,
    onMore,
    surfaceKey,
  }: {
    icon: React.ReactNode
    title: string
    titleColor?: string
    count?: number
    moreLabel?: string
    onMore?: () => void
    surfaceKey?: string
  }) => (
    <div data-surface-link={surfaceKey} data-surface-to={surfaceKey ? "/all-products" : undefined} className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
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


export default function HomePage() {
  const navigate = useNavigate()
  // Prepare the product module after the first paint, before a first touch.
  // Pointer prefetch alone is too late on phones (there is no hover).
  useEffect(() => {
    const warm = () => warmPage('/product')
    if ('requestIdleCallback' in window) {
      const task = window.requestIdleCallback(warm, { timeout: 200 })
      return () => window.cancelIdleCallback(task)
    }
    const task = setTimeout(warm, 100)
    return () => clearTimeout(task)
  }, [])

  const {
    language,
    saleModeEnabled,
    productsCache,
    setProductsCache,
    getProductsCacheAge,
    popularityMap,
    getPopularityAge,
    telegramUser,
    ensureCategories,
    categoriesCache,
  } = useStore(useShallow(state => ({ language: state.language, saleModeEnabled: state.saleModeEnabled, productsCache: state.productsCache, setProductsCache: state.setProductsCache, getProductsCacheAge: state.getProductsCacheAge, popularityMap: state.popularityMap, getPopularityAge: state.getPopularityAge, telegramUser: state.telegramUser, ensureCategories: state.ensureCategories, categoriesCache: state.categoriesCache })))

  const categoriesRaw = categoriesCache?.items || null
  useEffect(() => { ensureCategories() }, [ensureCategories])
  const categories = categoriesRaw || []
  const visibleItems = useMemo(() => filterVisibleProducts(productsCache?.items || [], categoriesRaw), [productsCache, categoriesRaw])

  const categoryProductCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const product of visibleItems) counts.set(product.category, (counts.get(product.category) || 0) + 1)
    return counts
  }, [visibleItems])

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
      const data = await getProducts(force)
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


  const { newProducts, popularProducts, discountProducts } = useMemo(() => ({
    newProducts: [...visibleItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6),
    popularProducts: visibleItems.filter(product => (popularityMap?.[product.id] || 0) > 0).sort((a, b) => (popularityMap?.[b.id] || 0) - (popularityMap?.[a.id] || 0)).slice(0, 6),
    discountProducts: saleModeEnabled ? visibleItems.filter(product => product.sale_price != null && Number(product.sale_price) > 0).slice(0, 6) : [],
  }), [visibleItems, popularityMap, saleModeEnabled])

  if (!productsCache) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
        <div data-loft-content className="p-4">
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


  const userName = telegramUser
    ? `${telegramUser.firstName} ${telegramUser.lastName || ''}`.trim()
    : (language === 'ru' ? 'Гость' : 'Mehmon')

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <div data-loft-content className="p-4">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center gap-3">
          {telegramUser?.photoUrl ? (
            <img
              decoding="async"
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
              {language === 'ru' ? `Привет, ${userName.split(' ')[0]}` : `Salom, ${userName.split(' ')[0]}`}
            </h1>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5 truncate">
              {language === 'ru' ? 'Что ищете сегодня?' : 'Bugun nima qidiryapsiz?'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={18} className="text-[#1B2A4A] dark:text-white" />
          </div>
        </div>

        <SectionHeader
          icon={<FolderOpen size={14} className="text-[#1B2A4A] dark:text-white" />}
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
                data-surface-link={`category:${cat.id}`} data-surface-to="/category"
                onClick={() => handleCategoryClick(cat.id)}
                className="w-full flex items-center gap-3 p-3.5 hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                  <CategoryIcon name={cat.icon} size={18} className="text-[#1B2A4A] dark:text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1B2A4A] dark:text-white truncate">
                    {language === 'ru' ? cat.name_ru : cat.name_uz}
                  </p>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                    {categoryProductCounts.get(cat.id) || 0} {language === 'ru'
                      ? getItemsLabelRu(categoryProductCounts.get(cat.id) || 0)
                      : 'ta mahsulot'}
                  </p>
                </div>
                <ArrowRight size={18} className="text-[#8A8275] dark:text-gray-300 flex-shrink-0" />
              </button>
            ))
          )}
          <button
            data-surface-link="brands" data-surface-to="/brands"
            onClick={() => navigate('/brands')}
            className="w-full flex items-center gap-3 p-3.5 hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Tag size={18} className="text-[#1B2A4A] dark:text-white" />
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
              icon={<Banknote size={14} className="text-[#9B3B3B] dark:text-red-400" />}
              title={language === 'ru' ? 'Скидки' : 'Chegirmalar'}
              titleColor="text-[#9B3B3B] dark:text-red-400"
              count={discountProducts.length}
              moreLabel={language === 'ru' ? 'Все скидки' : 'Barcha chegirmalar'}
              surfaceKey="products:sale"
              onMore={() => navigate('/all-products', { state: { sortBy: 'sale' } })}
            />
            <div className="grid grid-cols-2 gap-3">
              {discountProducts.map((product) => (
                <HomeProductCard key={product.id} product={product} placement="sale" />
              ))}
            </div>
          </div>
        )}

        {newProducts.length > 0 && (
          <div className="mb-6">
            <SectionHeader
              icon={<Sparkles size={14} className="text-[#1B2A4A] dark:text-white" />}
              title={language === 'ru' ? 'Новые товары' : 'Yangi mahsulotlar'}
              count={newProducts.length}
              moreLabel={language === 'ru' ? 'Больше' : 'Ko\'proq'}
              surfaceKey="products:newest"
              onMore={() => navigate('/all-products', { state: { sortBy: 'newest' } })}
            />
            <div className="grid grid-cols-2 gap-3">
              {newProducts.map((product) => (
                <HomeProductCard key={product.id} product={product} placement="new" />
              ))}
            </div>
          </div>
        )}

        {popularProducts.length > 0 && (
          <div className="mb-6">
            <SectionHeader
              icon={<Flame size={14} className="text-[#1B2A4A] dark:text-white" />}
              title={language === 'ru' ? 'Популярные' : 'Mashhurlar'}
              count={popularProducts.length}
              moreLabel={language === 'ru' ? 'Больше' : 'Ko\'proq'}
              surfaceKey="products:popular"
              onMore={() => navigate('/all-products', { state: { sortBy: 'popular' } })}
            />
            <div className="grid grid-cols-2 gap-3">
              {popularProducts.map((product) => (
                <HomeProductCard key={product.id} product={product} placement="popular" />
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
