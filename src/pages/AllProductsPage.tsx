import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { Heart, Tag, Layers, ListOrdered, SlidersHorizontal, Package, Sparkles, Flame, Search } from 'lucide-react'
import IslandHeader from '../components/IslandHeader'

const POPULARITY_FRESH_MS = 10 * 60 * 1000

export default function AllProductsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    language,
    currency,
    exchangeRate,
    saleModeEnabled,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    popularityMap,
    getPopularityAge,
    ensureProducts,
    ensureCategories,
  } = useStore()

  // ✅ Категории из БД
  const categories = ensureCategories() || []

  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>(location.state?.sortBy || 'newest')

  const hasLoadedPopularityRef = useRef(false)

  const cachedItems = ensureProducts()
  const loading = !cachedItems
  const products = cachedItems || []

  useEffect(() => {
    if (hasLoadedPopularityRef.current) return
    hasLoadedPopularityRef.current = true
    if (getPopularityAge() > POPULARITY_FRESH_MS) {
      useStore.getState().updatePopularity()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFiltersAndSort = () => {
    let filtered = [...products]
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory)
    }
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter((p) => p.subcategory === selectedSubcategory)
    }
    const pop = popularityMap || {}
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'popular') {
      filtered.sort((a, b) => (pop[b.id] || 0) - (pop[a.id] || 0))
    } else if (sortBy === 'price_asc') {
      filtered.sort(
        (a, b) => getEffectivePriceUsd(a, saleModeEnabled) - getEffectivePriceUsd(b, saleModeEnabled)
      )
    } else if (sortBy === 'price_desc') {
      filtered.sort(
        (a, b) => getEffectivePriceUsd(b, saleModeEnabled) - getEffectivePriceUsd(a, saleModeEnabled)
      )
    }
    return filtered
  }

  const filteredProducts = applyFiltersAndSort()

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const headerConfig = (() => {
    if (sortBy === 'newest') {
      return {
        title: language === 'ru' ? 'Новые товары' : 'Yangi mahsulotlar',
        emoji: '✨',
        icon: <Sparkles size={18} className="text-[#1B2A4A] dark:text-white" />,
      }
    }
    if (sortBy === 'popular') {
      return {
        title: language === 'ru' ? 'Популярные товары' : 'Mashhur mahsulotlar',
        emoji: '🔥',
        icon: <Flame size={18} className="text-[#1B2A4A] dark:text-white" />,
      }
    }
    return {
      title: language === 'ru' ? 'Все товары' : 'Barcha mahsulotlar',
      emoji: '📦',
      icon: <Package size={18} className="text-[#1B2A4A] dark:text-white" />,
    }
  })()

  const activeFiltersCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedSubcategory !== 'all' ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0)

  const clearFilters = () => {
    setSelectedCategory('all')
    setSelectedSubcategory('all')
    setSortBy('newest')
  }

  const ProductCard = ({ product }: { product: any }) => {
    const onSale = isProductOnSale(product, saleModeEnabled)
    const effectivePrice = getEffectivePriceUsd(product, saleModeEnabled)
    const discountPercent = onSale
      ? Math.round((1 - Number(product.sale_price) / Number(product.price_usd)) * 100)
      : 0
    const favorite = isFavorite(product.id)

    return (
      <div
        onClick={() => navigate(`/product/${product.id}`)}
        className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-[#E8E2D5] dark:border-dark-border cursor-pointer hover:shadow-md transition-shadow"
      >
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
            className="absolute top-2 right-2 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:scale-110 transition-transform border border-transparent dark:border-dark-border"
          >
            <Heart
              size={18}
              className={favorite ? 'fill-[#9B3B3B] text-[#9B3B3B]' : 'text-[#8A8275] dark:text-gray-300'}
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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
        <IslandHeader needsBack={true} onBack={() => navigate(-1)} />
        <div className="p-4">
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                {headerConfig.title}
              </h1>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              {headerConfig.icon}
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

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <IslandHeader needsBack={true} onBack={() => navigate(-1)} />
      <div className="p-4">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <span className="text-xl leading-none">{headerConfig.emoji}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                {headerConfig.title}
              </h1>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                {language === 'ru' ? 'Найдено' : 'Topildi'}: {filteredProducts.length}
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            {headerConfig.icon}
          </div>
        </div>

        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 overflow-hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
              activeFiltersCount > 0
                ? 'bg-[#F5F1E8] dark:bg-dark-accent'
                : 'bg-[#F5F1E8]/60 dark:bg-dark-accent/40'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                activeFiltersCount > 0
                  ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                  : 'bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border'
              }`}>
                <SlidersHorizontal size={16} className={activeFiltersCount > 0 ? 'text-white dark:text-[#1B2A4A]' : 'text-[#1B2A4A] dark:text-white'} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-white">
                  {language === 'ru' ? 'Фильтры и сортировка' : 'Filtrlar va saralash'}
                </p>
                {activeFiltersCount > 0 && (
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                    {language === 'ru' ? 'Активных фильтров' : 'Faol filtrlar'}: {activeFiltersCount}
                  </p>
                )}
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearFilters()
                }}
                className="text-xs text-[#9B3B3B] dark:text-red-400 hover:underline whitespace-nowrap flex-shrink-0"
              >
                {language === 'ru' ? 'Сбросить' : 'Tozalash'}
              </button>
            )}
          </button>

          {showFilters && (
            <div className="border-t border-[#E8E2D5] dark:border-dark-border divide-y divide-[#E8E2D5] dark:divide-dark-border">
              {/* ✅ Категория — из БД */}
              <div className="p-3.5">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                    <Tag size={16} className="text-[#1B2A4A] dark:text-white" />
                  </div>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 font-medium">
                    {language === 'ru' ? 'Категория' : 'Kategoriya'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-12">
                  <button
                    onClick={() => {
                      setSelectedCategory('all')
                      setSelectedSubcategory('all')
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                        : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                    }`}
                  >
                    {language === 'ru' ? 'Все' : 'Barchasi'}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id)
                        setSelectedSubcategory('all')
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                          : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                      }`}
                    >
                      {cat.icon} {language === 'ru' ? cat.name_ru : cat.name_uz}
                    </button>
                  ))}
                </div>
              </div>

              {/* ✅ Подкатегория — из БД (пропускаем виртуальную «Все товары» id='all') */}
              {selectedCategory !== 'all' && (
                <div className="p-3.5">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                      <Layers size={16} className="text-[#1B2A4A] dark:text-white" />
                    </div>
                    <p className="text-xs text-[#8A8275] dark:text-gray-300 font-medium">
                      {language === 'ru' ? 'Подкатегория' : 'Pastki kategoriya'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 ml-12">
                    <button
                      onClick={() => setSelectedSubcategory('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedSubcategory === 'all'
                          ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                          : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                      }`}
                    >
                      {language === 'ru' ? 'Все' : 'Barchasi'}
                    </button>
                    {categories
                      .find((c) => c.id === selectedCategory)
                      ?.subcategories.filter((sub) => sub.id !== 'all')
                      .map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubcategory(sub.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedSubcategory === sub.id
                              ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                              : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                          }`}
                        >
                          {language === 'ru' ? sub.name_ru : sub.name_uz}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="p-3.5">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                    <ListOrdered size={16} className="text-[#1B2A4A] dark:text-white" />
                  </div>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 font-medium">
                    {language === 'ru' ? 'Сортировка' : 'Saralash'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-12">
                  {[
                    { key: 'newest', ru: 'Сначала новые', uz: 'Avval yangilar' },
                    { key: 'popular', ru: 'Популярные', uz: 'Mashhur' },
                    { key: 'price_asc', ru: 'Цена ↑', uz: 'Narx ↑' },
                    { key: 'price_desc', ru: 'Цена ↓', uz: 'Narx ↓' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSortBy(s.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        sortBy === s.key
                          ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                          : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                      }`}
                    >
                      {language === 'ru' ? s.ru : s.uz}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border mx-auto mb-3 flex items-center justify-center">
              <Search size={24} className="text-[#8A8275] dark:text-gray-300" />
            </div>
            <p className="text-sm font-medium text-[#1B2A4A] dark:text-white mb-1">
              {language === 'ru' ? 'Товары не найдены' : 'Mahsulotlar topilmadi'}
            </p>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mb-4 px-2">
              {language === 'ru'
                ? 'Попробуйте изменить фильтры или выбрать другую категорию'
                : 'Filtrlarni o\'zgartirib ko\'ring yoki boshqa kategoriyani tanlang'}
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-6 py-2.5 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] text-sm font-bold hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors"
              >
                {language === 'ru' ? 'Сбросить фильтры' : 'Filtrlarni tozalash'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}