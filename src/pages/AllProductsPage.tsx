import ProductCard from '../components/ProductCard'
import { ChevronDown } from 'lucide-react'
import Collapse from '../components/Collapse'
import { usePageState } from '../lib/usePageState'
import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore, getEffectivePriceUsd, filterVisibleProducts } from '../store/useStore'
import { Tag, Layers, ListOrdered, SlidersHorizontal, Package, Sparkles, Flame, Search } from 'lucide-react'
import IslandHeader from '../components/IslandHeader'
import CategoryIcon from '../components/CategoryIcon'

const POPULARITY_FRESH_MS = 10 * 60 * 1000

export default function AllProductsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    language,
    saleModeEnabled,
    popularityMap,
    getPopularityAge,
    ensureProducts,
    ensureCategories,
  } = useStore()

  const categoriesRaw = ensureCategories()
  const categories = categoriesRaw || []

  const [showFilters, setShowFilters] = usePageState('showFilters', false)
  const [selectedCategory, setSelectedCategory] = usePageState<string>('selectedCategory', 'all')
  const [selectedSubcategory, setSelectedSubcategory] = usePageState<string>('selectedSubcategory', 'all')
  const [sortBy, setSortBy] = usePageState<string>('sortBy', location.state?.sortBy || 'newest')

  const hasLoadedPopularityRef = useRef(false)

  const cachedItems = ensureProducts()
  const loading = !cachedItems
  const products = filterVisibleProducts(cachedItems || [], categoriesRaw)

  useEffect(() => {
    if (hasLoadedPopularityRef.current) return
    hasLoadedPopularityRef.current = true
    if (getPopularityAge() > POPULARITY_FRESH_MS) {
      useStore.getState().updatePopularity()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFiltersAndSort = () => {
    let filtered = location.state?.sortBy === 'sale' ? products.filter(product => saleModeEnabled && Number(product.sale_price) > 0) : [...products]
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

  const headerConfig = (() => {
    if (location.state?.sortBy === 'sale') return { title: language === 'ru' ? 'Скидки' : 'Chegirmalar', icon: <Tag size={18} className="text-[#1B2A4A] dark:text-white" /> }
    if (sortBy === 'newest') {
      return {
        title: language === 'ru' ? 'Новые товары' : 'Yangi mahsulotlar',
        icon: <Sparkles size={18} className="text-[#1B2A4A] dark:text-white" />,
      }
    }
    if (sortBy === 'popular') {
      return {
        title: language === 'ru' ? 'Популярные товары' : 'Mashhur mahsulotlar',
        icon: <Flame size={18} className="text-[#1B2A4A] dark:text-white" />,
      }
    }
    return {
      title: language === 'ru' ? 'Все товары' : 'Barcha mahsulotlar',
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

  if (loading) {
    return (
      <div style={{ overflowAnchor: 'none' }} className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
        <IslandHeader needsBack={true} onBack={() => navigate(-1)} />
        <div data-loft-content className="p-4">
          <div data-surface={`products:${location.state?.sortBy || "newest"}`} className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
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
    <div style={{ overflowAnchor: 'none' }} className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <IslandHeader needsBack={true} onBack={() => navigate(-1)} />
      <div data-loft-content className="p-4">
        <div data-surface={`products:${location.state?.sortBy || "newest"}`} className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              {headerConfig.icon}
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
          <div
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
              activeFiltersCount > 0
                ? 'bg-[#F5F1E8] dark:bg-dark-accent'
                : 'bg-[#F5F1E8]/60 dark:bg-dark-accent/40'
            }`}
          >
            <button type="button" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
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
                <Collapse open={activeFiltersCount > 0}>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                    {language === 'ru' ? 'Активных фильтров' : 'Faol filtrlar'}: {activeFiltersCount}
                  </p>
                </Collapse>
              </div>
            <ChevronDown size={16} style={{ rotate: showFilters ? "180deg" : "0deg", transition: "rotate 220ms ease-out" }} className="shrink-0 text-[#8A8275] dark:text-gray-300" /></button>
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
          </div>

          <Collapse open={showFilters}><div data-collection-filters className="border-t border-[#E8E2D5] dark:border-dark-border divide-y divide-[#E8E2D5] dark:divide-dark-border">
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        selectedCategory === cat.id
                          ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                          : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                      }`}
                    >
                      <CategoryIcon name={cat.icon} size={12} className="inline" />
                      <span>{language === 'ru' ? cat.name_ru : cat.name_uz}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Collapse open={selectedCategory !== 'all'}>
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
              </Collapse>

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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
            </div></Collapse>
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
              <ProductCard key={product.id} product={product} placement={`all-${location.state?.sortBy || "newest"}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}