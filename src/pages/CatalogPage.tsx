import { useNavigate, useLocation } from 'react-router-dom'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../data/categories'
import { useState, useEffect } from 'react'
import {
  DollarSign,
  ListOrdered,
  SlidersHorizontal,
  Heart,
  Search,
} from 'lucide-react'
import IslandHeader from '../components/IslandHeader'
import { cacheProducts } from '../lib/productCache'

let catalogBrandsCache: any[] | null = null

export default function CatalogPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    language,
    currency,
    exchangeRate,
    saleModeEnabled,
    ensureProducts,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
  } = useStore()

  const categoryId = location.state?.category
  const subcategoryId = location.state?.subcategory
  const category = CATEGORIES.find((c) => c.id === categoryId)

  const [brands, setBrands] = useState<any[]>(() => catalogBrandsCache || [])
  const [loadingBrands, setLoadingBrands] = useState(() => !catalogBrandsCache)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState<number>(0)
  const [maxPrice, setMaxPrice] = useState<number>(100000000)
  const [sortBy, setSortBy] = useState<string>('newest')

  // ✅ Данные из общего кеша + клиентская фильтрация по категории/подкатегории
  const cachedItems = ensureProducts()
  const loading = !cachedItems
  const products = (cachedItems || []).filter((p: any) => {
    if (!categoryId || p.category !== categoryId) return false
    if (subcategoryId && p.subcategory !== subcategoryId) return false
    return true
  })

  useEffect(() => {
    loadBrands()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✅ Наполняем productCache (для мгновенного открытия карточек)
  useEffect(() => {
    if (products.length > 0) {
      cacheProducts(products)
    }
  }, [products])

  const loadBrands = async () => {
    if (catalogBrandsCache) {
      setBrands(catalogBrandsCache)
      setLoadingBrands(false)
      return
    }
    setLoadingBrands(true)
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
    } finally {
      setLoadingBrands(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...products]
    if (selectedBrands.length > 0) {
      filtered = filtered.filter((p) =>
        selectedBrands.some((brandId) => {
          const brand = brands.find((b: any) => b.id === brandId)
          return brand && p.name_ru?.toLowerCase().includes(brand.name.toLowerCase())
        })
      )
    }
    filtered = filtered.filter((p) => {
      const priceInSums = getEffectivePriceUsd(p, saleModeEnabled) * exchangeRate
      return priceInSums >= minPrice && priceInSums <= maxPrice
    })
    switch (sortBy) {
      case 'price_asc':
        filtered.sort(
          (a, b) => getEffectivePriceUsd(a, saleModeEnabled) - getEffectivePriceUsd(b, saleModeEnabled)
        )
        break
      case 'price_desc':
        filtered.sort(
          (a, b) => getEffectivePriceUsd(b, saleModeEnabled) - getEffectivePriceUsd(a, saleModeEnabled)
        )
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

  const filteredProducts = applyFiltersAndSort()

  const toggleBrand = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId) ? prev.filter((b) => b !== brandId) : [...prev, brandId]
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
    const sub = category?.subcategories.find((s) => s.id === subcategoryId)
    return sub ? (language === 'ru' ? sub.name_ru : sub.name_uz) : ''
  }

  // ✅ Карточка товара в стиле страницы заказа
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

        {/* ✅ Нижняя строка «Цена» — как «Итого» в деталях заказа */}
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

  // ✅ Лоадер — шапка-карточка + карточка со спиннером
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
        <IslandHeader needsBack={true} onBack={() => navigate(-1)} />
        <div className="p-4">
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                {language === 'ru' ? category?.name_ru : category?.name_uz}
              </h1>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <span className="text-xl leading-none">{category?.icon || '📦'}</span>
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
        {/* ✅ Шапка-карточка: эмодзи категории + название + подкатегория + счётчик */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <span className="text-2xl leading-none">{category?.icon || '📦'}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                {language === 'ru' ? category?.name_ru : category?.name_uz}
              </h1>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5 truncate">
                {getSubcategoryName()} · {language === 'ru' ? 'Найдено' : 'Topildi'}: {filteredProducts.length}
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#C9A961]/15 text-[#C9A961] whitespace-nowrap flex-shrink-0">
            {filteredProducts.length}
          </span>
        </div>

        {/* ✅ Карточка фильтров: кнопка toggle + строки с круглыми иконками */}
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

          {/* ✅ Панель фильтров: строки с круглыми иконками и разделителями */}
          {showFilters && (
            <div className="border-t border-[#E8E2D5] dark:border-dark-border divide-y divide-[#E8E2D5] dark:divide-dark-border">
              {/* Бренд — мультиселект */}
              <div className="p-3.5">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                    <span className="text-base leading-none">🏷️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#8A8275] dark:text-gray-300 font-medium">
                      {language === 'ru' ? 'Бренд' : 'Brend'}
                    </p>
                    {selectedBrands.length > 0 && (
                      <p className="text-[10px] text-[#C9A961] mt-0.5">
                        {language === 'ru' ? 'Выбрано' : 'Tanlangan'}: {selectedBrands.length}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-12 max-h-32 overflow-y-auto">
                  {loadingBrands ? (
                    <span className="text-xs text-[#8A8275] dark:text-gray-300">
                      {language === 'ru' ? 'Загрузка брендов...' : 'Brendlar yuklanmoqda...'}
                    </span>
                  ) : brands.length === 0 ? (
                    <span className="text-xs text-[#8A8275] dark:text-gray-300">
                      {language === 'ru' ? 'Бренды не найдены' : 'Brendlar topilmadi'}
                    </span>
                  ) : (
                    brands.map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() => toggleBrand(brand.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedBrands.includes(brand.id)
                            ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                            : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                        }`}
                      >
                        {brand.name}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Цена */}
              <div className="p-3.5">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                    <DollarSign size={16} className="text-[#1B2A4A] dark:text-white" />
                  </div>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 font-medium">
                    {language === 'ru' ? 'Цена (сум)' : 'Narx (so\'m)'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 ml-12">
                  <input
                    type="number"
                    value={minPrice === 0 ? '' : minPrice}
                    onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                    placeholder={language === 'ru' ? 'От' : 'Dan'}
                    className="w-full p-2 border border-[#E8E2D5] dark:border-dark-border rounded-lg bg-white dark:bg-dark-accent text-sm text-[#1B2A4A] dark:text-white placeholder:text-[#8A8275] dark:placeholder:text-gray-500 focus:outline-none focus:border-[#1B2A4A] dark:focus:border-gold"
                  />
                  <input
                    type="number"
                    value={maxPrice === 100000000 ? '' : maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value) || 100000000)}
                    placeholder={language === 'ru' ? 'До' : 'Gacha'}
                    className="w-full p-2 border border-[#E8E2D5] dark:border-dark-border rounded-lg bg-white dark:bg-dark-accent text-sm text-[#1B2A4A] dark:text-white placeholder:text-[#8A8275] dark:placeholder:text-gray-500 focus:outline-none focus:border-[#1B2A4A] dark:focus:border-gold"
                  />
                </div>
              </div>

              {/* Сортировка */}
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
                  <button
                    onClick={() => setSortBy('newest')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      sortBy === 'newest'
                        ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                        : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                    }`}
                  >
                    {language === 'ru' ? 'Сначала новые' : 'Avval yangilar'}
                  </button>
                  <button
                    onClick={() => setSortBy('oldest')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      sortBy === 'oldest'
                        ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                        : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                    }`}
                  >
                    {language === 'ru' ? 'Сначала старые' : 'Avval eskilar'}
                  </button>
                  <button
                    onClick={() => setSortBy('price_asc')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      sortBy === 'price_asc'
                        ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                        : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                    }`}
                  >
                    {language === 'ru' ? 'Цена ↑' : 'Narx ↑'}
                  </button>
                  <button
                    onClick={() => setSortBy('price_desc')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      sortBy === 'price_desc'
                        ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                        : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                    }`}
                  >
                    {language === 'ru' ? 'Цена ↓' : 'Narx ↓'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ✅ Результаты / пустое состояние */}
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
                ? 'Попробуйте сбросить фильтры или выбрать другую категорию'
                : 'Filtrlarni tozalab ko\'ring yoki boshqa kategoriyani tanlang'}
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