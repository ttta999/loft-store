import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { Search, X, Heart, Tag, DollarSign, SlidersHorizontal, ListOrdered } from 'lucide-react'

interface Brand {
  id: string
  name: string
  is_active: boolean
}

let searchBrandsCache: Brand[] | null = null

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const {
    language,
    currency,
    exchangeRate,
    saleModeEnabled,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    ensureProducts,
    ensureCategories,
  } = useStore()

  const cachedItems = ensureProducts()
  const loading = !cachedItems
  const products = cachedItems || []
  // ✅ Категории из БД
  const categories = ensureCategories() || []

  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000000])
  const [sortBy, setSortBy] = useState<string>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [brands, setBrands] = useState<Brand[]>(() => searchBrandsCache || [])
  const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(null)

  useEffect(() => {
    if (searchInputRef && !initialQuery) {
      searchInputRef.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInputRef])

  useEffect(() => {
    const load = async () => {
      if (searchBrandsCache) {
        setBrands(searchBrandsCache)
        return
      }
      try {
        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .eq('is_active', true)
          .order('name')
        if (error) throw error
        searchBrandsCache = (data || []) as Brand[]
        setBrands(searchBrandsCache)
      } catch (error) {
        console.error('❌ Ошибка загрузки брендов:', error)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [searchQuery, setSearchParams])

  useEffect(() => {
    const q = searchParams.get('q') || ''
    if (q !== searchQuery) setSearchQuery(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...products]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((p: any) => {
        const nameRu = (p.name_ru || '').toLowerCase()
        const nameUz = (p.name_uz || '').toLowerCase()
        return nameRu.includes(query) || nameUz.includes(query)
      })
    }
    if (selectedCategory) {
      filtered = filtered.filter((p: any) => p.category === selectedCategory)
    }
    if (selectedBrand) {
      const brand = brands.find((b: Brand) => b.id === selectedBrand)
      if (brand) {
        filtered = filtered.filter((p: any) => p.brand === brand.name)
      }
    }
    filtered = filtered.filter((p: any) => {
      const priceInSums = getEffectivePriceUsd(p, saleModeEnabled) * exchangeRate
      return priceInSums >= priceRange[0] && priceInSums <= priceRange[1]
    })
    switch (sortBy) {
      case 'price_asc':
        filtered.sort(
          (a: any, b: any) => getEffectivePriceUsd(a, saleModeEnabled) - getEffectivePriceUsd(b, saleModeEnabled)
        )
        break
      case 'price_desc':
        filtered.sort(
          (a: any, b: any) => getEffectivePriceUsd(b, saleModeEnabled) - getEffectivePriceUsd(a, saleModeEnabled)
        )
        break
      case 'newest':
        filtered.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        filtered.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
    }
    setFilteredProducts(filtered)
  }, [searchQuery, selectedCategory, selectedBrand, priceRange, sortBy, products, brands, saleModeEnabled, exchangeRate])

  useEffect(() => {
    applyFiltersAndSort()
  }, [applyFiltersAndSort])

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const clearFilters = () => {
    setSelectedCategory('')
    setSelectedBrand('')
    setPriceRange([0, 100000000])
    setSortBy('newest')
  }

  const clearAll = () => {
    setSearchQuery('')
    clearFilters()
  }

  const hasActiveFilters =
    selectedCategory || selectedBrand || priceRange[0] > 0 || priceRange[1] < 100000000 || sortBy !== 'newest'

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) +
    (selectedBrand ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 100000000 ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
        <div className="p-4">
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                {language === 'ru' ? 'Поиск' : 'Qidiruv'}
              </h1>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Search size={18} className="text-[#1B2A4A] dark:text-white" />
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
      <div className="p-4">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
              {language === 'ru' ? 'Поиск' : 'Qidiruv'}
            </h1>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
              {language === 'ru' ? 'Найдено' : 'Topildi'}: {filteredProducts.length}
              {searchQuery ? ` · «${searchQuery}»` : ''}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            <Search size={18} className="text-[#1B2A4A] dark:text-white" />
          </div>
        </div>

        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 overflow-hidden">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Search size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <input
              ref={setSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ru' ? 'Поиск по названию...' : 'Nomi bo\'yicha qidirish...'}
              className="flex-1 bg-transparent text-sm font-medium text-[#1B2A4A] dark:text-white focus:outline-none placeholder:text-[#8A8275] dark:placeholder:text-gray-500"
            />
            {searchQuery && (
              <button
                onClick={clearAll}
                title={language === 'ru' ? 'Очистить' : 'Tozalash'}
                className="w-8 h-8 rounded-lg text-[#8A8275] dark:text-gray-300 hover:text-[#1B2A4A] dark:hover:text-white hover:bg-[#F5F1E8] dark:hover:bg-dark-accent flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E8E2D5] dark:border-dark-border transition-colors ${
              hasActiveFilters
                ? 'bg-[#F5F1E8] dark:bg-dark-accent'
                : 'bg-[#F5F1E8]/60 dark:bg-dark-accent/40'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                hasActiveFilters
                  ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                  : 'bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border'
              }`}>
                <SlidersHorizontal size={16} className={hasActiveFilters ? 'text-white dark:text-[#1B2A4A]' : 'text-[#1B2A4A] dark:text-white'} />
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
            {hasActiveFilters && (
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
        </div>

        {showFilters && (
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 overflow-hidden divide-y divide-[#E8E2D5] dark:divide-dark-border">
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
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === ''
                      ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                      : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                  }`}
                >
                  {language === 'ru' ? 'Все' : 'Barchasi'}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
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

            <div className="p-3.5">
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                  <span className="text-base leading-none">🏷️</span>
                </div>
                <p className="text-xs text-[#8A8275] dark:text-gray-300 font-medium">
                  {language === 'ru' ? 'Бренд' : 'Brend'}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 ml-12 max-h-32 overflow-y-auto">
                <button
                  onClick={() => setSelectedBrand('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedBrand === ''
                      ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                      : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                  }`}
                >
                  {language === 'ru' ? 'Все' : 'Barchasi'}
                </button>
                {brands.map((brand: Brand) => (
                  <button
                    key={brand.id}
                    onClick={() => setSelectedBrand(selectedBrand === brand.id ? '' : brand.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedBrand === brand.id
                        ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                        : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border'
                    }`}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>

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
                  value={priceRange[0] === 0 ? '' : priceRange[0]}
                  onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                  placeholder={language === 'ru' ? 'От' : 'Dan'}
                  className="w-full p-2 border border-[#E8E2D5] dark:border-dark-border rounded-lg bg-white dark:bg-dark-accent text-sm text-[#1B2A4A] dark:text-white placeholder:text-[#8A8275] dark:placeholder:text-gray-500 focus:outline-none focus:border-[#1B2A4A] dark:focus:border-gold"
                />
                <input
                  type="number"
                  value={priceRange[1] === 100000000 ? '' : priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 100000000])}
                  placeholder={language === 'ru' ? 'До' : 'Gacha'}
                  className="w-full p-2 border border-[#E8E2D5] dark:border-dark-border rounded-lg bg-white dark:bg-dark-accent text-sm text-[#1B2A4A] dark:text-white placeholder:text-[#8A8275] dark:placeholder:text-gray-500 focus:outline-none focus:border-[#1B2A4A] dark:focus:border-gold"
                />
              </div>
            </div>

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
                ? 'Попробуйте изменить запрос или сбросить фильтры'
                : 'So\'rovni o\'zgartirib ko\'ring yoki filtrlarni tozalang'}
            </p>
            {(searchQuery || hasActiveFilters) && (
              <button
                onClick={clearAll}
                className="px-6 py-2.5 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] text-sm font-bold hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors"
              >
                {language === 'ru' ? 'Сбросить всё' : 'Hammasini tozalash'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product: any) => {
              const onSale = isProductOnSale(product, saleModeEnabled)
              const effectivePrice = getEffectivePriceUsd(product, saleModeEnabled)
              const discountPercent = onSale
                ? Math.round((1 - Number(product.sale_price) / Number(product.price_usd)) * 100)
                : 0
              const favorite = isFavorite(product.id)

              return (
                <Link key={product.id} to={`/product/${product.id}`} className="block">
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
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}