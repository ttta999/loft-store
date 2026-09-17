import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { cacheProducts } from '../lib/productCache'
import { CATEGORIES } from '../data/categories'
import { useState, useEffect } from 'react'
import { Filter, ArrowUpDown, Loader2 } from 'lucide-react'
import IslandHeader from '../components/IslandHeader'

interface Brand {
  id: string
  name: string
  is_active: boolean
}

// ✅ Module-level кеш: список брендов и товары бренда переживают размонтирование
const brandProductsCache: Record<string, any[]> = {}
let brandsListCache: Brand[] | null = null

export default function BrandsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ✅ ВЫБРАННЫЙ БРЕНД ТЕПЕРЬ В URL: /brands?brand=<id>
  const brandParam = searchParams.get('brand')

  const { language, currency, exchangeRate, saleModeEnabled } = useStore()

  // ✅ Мгновенная инициализация из кеша
  const [brands, setBrands] = useState<Brand[]>(() => brandsListCache || [])
  const [loadingBrands, setLoadingBrands] = useState(() => !brandsListCache)
  const [products, setProducts] = useState<any[]>(() =>
    brandParam ? brandProductsCache[brandParam] || [] : []
  )
  const [loading, setLoading] = useState(() =>
    brandParam ? !brandProductsCache[brandParam] : false
  )
  const [showFilters, setShowFilters] = useState(false)

  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [minPrice, setMinPrice] = useState<number>(0)
  const [maxPrice, setMaxPrice] = useState<number>(100000000)
  const [sortBy, setSortBy] = useState<string>('newest')

  // ✅ Бренд выводится из URL — история и «назад» работают корректно
  const selectedBrand =
    brands.find(b => b.id === brandParam || b.name === brandParam) || null

  useEffect(() => {
    if (brandsListCache) {
      setBrands(brandsListCache)
      setLoadingBrands(false)
      return
    }
    loadBrands()
  }, [])

  // ✅ Сброс фильтров при смене бренда
  useEffect(() => {
    setSelectedCategory('')
    setMinPrice(0)
    setMaxPrice(100000000)
    setSortBy('newest')
    setShowFilters(false)
  }, [brandParam])

  // ✅ Загрузка товаров бренда (мгновенно из кеша, если есть)
  useEffect(() => {
    if (!brandParam) {
      setProducts([])
      setLoading(false)
      return
    }
    const cached = brandProductsCache[brandParam]
    if (cached) {
      setProducts(cached)
      setLoading(false)
      return
    }
    const brand = brands.find(b => b.id === brandParam || b.name === brandParam)
    if (brand) loadBrandProducts(brand)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandParam, brands])

  const loadBrands = async () => {
    setLoadingBrands(true)
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      brandsListCache = data || []
      setBrands(brandsListCache)
    } catch (error) {
      console.error('❌ Ошибка загрузки брендов:', error)
    }
    setLoadingBrands(false)
  }

  const loadBrandProducts = async (brand: Brand) => {
    const cached = brandProductsCache[brand.id]
    if (cached) {
      setProducts(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('brand', brand.name)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('❌ Ошибка поиска товаров:', error)
      setProducts([])
    } else {
      const items = data || []
      brandProductsCache[brand.id] = items
      // ✅ Наполняем общий кеш — карточки товаров открываются мгновенно
      cacheProducts(items)
      setProducts(items)
    }
    setLoading(false)
  }

  const handleBrandClick = (brand: Brand) => {
    // ✅ PUSH новой записи истории с брендом в URL
    navigate(`/brands?brand=${encodeURIComponent(brand.id)}`)
  }

  const handleBack = () => {
    const idx = (window.history.state as any)?.idx
    const canPop = typeof idx === 'number' && idx > 0
    if (canPop) {
      navigate(-1)
    } else {
      // ✅ Фолбэк для прямого входа по ссылке
      navigate(brandParam ? '/brands' : '/')
    }
  }

  const clearFilters = () => {
    setSelectedCategory('')
    setMinPrice(0)
    setMaxPrice(100000000)
    setSortBy('newest')
  }

  const getFilteredAndSortedProducts = () => {
    let filtered = [...products]
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }
    filtered = filtered.filter(p => {
      const priceInSums = getEffectivePriceUsd(p, saleModeEnabled) * exchangeRate
      return priceInSums >= minPrice && priceInSums <= maxPrice
    })
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => getEffectivePriceUsd(a, saleModeEnabled) - getEffectivePriceUsd(b, saleModeEnabled))
        break
      case 'price_desc':
        filtered.sort((a, b) => getEffectivePriceUsd(b, saleModeEnabled) - getEffectivePriceUsd(a, saleModeEnabled))
        break
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
    }
    return filtered
  }

  const filteredProducts = getFilteredAndSortedProducts()

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) +
    (minPrice !== 0 || maxPrice !== 100000000 ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0)

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <IslandHeader
        needsBack={true}
        onBack={handleBack}
      />

      <div className="p-4">
        {!brandParam ? (
          <>
            <h2 className="text-xl font-bold mb-1 text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? 'Бренды' : 'Brendlar'}
            </h2>
            <p className="text-sm text-[#8A8275] dark:text-gray-300 mb-4">
              {language === 'ru'
                ? 'Выберите бренд чтобы увидеть товары'
                : 'Mahsulotlarni ko\'rish uchun brendni tanlang'}
            </p>

            {loadingBrands ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#8A8275] dark:text-gold" />
                <p className="text-[#8A8275] dark:text-gray-300">
                  {language === 'ru' ? 'Загрузка брендов...' : 'Brendlar yuklanmoqda...'}
                </p>
              </div>
            ) : brands.length === 0 ? (
              <div className="text-center py-12 text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Бренды не найдены' : 'Brendlar topilmadi'}
                <button
                  onClick={loadBrands}
                  className="mt-4 px-4 py-2 bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] rounded-xl text-sm"
                >
                  🔄 {language === 'ru' ? 'Повторить' : 'Qayta urinish'}
                </button>
              </div>
            ) : (
              <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-[#E8E2D5] dark:border-dark-border">
                {brands.map((brand, index) => (
                  <button
                    key={brand.id}
                    onClick={() => handleBrandClick(brand)}
                    className={`w-full flex items-center justify-between p-4 hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors ${
                      index !== brands.length - 1 ? 'border-b border-[#E8E2D5] dark:border-dark-border' : ''
                    }`}
                  >
                    <span className="font-medium text-base text-[#1B2A4A] dark:text-white">{brand.name}</span>
                    <span className="text-[#8A8275] dark:text-gray-300 text-xl">›</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-1 text-[#1B2A4A] dark:text-white">
              {selectedBrand?.name || (language === 'ru' ? 'Бренды' : 'Brendlar')}
            </h2>
            <p className="text-sm text-[#8A8275] dark:text-gray-300 mb-4">
              {filteredProducts.length} {language === 'ru' ? 'товаров' : 'mahsulotlar'}
            </p>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full p-3 rounded-2xl border flex items-center justify-between mb-4 ${
                activeFiltersCount > 0
                  ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] border-[#1B2A4A] dark:border-gold'
                  : 'bg-[#FBF9F4] dark:bg-dark-card border-[#E8E2D5] dark:border-dark-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter size={20} />
                <span className="font-medium text-[#1B2A4A] dark:text-white">
                  {language === 'ru' ? 'Фильтры и сортировка' : 'Filtrlar va saralash'}
                </span>
                {activeFiltersCount > 0 && (
                  <span className="bg-white dark:bg-dark-accent text-[#1B2A4A] dark:text-white text-xs px-2 py-1 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFilters()
                  }}
                  className="text-sm underline text-[#1B2A4A] dark:text-[#1B2A4A]"
                >
                  {language === 'ru' ? 'Сбросить' : 'Tozalash'}
                </button>
              )}
            </button>

            {showFilters && (
              <div className="bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border rounded-2xl p-4 mb-4">
                <div className="mb-4">
                  <h3 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
                    {language === 'ru' ? 'Категория' : 'Kategoriya'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        selectedCategory === ''
                          ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                          : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#1B2A4A] dark:text-gray-300'
                      }`}
                    >
                      {language === 'ru' ? 'Все' : 'Barchasi'}
                    </button>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          selectedCategory === cat.id
                            ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                            : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#1B2A4A] dark:text-gray-300'
                        }`}
                      >
                        {language === 'ru' ? cat.name_ru : cat.name_uz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
                    {language === 'ru' ? 'Цена (сум)' : 'Narx (so\'m)'}
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={minPrice === 0 ? '' : minPrice}
                      onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                      placeholder={language === 'ru' ? 'От' : 'Dan'}
                      className="w-full p-2 border border-[#E8E2D5] dark:border-dark-border rounded-xl bg-white dark:bg-dark-accent text-[#1B2A4A] dark:text-white placeholder:text-[#8A8275] dark:placeholder:text-gray-500 focus:outline-none focus:border-gold"
                    />
                    <input
                      type="number"
                      value={maxPrice === 100000000 ? '' : maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value) || 100000000)}
                      placeholder={language === 'ru' ? 'До' : 'Gacha'}
                      className="w-full p-2 border border-[#E8E2D5] dark:border-dark-border rounded-xl bg-white dark:bg-dark-accent text-[#1B2A4A] dark:text-white placeholder:text-[#8A8275] dark:placeholder:text-gray-500 focus:outline-none focus:border-gold"
                    />
                  </div>
                  <p className="text-xs text-[#8A8275] dark:text-gray-400 mt-1">
                    {language === 'ru' ? 'Введите цену в сумах' : 'Narxni so\'mda kiriting'}
                  </p>
                </div>

                <div>
                  <h3 className="font-bold mb-2 flex items-center gap-2 text-[#1B2A4A] dark:text-white">
                    <ArrowUpDown size={16} />
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
                      onClick={() => setSortBy('oldest')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        sortBy === 'oldest'
                          ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                          : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#1B2A4A] dark:text-gray-300'
                      }`}
                    >
                      {language === 'ru' ? 'Сначала старые' : 'Avval eskilar'}
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

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B2A4A] dark:border-gold mx-auto"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Товары не найдены' : 'Mahsulotlar topilmadi'}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map(product => {
                  const onSale = isProductOnSale(product, saleModeEnabled)
                  const effectivePrice = getEffectivePriceUsd(product, saleModeEnabled)
                  return (
                    <div
                      key={product.id}
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden cursor-pointer border border-[#E8E2D5] dark:border-dark-border"
                    >
                      {product.images?.[0] && (
                        <div className="relative">
                          <img
                            src={product.images[0]}
                            alt={product.name_ru}
                            className="w-full h-32 object-cover"
                          />
                          {onSale && (
                            <span className="absolute top-2 left-2 bg-[#9B3B3B] text-white text-xs font-bold px-2 py-1 rounded-full">
                              -{Math.round((1 - Number(product.sale_price) / Number(product.price_usd)) * 100)}%
                            </span>
                          )}
                        </div>
                      )}
                      <div className="p-3">
                        <p className="font-medium text-sm truncate text-[#1B2A4A] dark:text-white">
                          {language === 'ru' ? product.name_ru : product.name_uz}
                        </p>
                        {onSale && (
                          <p className="text-[#8A8275] dark:text-gray-500 text-xs line-through mt-1">
                            {formatPrice(product.price_usd)}
                          </p>
                        )}
                        <p className={`text-lg font-bold mt-1 ${onSale ? 'text-[#9B3B3B] dark:text-red-400' : 'text-[#1B2A4A] dark:text-white'}`}>
                          {formatPrice(effectivePrice)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}