import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { Heart } from 'lucide-react'

const categories = [
  { id: 'shoes', name_ru: 'Обувь', name_uz: 'Oyoq kiyim', icon: '👟' },
  { id: 'accessories', name_ru: 'Аксессуары', name_uz: 'Aksessuarlar', icon: '⌚' },
  { id: 'clothes', name_ru: 'Одежда', name_uz: 'Kiyim', icon: '👕' },
  { id: 'brands', name_ru: 'Бренды', name_uz: 'Brendlar', icon: '🏷️' },
]

export default function HomePage() {
  const { language, currency, exchangeRate, addToFavorites, removeFromFavorites, isFavorite } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    const data = await getProducts()
    setProducts(data)
    setLoading(false)
  }

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null)
    } else {
      setSelectedCategory(categoryId)
    }
  }

  const filteredProducts = selectedCategory 
    ? products.filter(p => p.category === selectedCategory)
    : products

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const getNewProducts = () => {
    // Сортируем по дате создания (новые первые)
    return [...products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6)
  }

  const getPopularProducts = () => {
    // Здесь можно добавить логику популярных товаров (по количеству заказов)
    // Пока просто берем первые 6 товаров
    return products.slice(0, 6)
  }

  const getDiscountProducts = () => {
    // Фильтруем товары со скидкой (где есть поле discount или sale_price)
    return products.filter(p => p.discount || p.sale_price || p.is_on_sale).slice(0, 6)
  }

  const ProductCard = ({ product }: { product: any }) => (
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
  )

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-500">
            {language === 'ru' ? 'Загрузка товаров...' : 'Mahsulotlar yuklanmoqda...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="bg-gradient-to-r from-black to-gray-800 rounded-2xl p-6 mb-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          {language === 'ru' ? 'Добро пожаловать в LOFT' : 'LOFTga xush kelibsiz'}
        </h2>
        <p className="text-gray-300 text-sm">
          {language === 'ru' 
            ? 'Стильная одежда и обувь в Ташкенте' 
            : 'Toshkentdagi zamonaviy kiyim va poyabzal'}
        </p>
      </div>

      <h3 className="text-lg font-bold mb-3">
        {language === 'ru' ? 'Категории' : 'Kategoriyalar'}
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className={`bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3 cursor-pointer transition-all ${
              selectedCategory === cat.id 
                ? 'border-black bg-gray-100' 
                : 'border-gray-100 hover:shadow-md'
            }`}
          >
            <span className="text-3xl">{cat.icon}</span>
            <span className="font-medium text-sm">
              {language === 'ru' ? cat.name_ru : cat.name_uz}
            </span>
          </div>
        ))}
      </div>

      {selectedCategory && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">
            {language === 'ru' ? 'Товары категории' : 'Kategoriya mahsulotlari'}
          </h3>
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-sm text-gray-500 hover:text-black"
          >
            {language === 'ru' ? 'Сбросить' : 'Tozalash'} ✕
          </button>
        </div>
      )}

      {selectedCategory ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <>
          {/* Новые товары */}
          {getNewProducts().length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3">
                {language === 'ru' ? '✨ Новые товары' : '✨ Yangi mahsulotlar'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {getNewProducts().map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* Популярные товары */}
          {getPopularProducts().length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3">
                {language === 'ru' ? '🔥 Популярные товары' : '🔥 Mashhur mahsulotlar'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {getPopularProducts().map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* Скидки */}
          {getDiscountProducts().length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3">
                {language === 'ru' ? '💰 Скидки' : '💰 Chefirmalar'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {getDiscountProducts().map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}