import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { Heart, Filter } from 'lucide-react'
import { CATEGORIES } from '../data/categories'
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
  } = useStore((state) => ({
    language: state.language,
    currency: state.currency,
    exchangeRate: state.exchangeRate,
    saleModeEnabled: state.saleModeEnabled,
    addToFavorites: state.addToFavorites,
    removeFromFavorites: state.removeFromFavorites,
    isFavorite: state.isFavorite,
    popularityMap: state.popularityMap,
    getPopularityAge: state.getPopularityAge,
  }))

  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>(location.state?.sortBy || 'newest')

  const hasLoadedRef = useRef(false)
  const hasLoadedPopularityRef = useRef(false)

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadProducts()
  }, [])

  // ✅ Подгружаем популярность если нужно (для сортировки «popular»)
  useEffect(() => {
    if (hasLoadedPopularityRef.current) return
    hasLoadedPopularityRef.current = true

    if (getPopularityAge() > POPULARITY_FRESH_MS) {
      useStore.getState().updatePopularity()
    }
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [selectedCategory, selectedSubcategory, sortBy, products, popularityMap])

  const loadProducts = async () => {
    setLoading(true)
    const data = await getProducts()
    setProducts(data)
    setFilteredProducts(data)
    setLoading(false)
  }

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
      filtered.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } else if (sortBy === 'popular') {
      // ✅ РЕАЛЬНАЯ СОРТИРОВКА по статистике продаж
      // Товары с продажами — сверху, без продаж — снизу
      filtered.sort((a, b) => (pop[b.id] || 0) - (pop[a.id] || 0))
    } else if (sortBy === 'price_asc') {
      filtered.sort(
        (a, b) =>
          getEffectivePriceUsd(a, saleModeEnabled) - getEffectivePriceUsd(b, saleModeEnabled)
      )
    } else if (sortBy === 'price_desc') {
      filtered.sort(
        (a, b) =>
          getEffectivePriceUsd(b, saleModeEnabled) - getEffectivePriceUsd(a, saleModeEnabled)
      )
    }

    setFilteredProducts(filtered)
  }

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const getTitle = () => {
    if (sortBy === 'newest') {
      return language === 'ru' ? '✨ Новые товары' : '✨ Yangi mahsulotlar'
    } else if (sortBy === 'popular') {
      return language === 'ru' ? '🔥 Популярные товары' : '🔥 Mashhur mahsulotlar'
    }
    return language === 'ru' ? 'Все товары' : 'Barcha mahsulotlar'
  }

  const ProductCard = ({ product }: { product: any }) => {
    const onSale = isProductOnSale(product, saleModeEnabled)
    const effectivePrice = getEffectivePriceUsd(product, saleModeEnabled)
    return (
      <div
        onClick={() => navigate(`/product/${product.id}`)}
        className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-[#E8E2D5] dark:border-dark-border cursor-pointer"
      >
        <div className="aspect-square bg-[#F5F1E8] dark:bg-dark-accent relative">
          <img
            src={product.images?.[0] || 'https://via.placeholder.com/500'}
            alt={language === 'ru' ? product.name_ru : product.name_uz}
            className="w-full h-full object-cover"
          />
          {onSale && (
            <span className="absolute top-2 left-2 bg-[#9B3B3B] text-white text-xs font-bold px-2 py-1 rounded-full">
              -{Math.round((1 - Number(product.sale_price) / Number(product.price_usd)) * 100)}%
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (isFavorite(product.id)) {
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
                isFavorite(product.id) ? 'fill-[#9B3B3B] text-[#9B3B3B]' : 'text-[#8A8275] dark:text-gray-300'
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
          <p
            className={`font-bold mt-1 ${
              onSale ? 'text-[#9B3B3B] dark:text-red-400' : 'text-[#1B2A4A] dark:text-white'
            }`}
          >
            {formatPrice(effectivePrice)}
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2A4A] dark:border-gold mx-auto mb-4"></div>
          <p className="text-[#8A8275] dark:text-gray-300">
            {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <IslandHeader needsBack={true} onBack={() => navigate(-1)} />

      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4 text-[#1B2A4A] dark:text-white">{getTitle()}</h2>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full p-3 rounded-2xl border border-[#E8E2D5] dark:border-dark-border flex items-center justify-between bg-[#FBF9F4] dark:bg-dark-card mb-4"
        >
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-[#1B2A4A] dark:text-white" />
            <span className="font-medium text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? 'Фильтры и сортировка' : 'Filtrlar va saralash'}
            </span>
          </div>
        </button>

        {showFilters && (
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 mb-4 border border-[#E8E2D5] dark:border-dark-border space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
                {language === 'ru' ? 'Категория' : 'Kategoriya'}
              </h3>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setSelectedSubcategory('all')
                }}
                className="w-full p-3 border border-[#E8E2D5] dark:border-dark-border rounded-xl bg-white dark:bg-dark-accent text-[#1B2A4A] dark:text-white focus:outline-none focus:border-gold"
              >
                <option value="all">{language === 'ru' ? 'Все' : 'Barchasi'}</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {language === 'ru' ? cat.name_ru : cat.name_uz}
                  </option>
                ))}
              </select>
            </div>

            {selectedCategory !== 'all' && (
              <div>
                <h3 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
                  {language === 'ru' ? 'Подкатегория' : 'Pastki kategoriya'}
                </h3>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="w-full p-3 border border-[#E8E2D5] dark:border-dark-border rounded-xl bg-white dark:bg-dark-accent text-[#1B2A4A] dark:text-white focus:outline-none focus:border-gold"
                >
                  <option value="all">{language === 'ru' ? 'Все' : 'Barchasi'}</option>
                  {CATEGORIES.find((c) => c.id === selectedCategory)?.subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {language === 'ru' ? sub.name_ru : sub.name_uz}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <h3 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
                {language === 'ru' ? 'Сортировка' : 'Saralash'}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSortBy('newest')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    sortBy === 'newest'
                      ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#1B2A4A] dark:text-gray-300'
                  }`}
                >
                  {language === 'ru' ? 'Сначала новые' : 'Avval yangilar'}
                </button>
                <button
                  onClick={() => setSortBy('popular')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    sortBy === 'popular'
                      ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#1B2A4A] dark:text-gray-300'
                  }`}
                >
                  {language === 'ru' ? 'Популярные' : 'Mashhur'}
                </button>
                <button
                  onClick={() => setSortBy('price_asc')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    sortBy === 'price_asc'
                      ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#1B2A4A] dark:text-gray-300'
                  }`}
                >
                  {language === 'ru' ? 'Цена ↑' : 'Narx ↑'}
                </button>
                <button
                  onClick={() => setSortBy('price_desc')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    sortBy === 'price_desc'
                      ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#1B2A4A] dark:text-gray-300'
                  }`}
                >
                  {language === 'ru' ? 'Цена ↓' : 'Narx ↓'}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-[#8A8275] dark:text-gray-300 mb-3">
          {language === 'ru' ? 'Найдено:' : 'Topildi:'} {filteredProducts.length}
        </p>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#8A8275] dark:text-gray-300">
              {language === 'ru' ? 'Товары не найдены' : 'Mahsulotlar topilmadi'}
            </p>
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