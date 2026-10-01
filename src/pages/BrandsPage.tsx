import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { cacheProducts } from '../lib/productCache'
import { CATEGORIES } from '../data/categories'
import { useState, useEffect } from 'react'
import {
  ChevronRight,
  Tag,
  DollarSign,
  ListOrdered,
  SlidersHorizontal,
  Heart,
  Package,
  Search,
  RefreshCw,
} from 'lucide-react'
import IslandHeader from '../components/IslandHeader'

interface Brand {
  id: string
  name: string
  is_active: boolean
}

// ✅ Module-level кеш: список брендов переживает размонтирование
let brandsListCache: Brand[] | null = null

export default function BrandsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // ✅ ВЫБРАННЫЙ БРЕНД ТЕПЕРЬ В URL: /brands?brand=<id>
  const brandParam = searchParams.get('brand')

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

  // ✅ Мгновенная инициализация из кеша
  const [brands, setBrands] = useState<Brand[]>(() => brandsListCache || [])
  const [loadingBrands, setLoadingBrands] = useState(() => !brandsListCache)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [minPrice, setMinPrice] = useState<number>(0)
  const [maxPrice, setMaxPrice] = useState<number>(100000000)
  const [sortBy, setSortBy] = useState<string>('newest')

  // ✅ Бренд выводится из URL — история и «назад» работают корректно
  const selectedBrand =
    brands.find((b) => b.id === brandParam || b.name === brandParam) || null

  // ✅ Данные из общего кеша + клиентская фильтрация по brand
  const cachedItems = ensureProducts()
  const products = (cachedItems || []).filter((p: any) => {
    if (!brandParam || !selectedBrand) return false
    return p.brand === selectedBrand.name
  })
  const loading = !cachedItems && !!brandParam

  // ✅ Загрузка брендов: async/await (без .catch на PromiseLike)
  useEffect(() => {
    loadBrands()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✅ Сброс фильтров при смене бренда
  useEffect(() => {
    setSelectedCategory('')
    setMinPrice(0)
    setMaxPrice(100000000)
    setSortBy('newest')
    setShowFilters(false)
  }, [brandParam])

  // ✅ Наполняем productCache (для мгновенного открытия карточек)
  useEffect(() => {
    if (products.length > 0) {
      cacheProducts(products)
    }
  }, [products])

  const loadBrands = async () => {
    if (brandsListCache) {
      setBrands(brandsListCache)
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
      brandsListCache = (data || []) as Brand[]
      setBrands(brandsListCache)
    } catch (error) {
      console.error('❌ Ошибка загрузки брендов:', error)
    } finally {
      setLoadingBrands(false)
    }
  }

  // ✅ ОБРАБОТЧИК ПОВТОРА — вынесен из JSX
  const retryLoadBrands = async () => {
    brandsListCache = null
    await loadBrands()
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
      filtered = filtered.filter((p) => p.category === selectedCategory)
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

  const filteredProducts = getFilteredAndSortedProducts()

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) +
    (minPrice !== 0 || maxPrice !== 100000000 ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0)

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
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

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <IslandHeader needsBack={true} onBack={handleBack} />

      <div className="p-4">
        {/* ✅ РЕЖИМ 1: Список брендов */}
        {!brandParam ? (
          <>
            {/* ✅ Шапка-карточка: заголовок + счётчик + круглая иконка (стиль страницы заказа) */}
            <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                  {language === 'ru' ? 'Бренды' : 'Brendlar'}
                </h1>
                <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                  {loadingBrands
                    ? (language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...')
                    : `${brands.length} ${language === 'ru' ? 'брендов' : 'ta brend'}`}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                <span className="text-xl leading-none">🏷️</span>
              </div>
            </div>

            {loadingBrands ? (
              <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B2A4A] dark:border-gold mx-auto mb-3"></div>
                <p className="text-sm text-[#8A8275] dark:text-gray-300">
                  {language === 'ru' ? 'Загрузка брендов...' : 'Brendlar yuklanmoqda...'}
                </p>
              </div>
            ) : brands.length === 0 ? (
              <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border mx-auto mb-3 flex items-center justify-center">
                  <Search size={24} className="text-[#8A8275] dark:text-gray-300" />
                </div>
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-white mb-1">
                  {language === 'ru' ? 'Бренды не найдены' : 'Brendlar topilmadi'}
                </p>
                <p className="text-xs text-[#8A8275] dark:text-gray-300 mb-4">
                  {language === 'ru' ? 'Попробуйте повторить загрузку' : 'Qayta yuklab ko\'ring'}
                </p>
                <button
                  onClick={retryLoadBrands}
                  className="px-6 py-2.5 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] text-sm font-bold hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors inline-flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  {language === 'ru' ? 'Повторить' : 'Qayta urinish'}
                </button>
              </div>
            ) : (
              /* ✅ Единая карточка брендов: строки с круглыми иконками и разделителями */
              <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border overflow-hidden divide-y divide-[#E8E2D5] dark:divide-dark-border">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => handleBrandClick(brand)}
                    className="w-full flex items-center gap-3 p-3.5 hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[#1B2A4A] dark:text-white">
                        {brand.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1B2A4A] dark:text-white truncate">
                        {brand.name}
                      </p>
                      <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                        {language === 'ru' ? 'Смотреть товары' : 'Mahsulotlarni ko\'rish'}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-[#8A8275] dark:text-gray-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ✅ РЕЖИМ 2: Товары конкретного бренда */
          <>
            {/* ✅ Шапка-карточка: бренд + счётчик + круглая иконка */}
            <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-[#1B2A4A] dark:text-white">
                    {selectedBrand?.name?.charAt(0).toUpperCase() || '🏷'}
                  </span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                    {selectedBrand?.name || (language === 'ru' ? 'Бренды' : 'Brendlar')}
                  </h1>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                    {loading
                      ? (language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...')
                      : `${filteredProducts.length} ${language === 'ru' ? 'товаров' : 'ta mahsulot'}`}
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                <Package size={18} className="text-[#1B2A4A] dark:text-white" />
              </div>
            </div>

            {/* ✅ Карточка фильтров: кнопка toggle + (если открыта) строки с иконками */}
            <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 overflow-hidden">
              {/* Кнопка toggle фильтров */}
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
                  {/* Категория */}
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
                        onClick={() => setSelectedCategory('')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedCategory === ''
                            ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                            : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                        }`}
                      >
                        {language === 'ru' ? 'Все' : 'Barchasi'}
                      </button>
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedCategory === cat.id
                              ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                              : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                          }`}
                        >
                          {language === 'ru' ? cat.name_ru : cat.name_uz}
                        </button>
                      ))}
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

            {/* ✅ Результаты / лоадер / пустое состояние */}
            {loading ? (
              <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B2A4A] dark:border-gold mx-auto mb-3"></div>
                <p className="text-sm text-[#8A8275] dark:text-gray-300">
                  {language === 'ru' ? 'Загрузка товаров...' : 'Mahsulotlar yuklanmoqda...'}
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border mx-auto mb-3 flex items-center justify-center">
                  <Search size={24} className="text-[#8A8275] dark:text-gray-300" />
                </div>
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-white mb-1">
                  {language === 'ru' ? 'Товары не найдены' : 'Mahsulotlar topilmadi'}
                </p>
                <p className="text-xs text-[#8A8275] dark:text-gray-300 mb-4 px-2">
                  {language === 'ru'
                    ? 'Попробуйте сбросить фильтры'
                    : 'Filtrlarni tozalab ko\'ring'}
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
          </>
        )}
      </div>
    </div>
  )
}