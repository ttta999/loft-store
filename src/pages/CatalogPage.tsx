import { useNavigate, useLocation } from 'react-router-dom'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../data/categories'
import { useState, useEffect } from 'react'
import { Filter, ArrowUpDown } from 'lucide-react'
import IslandHeader from '../components/IslandHeader'
import { cacheProducts } from '../lib/productCache'

const catalogProductsCache: Record<string, any[]> = {}
let catalogBrandsCache: any[] | null = null

export default function CatalogPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, currency, exchangeRate, saleModeEnabled } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [brands, setBrands] = useState<any[]>([])

  const categoryId = location.state?.category
  const subcategoryId = location.state?.subcategory
  const category = CATEGORIES.find(c => c.id === categoryId)
  const cacheKey = `${categoryId || 'all'}_${subcategoryId || 'all'}`

  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState<number>(0)
  const [maxPrice, setMaxPrice] = useState<number>(100000000)
  const [sortBy, setSortBy] = useState<string>('newest')

  useEffect(() => {
    loadBrands()
  }, [])

  useEffect(() => {
    if (categoryId) {
      loadProducts()
    }
  }, [categoryId, subcategoryId])

  useEffect(() => {
    applyFiltersAndSort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrands, minPrice, maxPrice, sortBy, products, brands])

  const loadBrands = async () => {
    // ✅ Бренды тоже из module-level кеша
    if (catalogBrandsCache) {
      setBrands(catalogBrandsCache)
      return
    }
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      catalogBrandsCache = data || []
      setBrands(catalogBrandsCache)
    } catch (error) {
      console.error('Ошибка загрузки брендов:', error)
    }
  }

  const loadProducts = async () => {
    // ✅ Мгновенный рендер из кеша (без лоадера) — ключ к точному скроллу
    const cached = catalogProductsCache[cacheKey]
    if (cached) {
      setProducts(cached)
      setFilteredProducts(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('category', categoryId)
        .eq('is_active', true)
      if (subcategoryId) {
        query = query.eq('subcategory', subcategoryId)
      }
      const { data, error } = await query
      if (error) throw error
      const items = data || []

      // ✅ Сохраняем в module-level кеш каталога
      catalogProductsCache[cacheKey] = items
      // ✅ Наполняем ОБЩИЙ кеш — карточки товаров откроются мгновенно
      cacheProducts(items)

      setProducts(items)
      setFilteredProducts(items)
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error)
      setProducts([])
      setFilteredProducts([])
    }
    setLoading(false)
  }

  const applyFiltersAndSort = () => {
    let filtered = [...products]
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(p =>
        selectedBrands.some(brandId => {
          const brand = brands.find(b => b.id === brandId)
          return brand && p.name_ru.toLowerCase().includes(brand.name.toLowerCase())
        })
      )
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
    setFilteredProducts(filtered)
  }

  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandId)
        ? prev.filter(b => b !== brandId)
        : [...prev, brandId]
    )
  }

  const clearFilters = () => {
    setSelectedBrands([])
    setMinPrice(0)
    setMaxPrice(100000000)
    setSortBy('newest')
  }

  const activeFiltersCount =
    selectedBrands.length +
    (minPrice !== 0 || maxPrice !== 100000000 ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0)

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const getSubcategoryName = () => {
    if (!subcategoryId) {
      return language === 'ru' ? 'Все товары' : 'Barcha mahsulotlar'
    }
    const sub = category?.subcategories.find(s => s.id === subcategoryId)
    return sub ? (language === 'ru' ? sub.name_ru : sub.name_uz) : ''
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <IslandHeader
        needsBack={true}
        onBack={() => navigate(-1)}
      />

      <div className="p-4">
        <h2 className="text-xl font-bold mb-1 text-[#1B2A4A] dark:text-white">
          {language === 'ru' ? category?.name_ru : category?.name_uz}
        </h2>
        <p className="text-sm text-[#8A8275] dark:text-gray-300 mb-4">
          {getSubcategoryName()}
        </p>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`w-full p-3 rounded-xl border flex items-center justify-between mb-4 ${
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
          <div className="bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border rounded-xl p-4 mb-4">
            <div className="mb-4">
              <h3 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
                {language === 'ru' ? 'Бренд' : 'Brend'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => toggleBrand(brand.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedBrands.includes(brand.id)
                        ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                        : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#1B2A4A] dark:text-gray-300 hover:bg-[#E8E2D5]/70 dark:hover:bg-dark-border'
                    }`}
                  >
                    {brand.name}
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
                  className="w-full p-2 border border-[#E8E2D5] dark:border-dark-border rounded-lg bg-white dark:bg-dark-accent text-[#1B2A4A] dark:text-white placeholder:text-[#8A8275] dark:placeholder:text-gray-500 focus:outline-none focus:border-gold"
                />
                <input
                  type="number"
                  value={maxPrice === 100000000 ? '' : maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value) || 100000000)}
                  placeholder={language === 'ru' ? 'До' : 'Gacha'}
                  className="w-full p-2 border border-[#E8E2D5] dark:border-dark-border rounded-lg bg-white dark:bg-dark-accent text-[#1B2A4A] dark:text-white placeholder:text-[#8A8275] dark:placeholder:text-gray-500 focus:outline-none focus:border-gold"
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

        <p className="text-sm text-[#8A8275] dark:text-gray-300 mb-3">
          {language === 'ru'
            ? `Найдено: ${filteredProducts.length}`
            : `Topildi: ${filteredProducts.length}`}
        </p>

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
                  className="bg-[#FBF9F4] dark:bg-dark-card rounded-xl shadow-sm overflow-hidden cursor-pointer border border-[#E8E2D5] dark:border-dark-border"
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
      </div>
    </div>
  )
}