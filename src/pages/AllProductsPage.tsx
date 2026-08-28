import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { Heart, Filter } from 'lucide-react'
import { CATEGORIES } from '../data/categories'

export default function AllProductsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, currency, exchangeRate, saleModeEnabled, addToFavorites, removeFromFavorites, isFavorite } = useStore()
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
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(p => p.subcategory === selectedSubcategory)
    }
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'popular') {
      filtered.sort(() => Math.random() - 0.5)
    } else if (sortBy === 'price_asc') {
      filtered.sort((a, b) => getEffectivePriceUsd(a, saleModeEnabled) - getEffectivePriceUsd(b, saleModeEnabled))
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => getEffectivePriceUsd(b, saleModeEnabled) - getEffectivePriceUsd(a, saleModeEnabled))
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

  const ProductCard = ({ product }: { product: any }) => {
    const onSale = isProductOnSale(product, saleModeEnabled)
    const effectivePrice = getEffectivePriceUsd(product, saleModeEnabled)
    return (
      <div
        onClick={() => navigate(`/product/${product.id}`)}
        className="bg-[#FBF9F4] rounded-xl overflow-hidden shadow-sm border border-[#E8E2D5] cursor-pointer"
      >
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
              e.stopPropagation()
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
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
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
    <div className="min-h-screen bg-[#F5F1E8] pb-24">
      <div className="bg-[#FBF9F4] p-4 shadow-sm sticky top-0 z-40 border-b border-[#E8E2D5]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-[#1B2A4A] hover:text-[#C9A961]"
          >
            ← {language === 'ru' ? 'Назад' : 'Orqaga'}
          </button>
          <h1 className="text-xl font-bold text-center flex-1 text-[#1B2A4A] tracking-wide">LOFT</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4 text-[#1B2A4A]">{getTitle()}</h2>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full p-3 rounded-xl border border-[#E8E2D5] flex items-center justify-between bg-[#FBF9F4] mb-4"
        >
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-[#1B2A4A]" />
            <span className="font-medium text-[#1B2A4A]">
              {language === 'ru' ? 'Фильтры и сортировка' : 'Filtrlar va saralash'}
            </span>
          </div>
        </button>

        {showFilters && (
          <div className="bg-[#FBF9F4] rounded-xl p-4 mb-4 border border-[#E8E2D5] space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#1B2A4A]">
                {language === 'ru' ? 'Категория' : 'Kategoriya'}
              </h3>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setSelectedSubcategory('all')
                }}
                className="w-full p-3 border border-[#E8E2D5] rounded-lg bg-white text-[#1B2A4A]"
              >
                <option value="all">{language === 'ru' ? 'Все' : 'Barchasi'}</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {language === 'ru' ? cat.name_ru : cat.name_uz}
                  </option>
                ))}
              </select>
            </div>

            {selectedCategory !== 'all' && (
              <div>
                <h3 className="font-bold mb-2 text-[#1B2A4A]">
                  {language === 'ru' ? 'Подкатегория' : 'Pastki kategoriya'}
                </h3>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="w-full p-3 border border-[#E8E2D5] rounded-lg bg-white text-[#1B2A4A]"
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

            <div>
              <h3 className="font-bold mb-2 text-[#1B2A4A]">
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
                  onClick={() => setSortBy('popular')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    sortBy === 'popular' ? 'bg-[#1B2A4A] text-white' : 'bg-[#E8E2D5] text-[#1B2A4A]'
                  }`}
                >
                  {language === 'ru' ? 'Популярные' : 'Mashhur'}
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

        <p className="text-sm text-[#8A8275] mb-3">
          {language === 'ru' ? 'Найдено:' : 'Topildi:'} {filteredProducts.length}
        </p>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#8A8275]">
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