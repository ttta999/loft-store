import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../data/categories'
import { useState, useEffect } from 'react'
import { Filter, ArrowUpDown } from 'lucide-react'

export default function CatalogPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, currency, exchangeRate } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  // ✅ Бренды теперь загружаются из Supabase
  const [brands, setBrands] = useState<any[]>([])
  
  const categoryId = location.state?.category
  const subcategoryId = location.state?.subcategory
  
  const category = CATEGORIES.find(c => c.id === categoryId)

  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState<number>(0)
  const [maxPrice, setMaxPrice] = useState<number>(10000)
  const [sortBy, setSortBy] = useState<string>('newest')

  // ✅ Загрузка брендов из Supabase
  useEffect(() => {
    loadBrands()
  }, [])

  // ✅ ИСПРАВЛЕНО: загружаем товары всегда когда есть categoryId
  useEffect(() => {
    if (categoryId) {
      loadProducts()
    }
  }, [categoryId, subcategoryId])

  useEffect(() => {
    applyFiltersAndSort()
  }, [selectedBrands, minPrice, maxPrice, sortBy, products])

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
      console.error('Ошибка загрузки брендов:', error)
    }
  }

  const loadProducts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('category', categoryId)
        .eq('is_active', true)
      
      // ✅ Если есть подкатегория - фильтруем по ней
      if (subcategoryId) {
        query = query.eq('subcategory', subcategoryId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      setProducts(data || [])
      setFilteredProducts(data || [])
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
    setMaxPrice(10000)
    setSortBy('newest')
  }

  const activeFiltersCount = 
    selectedBrands.length + 
    (minPrice !== 0 || maxPrice !== 10000 ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0)

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  // ✅ Получаем название подкатегории для отображения
  const getSubcategoryName = () => {
    if (!subcategoryId) {
      // Если подкатегория не выбрана (Все товары)
      return language === 'ru' ? 'Все товары' : 'Barcha mahsulotlar'
    }
    const sub = category?.subcategories.find(s => s.id === subcategoryId)
    return sub ? (language === 'ru' ? sub.name_ru : sub.name_uz) : ''
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ✅ БЕЗ border-b, с shadow-sm как в ProductPage */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-600 flex items-center gap-1">
            ← {language === 'ru' ? 'Назад' : 'Orqaga'}
          </button>
          <h1 className="text-xl font-bold text-center flex-1">LOFT Store</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="p-4">
        {/* ✅ Заголовок категории */}
        <h2 className="text-xl font-bold mb-1">
          {language === 'ru' ? category?.name_ru : category?.name_uz}
        </h2>
        {/* ✅ Подкатегория */}
        <p className="text-sm text-gray-500 mb-4">
          {getSubcategoryName()}
        </p>

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
                {language === 'ru' ? 'Бренд' : 'Brend'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => toggleBrand(brand.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedBrands.includes(brand.id)
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {brand.name}
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

        <p className="text-sm text-gray-500 mb-3">
          {language === 'ru' 
            ? `Найдено: ${filteredProducts.length}` 
            : `Topildi: ${filteredProducts.length}`}
        </p>

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
      </div>
    </div>
  )
}