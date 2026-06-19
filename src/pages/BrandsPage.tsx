import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { BRANDS, CATEGORIES } from '../data/categories'
import { useState } from 'react'
import { Filter, ArrowUpDown } from 'lucide-react'

export default function BrandsPage() {
  const navigate = useNavigate()
  const { language, currency, exchangeRate } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  
  // Фильтры
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [minPrice, setMinPrice] = useState<number>(0)
  const [maxPrice, setMaxPrice] = useState<number>(10000)
  const [sortBy, setSortBy] = useState<string>('newest')

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const handleBrandClick = async (brandId: string) => {
    setSelectedBrand(brandId)
    setLoading(true)
    
    const brand = BRANDS.find(b => b.id === brandId)
    if (!brand) return
    
    const { data } = await supabase
      .from('products')
      .select('*')
      .ilike('name_ru', `%${brand.name}%`)
      .eq('is_active', true)
    
    setProducts(data || [])
    setLoading(false)
  }

  const handleBack = () => {
    if (selectedBrand) {
      setSelectedBrand(null)
      setProducts([])
      setSelectedCategory('')
      setMinPrice(0)
      setMaxPrice(10000)
      setSortBy('newest')
    } else {
      navigate(-1)
    }
  }

  const clearFilters = () => {
    setSelectedCategory('')
    setMinPrice(0)
    setMaxPrice(10000)
    setSortBy('newest')
  }

  const getFilteredAndSortedProducts = () => {
    let filtered = [...products]
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }
    
    filtered = filtered.filter(p => p.price_usd >= minPrice && p.price_usd <= maxPrice)
    
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
    
    return filtered
  }

  const brand = selectedBrand ? BRANDS.find(b => b.id === selectedBrand) : null
  const filteredProducts = getFilteredAndSortedProducts()
  
  const activeFiltersCount = 
    (selectedCategory ? 1 : 0) + 
    (minPrice !== 0 || maxPrice !== 10000 ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0)

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="text-gray-600 flex items-center gap-1">
            ← {language === 'ru' ? 'Назад' : 'Orqaga'}
          </button>
          <h1 className="text-xl font-bold text-center flex-1">LOFT Store</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="p-4">
        {!selectedBrand ? (
          <>
            <h2 className="text-2xl font-bold mb-2">
              {language === 'ru' ? 'Бренды' : 'Brendlar'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {language === 'ru' 
                ? 'Выберите бренд чтобы увидеть товары' 
                : 'Mahsulotlarni ko\'rish uchun brendni tanlang'}
            </p>
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              {BRANDS.map((brand, index) => (
                <button
                  key={brand.id}
                  onClick={() => handleBrandClick(brand.id)}
                  className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                    index !== BRANDS.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span className="font-medium text-base">{brand.name}</span>
                  <span className="text-gray-400 text-xl">›</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold">{brand?.name}</h2>
              <p className="text-sm text-gray-500">
                {filteredProducts.length} {language === 'ru' ? 'товаров' : 'mahsulotlar'}
              </p>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full p-3 rounded-xl border flex items-center justify-between mb-4 ${
                activeFiltersCount > 0 ? 'bg-black text-white border-black' : 'bg-white border-gray-300'
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
              {activeFiltersCount > 0 && (
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
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
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
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          selectedCategory === cat.id ? 'bg-black text-white' : 'bg-gray-100'
                        }`}
                      >
                        {language === 'ru' ? cat.name_ru : cat.name_uz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-bold mb-2">
                    {language === 'ru' ? 'Цена (USD)' : 'Narx (USD)'}
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(Number(e.target.value))}
                      placeholder="От"
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      placeholder="До"
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

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
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {language === 'ru' ? 'Товары не найдены' : 'Mahsulotlar topilmadi'}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer"
                  >
                    {product.images?.[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name_ru}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="p-3">
                      <p className="font-medium text-sm truncate">
                        {language === 'ru' ? product.name_ru : product.name_uz}
                      </p>
                      <p className="text-lg font-bold mt-1">
                        {formatPrice(product.price_usd)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}