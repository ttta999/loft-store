import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { Search, Filter, X, Heart, ArrowUpDown } from 'lucide-react'
import { BRANDS } from '../data/categories'

export default function SearchPage() {
  const { language, currency, exchangeRate, addToFavorites, removeFromFavorites, isFavorite } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [sortBy, setSortBy] = useState<string>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)

  const categories = [
    { id: 'shoes', name_ru: 'Обувь', name_uz: 'Oyoq kiyim' },
    { id: 'clothes', name_ru: 'Одежда', name_uz: 'Kiyim' },
    { id: 'accessories', name_ru: 'Аксессуары', name_uz: 'Aksessuarlar' },
  ]

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [searchQuery, selectedCategory, selectedBrand, priceRange, sortBy, products])

  const loadProducts = async () => {
    setLoading(true)
    const data = await getProducts()
    setProducts(data)
    setFilteredProducts(data)
    setLoading(false)
  }

  const applyFiltersAndSort = () => {
    let filtered = [...products]

    // Поиск по названию
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        (language === 'ru' ? p.name_ru : p.name_uz).toLowerCase().includes(query)
      )
    }

    // Фильтр по категории
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    // Фильтр по бренду
    if (selectedBrand) {
      const brand = BRANDS.find(b => b.id === selectedBrand)
      if (brand) {
        filtered = filtered.filter(p => 
          p.name_ru.toLowerCase().includes(brand.name.toLowerCase())
        )
      }
    }

    // Фильтр по цене
    filtered = filtered.filter(p => 
      p.price_usd >= priceRange[0] && p.price_usd <= priceRange[1]
    )

    // ✅ Сортировка
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => a.price_usd - b.price_usd)
        break
      case 'price_desc':
        filtered.sort((a, b) => b.price_usd - a.price_usd)
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

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedBrand('')
    setPriceRange([0, 10000])
    setSortBy('newest')
  }

  const hasActiveFilters = 
    searchQuery || 
    selectedCategory || 
    selectedBrand || 
    priceRange[0] > 0 || 
    priceRange[1] < 10000 ||
    sortBy !== 'newest'

  const activeFiltersCount = 
    (searchQuery ? 1 : 0) +
    (selectedCategory ? 1 : 0) + 
    (selectedBrand ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0)

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-500">
            {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20">
      {/* Поиск */}
      <div className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'ru' ? 'Поиск товаров...' : 'Mahsulotlarni qidirish...'}
          className="w-full p-3 pl-10 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:border-black"
        />
        <Search size={20} className="absolute left-3 top-3.5 text-gray-400" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3.5 text-gray-400 hover:text-black"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Кнопка фильтров */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`w-full p-3 rounded-xl border flex items-center justify-between mb-4 ${
          hasActiveFilters ? 'bg-black text-white border-black' : 'bg-white border-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Filter size={20} />
          <span className="font-medium">
            {language === 'ru' ? 'Фильтры и сортировка' : 'Filtrlar va saralash'}
          </span>
          {activeFiltersCount > 0 && (
            <span className="bg-white text-black text-xs px-2 py-1 rounded-full">
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

      {/* Панель фильтров */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          {/* Категория */}
          <div className="mb-4">
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Категория' : 'Kategoriya'}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedCategory === '' ? 'bg-black text-white' : 'bg-gray-100'
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
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {language === 'ru' ? cat.name_ru : cat.name_uz}
                </button>
              ))}
            </div>
          </div>

          {/* Бренд */}
          <div className="mb-4">
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Бренд' : 'Brend'}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedBrand('')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedBrand === '' ? 'bg-black text-white' : 'bg-gray-100'
                }`}
              >
                {language === 'ru' ? 'Все' : 'Barchasi'}
              </button>
              {BRANDS.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => setSelectedBrand(selectedBrand === brand.id ? '' : brand.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedBrand === brand.id
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          </div>

          {/* Цена */}
          <div className="mb-4">
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Цена (USD)' : 'Narx (USD)'}
            </h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                placeholder="От"
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                placeholder="До"
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* ✅ Сортировка */}
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <ArrowUpDown size={16} />
              {language === 'ru' ? 'Сортировка' : 'Saralash'}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSortBy('newest')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  sortBy === 'newest' ? 'bg-black text-white' : 'bg-gray-100'
                }`}
              >
                {language === 'ru' ? 'Сначала новые' : 'Avval yangilar'}
              </button>
              <button
                onClick={() => setSortBy('oldest')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  sortBy === 'oldest' ? 'bg-black text-white' : 'bg-gray-100'
                }`}
              >
                {language === 'ru' ? 'Сначала старые' : 'Avval eskilar'}
              </button>
              <button
                onClick={() => setSortBy('price_asc')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  sortBy === 'price_asc' ? 'bg-black text-white' : 'bg-gray-100'
                }`}
              >
                {language === 'ru' ? 'Цена ↑' : 'Narx ↑'}
              </button>
              <button
                onClick={() => setSortBy('price_desc')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  sortBy === 'price_desc' ? 'bg-black text-white' : 'bg-gray-100'
                }`}
              >
                {language === 'ru' ? 'Цена ↓' : 'Narx ↓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Результаты */}
      <div className="mb-3">
        <p className="text-sm text-gray-500">
          {language === 'ru' ? 'Найдено:' : 'Topildi:'} {filteredProducts.length}
        </p>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Search size={64} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {language === 'ru' ? 'Товары не найдены' : 'Mahsulotlar topilmadi'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => (
            <Link key={product.id} to={`/product/${product.id}`}>
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={product.images?.[0] || 'https://via.placeholder.com/500'}
                    alt={language === 'ru' ? product.name_ru : product.name_uz}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      if (isFavorite(product.id)) {
                        removeFromFavorites(product.id)
                      } else {
                        addToFavorites({
                          productId: product.id,
                          name: language === 'ru' ? product.name_ru : product.name_uz,
                          priceUsd: product.price_usd,
                          image: product.images?.[0] || ''
                        })
                      }
                    }}
                    className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:scale-110 transition-transform"
                  >
                    <Heart 
                      size={20} 
                      className={isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}
                    />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">
                    {language === 'ru' ? product.name_ru : product.name_uz}
                  </p>
                  <p className="text-black font-bold mt-1">
                    {formatPrice(product.price_usd)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}