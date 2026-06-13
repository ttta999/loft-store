import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { CATEGORIES, BRANDS } from '../data/categories'
import { useState, useEffect } from 'react'
import { Filter } from 'lucide-react'

export default function CatalogPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, currency, exchangeRate } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  const categoryId = location.state?.category
  const subcategoryId = location.state?.subcategory
  
  const category = CATEGORIES.find(c => c.id === categoryId)
  const subcategory = category?.subcategories.find(s => s.id === subcategoryId)

  // Фильтры
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState<number>(0)
  const [maxPrice, setMaxPrice] = useState<number>(1000)

  useEffect(() => {
    if (categoryId && subcategoryId) {
      loadProducts()
    }
  }, [categoryId, subcategoryId])

  useEffect(() => {
    applyFilters()
  }, [selectedBrands, minPrice, maxPrice, products])

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('category', categoryId)
      .eq('subcategory', subcategoryId)
    
    setProducts(data || [])
    setFilteredProducts(data || [])
    setLoading(false)
  }

  const applyFilters = () => {
    let filtered = [...products]

    // Фильтр по брендам
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(p => 
        selectedBrands.some(brandId => {
          const brand = BRANDS.find(b => b.id === brandId)
          return brand && p.name_ru.toLowerCase().includes(brand.name.toLowerCase())
        })
      )
    }

    // Фильтр по цене
    filtered = filtered.filter(p => p.price_usd >= minPrice && p.price_usd <= maxPrice)

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
    setMaxPrice(1000)
  }

  const activeFiltersCount = selectedBrands.length + (minPrice !== 0 || maxPrice !== 1000 ? 1 : 0)

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Шапка с LOFT Store */}
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-600 flex items-center gap-1">
            ← {language === 'ru' ? 'Назад' : 'Orqaga'}
          </button>
          <h1 className="text-xl font-bold text-center flex-1">LOFT Store</h1>
          <div className="w-16"></div>
        </div>
      </div>

      {/* Категория и подкатегория */}
      <div className="bg-white px-4 py-3">
        <h2 className="text-2xl font-bold">
          {language === 'ru' ? category?.name_ru : category?.name_uz}
        </h2>
        {subcategory && (
          <p className="text-sm text-gray-500 mt-1">
            {language === 'ru' ? subcategory.name_ru : subcategory.name_uz}
          </p>
        )}
      </div>

      {/* Кнопка фильтров */}
      <div className="px-4 py-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`w-full p-3 rounded-xl border flex items-center justify-between ${
            activeFiltersCount > 0 ? 'bg-black text-white border-black' : 'bg-white border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Filter size={20} />
            <span className="font-medium">
              {language === 'ru' ? 'Фильтры' : 'Filtrlar'}
            </span>
            {activeFiltersCount > 0 && (
              <span className={`${
                activeFiltersCount > 0 && showFilters ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
              } text-xs px-2 py-1 rounded-full`}>
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
      </div>

      {/* Панель фильтров */}
      {showFilters && (
        <div className="bg-white border-t border-gray-200 p-4 mb-4">
          {/* Бренд */}
          <div className="mb-4">
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Бренд' : 'Brend'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {BRANDS.map((brand) => (
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

          {/* Цена */}
          <div>
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
        </div>
      )}

      {/* Результаты */}
      <div className="px-4 mb-3">
        <p className="text-sm text-gray-500">
          {language === 'ru' 
            ? `Найдено: ${filteredProducts.length}` 
            : `Topildi: ${filteredProducts.length}`}
        </p>
      </div>

      <div className="p-4 pt-0">
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