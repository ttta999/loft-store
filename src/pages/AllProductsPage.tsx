import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { Heart, Filter } from 'lucide-react'
import { CATEGORIES } from '../data/categories'

export default function AllProductsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, currency, exchangeRate, addToFavorites, removeFromFavorites, isFavorite, favorites } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>(location.state?.sortBy || 'newest')

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [selectedCategory, selectedSubcategory, sortBy, products])

  const loadProducts = async () => {
    setLoading(true)
    const data = await getProducts()
    setProducts(data)
    setFilteredProducts(data)
    setLoading(false)
  }

  const applyFiltersAndSort = () => {
    let filtered = [...products]

    // Фильтр по категории
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    // Фильтр по подкатегории
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(p => p.subcategory === selectedSubcategory)
    }

    // Сортировка
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'popular') {
      filtered.sort(() => Math.random() - 0.5)
    } else if (sortBy === 'price_asc') {
      filtered.sort((a, b) => a.price_usd - b.price_usd)
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => b.price_usd - a.price_usd)
    }

    setFilteredProducts(filtered)
  }

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const getTitle = () => {
    if (sortBy === 'newest') {
      return language === 'ru' ? '✨ Новые товары' : '✨ Yangi mahsulotlar'
    } else if (sortBy === 'popular') {
      return language === 'ru' ? '🔥 Популярные товары' : '🔥 Mashhur mahsulotlar'
    }
    return language === 'ru' ? 'Все товары' : 'Barcha mahsulotlar'
  }

  const ProductCard = ({ product }: { product: any }) => (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer"
    >
      <div className="aspect-square bg-gray-100 relative">
        <img
          src={product.images?.[0] || 'https://via.placeholder.com/500'}
          alt={language === 'ru' ? product.name_ru : product.name_uz}
          className="w-full h-full object-cover"
        />
        <button
          onClick={(e) => {
            e.stopPropagation()
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
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ✅ Верхняя панель с LOFT Store */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="text-gray-600 hover:text-black"
          >
            ← {language === 'ru' ? 'Назад' : 'Orqaga'}
          </button>
          <h1 className="text-xl font-bold text-center flex-1">LOFT Store</h1>
          <button 
            onClick={() => navigate('/favorites')}
            className="relative text-gray-600 hover:text-red-500"
          >
            <Heart size={24} />
            {favorites.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Заголовок страницы */}
        <h2 className="text-2xl font-bold mb-4">{getTitle()}</h2>

        {/* Кнопка фильтров */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full p-3 rounded-xl border border-gray-300 flex items-center justify-between bg-white mb-4"
        >
          <div className="flex items-center gap-2">
            <Filter size={20} />
            <span className="font-medium">
              {language === 'ru' ? 'Фильтры и сортировка' : 'Filtrlar va saralash'}
            </span>
          </div>
        </button>

        {/* Панель фильтров */}
        {showFilters && (
          <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200 space-y-4">
            {/* Категория */}
            <div>
              <h3 className="font-bold mb-2">
                {language === 'ru' ? 'Категория' : 'Kategoriya'}
              </h3>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setSelectedSubcategory('all')
                }}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="all">{language === 'ru' ? 'Все' : 'Barchasi'}</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {language === 'ru' ? cat.name_ru : cat.name_uz}
                  </option>
                ))}
              </select>
            </div>

            {/* Подкатегория */}
            {selectedCategory !== 'all' && (
              <div>
                <h3 className="font-bold mb-2">
                  {language === 'ru' ? 'Подкатегория' : 'Pastki kategoriya'}
                </h3>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option value="all">{language === 'ru' ? 'Все' : 'Barchasi'}</option>
                  {CATEGORIES.find(c => c.id === selectedCategory)?.subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {language === 'ru' ? sub.name_ru : sub.name_uz}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Сортировка */}
            <div>
              <h3 className="font-bold mb-2">
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
                  onClick={() => setSortBy('popular')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    sortBy === 'popular' ? 'bg-black text-white' : 'bg-gray-100'
                  }`}
                >
                  {language === 'ru' ? 'Популярные' : 'Mashhur'}
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

        {/* Счетчик */}
        <p className="text-sm text-gray-500 mb-3">
          {language === 'ru' ? 'Найдено:' : 'Topildi:'} {filteredProducts.length}
        </p>

        {/* Товары */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {language === 'ru' ? 'Товары не найдены' : 'Mahsulotlar topilmadi'}
            </p>
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