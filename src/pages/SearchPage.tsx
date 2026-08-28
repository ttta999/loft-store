import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { getProducts, supabase } from '../lib/supabase'
import { Search, Filter, X, Heart, ArrowUpDown } from 'lucide-react'

interface Brand {
  id: string
  name: string
  is_active: boolean
}

export default function SearchPage() {
  const { language, currency, exchangeRate, saleModeEnabled, addToFavorites, removeFromFavorites, isFavorite } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000000])
  const [sortBy, setSortBy] = useState<string>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [brands, setBrands] = useState<Brand[]>([])

  const categories = [
    { id: 'shoes', name_ru: 'Обувь', name_uz: 'Oyoq kiyim' },
    { id: 'clothes', name_ru: 'Одежда', name_uz: 'Kiyim' },
    { id: 'accessories', name_ru: 'Аксессуары', name_uz: 'Aksessuarlar' },
  ]

  useEffect(() => {
    loadBrands()
    loadProducts()
  }, [])

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      setBrands(data || [])
    } catch (error) {
      console.error('❌ Ошибка загрузки брендов:', error)
    }
  }

  useEffect(() => {
    applyFiltersAndSort()
  }, [searchQuery, selectedCategory, selectedBrand, priceRange, sortBy, products, brands])

  const loadProducts = async () => {
    setLoading(true)
    const data = await getProducts()
    setProducts(data)
    setFilteredProducts(data)
    setLoading(false)
  }

  const applyFiltersAndSort = () => {
    let filtered = [...products]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((p: any) =>
        (language === 'ru' ? p.name_ru : p.name_uz).toLowerCase().includes(query)
      )
    }
    if (selectedCategory) {
      filtered = filtered.filter((p: any) => p.category === selectedCategory)
    }
    if (selectedBrand) {
      const brand = brands.find((b: Brand) => b.id === selectedBrand)
      if (brand) {
        filtered = filtered.filter((p: any) =>
          p.name_ru.toLowerCase().includes(brand.name.toLowerCase())
        )
      }
    }
    filtered = filtered.filter((p: any) => {
      const priceInSums = getEffectivePriceUsd(p, saleModeEnabled) * exchangeRate
      return priceInSums >= priceRange[0] && priceInSums <= priceRange[1]
    })
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a: any, b: any) => getEffectivePriceUsd(a, saleModeEnabled) - getEffectivePriceUsd(b, saleModeEnabled))
        break
      case 'price_desc':
        filtered.sort((a: any, b: any) => getEffectivePriceUsd(b, saleModeEnabled) - getEffectivePriceUsd(a, saleModeEnabled))
        break
      case 'newest':
        filtered.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        filtered.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
    }
    setFilteredProducts(filtered)
  }

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedBrand('')
    setPriceRange([0, 100000000])
    setSortBy('newest')
  }

  const hasActiveFilters =
    searchQuery ||
    selectedCategory ||
    selectedBrand ||
    priceRange[0] > 0 ||
    priceRange[1] < 100000000 ||
    sortBy !== 'newest'

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (selectedBrand ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 100000000 ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0)

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2A4A] mx-auto mb-4"></div>
          <p className="text-[#8A8275]">
            {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20">
      <div className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'ru' ? 'Поиск товаров...' : 'Mahsulotlarni qidirish...'}
          className="w-full p-3 pl-10 pr-10 border border-[#E8E2D5] rounded-xl focus:outline-none focus:border-[#1B2A4A] bg-[#FBF9F4]"
        />
        <Search size={20} className="absolute left-3 top-3.5 text-[#8A8275]" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3.5 text-[#8A8275] hover:text-[#1B2A4A]"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`w-full p-3 rounded-xl border flex items-center justify-between mb-4 ${
          hasActiveFilters ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-[#FBF9F4] border-[#E8E2D5]'
        }`}
      >
        <div className="flex items-center gap-2">
          <Filter size={20} />
          <span className="font-medium">
            {language === 'ru' ? 'Фильтры и сортировка' : 'Filtrlar va saralash'}
          </span>
          {activeFiltersCount > 0 && (
            <span className="bg-white text-[#1B2A4A] text-xs px-2 py-1 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              clearFilters()
            }}
            className="text-sm underline"
          >
            {language === 'ru' ? 'Сбросить' : 'Tozalash'}
          </button>
        )}
      </button>

      {showFilters && (
        <div className="bg-[#FBF9F4] rounded-xl p-4 mb-4 border border-[#E8E2D5]">
          <div className="mb-4">
            <h3 className="font-bold mb-2 text-[#1B2A4A]">
              {language === 'ru' ? 'Категория' : 'Kategoriya'}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedCategory === '' ? 'bg-[#1B2A4A] text-white' : 'bg-[#E8E2D5] text-[#1B2A4A]'
                }`}
              >
                {language === 'ru' ? 'Все' : 'Barchasi'}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-[#1B2A4A] text-white'
                      : 'bg-[#E8E2D5] text-[#1B2A4A] hover:bg-[#E8E2D5]/70'
                  }`}
                >
                  {language === 'ru' ? cat.name_ru : cat.name_uz}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-bold mb-2 text-[#1B2A4A]">
              {language === 'ru' ? 'Бренд' : 'Brend'}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedBrand('')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedBrand === '' ? 'bg-[#1B2A4A] text-white' : 'bg-[#E8E2D5] text-[#1B2A4A]'
                }`}
              >
                {language === 'ru' ? 'Все' : 'Barchasi'}
              </button>
              {brands.map((brand: Brand) => (
                <button
                  key={brand.id}
                  onClick={() => setSelectedBrand(selectedBrand === brand.id ? '' : brand.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedBrand === brand.id
                      ? 'bg-[#1B2A4A] text-white'
                      : 'bg-[#E8E2D5] text-[#1B2A4A] hover:bg-[#E8E2D5]/70'
                  }`}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-bold mb-2 text-[#1B2A4A]">
              {language === 'ru' ? 'Цена (сум)' : 'Narx (so\'m)'}
            </h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={priceRange[0] === 0 ? '' : priceRange[0]}
                onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                placeholder={language === 'ru' ? 'От' : 'Dan'}
                className="w-full p-2 border border-[#E8E2D5] rounded-lg bg-white"
              />
              <input
                type="number"
                value={priceRange[1] === 100000000 ? '' : priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 100000000])}
                placeholder={language === 'ru' ? 'До' : 'Gacha'}
                className="w-full p-2 border border-[#E8E2D5] rounded-lg bg-white"
              />
            </div>
            <p className="text-xs text-[#8A8275] mt-1">
              {language === 'ru' ? 'Введите цену в сумах' : 'Narxni so\'mda kiriting'}
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2 text-[#1B2A4A]">
              <ArrowUpDown size={16} />
              {language === 'ru' ? 'Сортировка' : 'Saralash'}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSortBy('newest')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  sortBy === 'newest' ? 'bg-[#1B2A4A] text-white' : 'bg-[#E8E2D5] text-[#1B2A4A]'
                }`}
              >
                {language === 'ru' ? 'Сначала новые' : 'Avval yangilar'}
              </button>
              <button
                onClick={() => setSortBy('oldest')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  sortBy === 'oldest' ? 'bg-[#1B2A4A] text-white' : 'bg-[#E8E2D5] text-[#1B2A4A]'
                }`}
              >
                {language === 'ru' ? 'Сначала старые' : 'Avval eskilar'}
              </button>
              <button
                onClick={() => setSortBy('price_asc')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  sortBy === 'price_asc' ? 'bg-[#1B2A4A] text-white' : 'bg-[#E8E2D5] text-[#1B2A4A]'
                }`}
              >
                {language === 'ru' ? 'Цена ↑' : 'Narx ↑'}
              </button>
              <button
                onClick={() => setSortBy('price_desc')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  sortBy === 'price_desc' ? 'bg-[#1B2A4A] text-white' : 'bg-[#E8E2D5] text-[#1B2A4A]'
                }`}
              >
                {language === 'ru' ? 'Цена ↓' : 'Narx ↓'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-3">
        <p className="text-sm text-[#8A8275]">
          {language === 'ru' ? 'Найдено:' : 'Topildi:'} {filteredProducts.length}
        </p>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Search size={64} className="text-[#E8E2D5] mx-auto mb-4" />
          <p className="text-[#8A8275]">
            {language === 'ru' ? 'Товары не найдены' : 'Mahsulotlar topilmadi'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product: any) => {
            const onSale = isProductOnSale(product, saleModeEnabled)
            const effectivePrice = getEffectivePriceUsd(product, saleModeEnabled)
            return (
              <Link key={product.id} to={`/product/${product.id}`}>
                <div className="bg-[#FBF9F4] rounded-xl overflow-hidden shadow-sm border border-[#E8E2D5]">
                  <div className="aspect-square bg-[#F5F1E8] relative">
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
                        e.preventDefault()
                        if (isFavorite(product.id)) {
                          removeFromFavorites(product.id)
                        } else {
                          addToFavorites({
                            productId: product.id,
                            name: language === 'ru' ? product.name_ru : product.name_uz,
                            priceUsd: effectivePrice,
                            image: product.images?.[0] || ''
                          })
                        }
                      }}
                      className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:scale-110 transition-transform"
                    >
                      <Heart
                        size={20}
                        className={isFavorite(product.id) ? 'fill-[#9B3B3B] text-[#9B3B3B]' : 'text-[#8A8275]'}
                      />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate text-[#1B2A4A]">
                      {language === 'ru' ? product.name_ru : product.name_uz}
                    </p>
                    {onSale && (
                      <p className="text-[#8A8275] text-xs line-through mt-1">
                        {formatPrice(product.price_usd)}
                      </p>
                    )}
                    <p className={`font-bold mt-1 ${onSale ? 'text-[#9B3B3B]' : 'text-[#1B2A4A]'}`}>
                      {formatPrice(effectivePrice)}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}