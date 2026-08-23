import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { Heart, ArrowRight } from 'lucide-react'
import { CATEGORIES } from '../data/categories'

export default function HomePage() {
  const navigate = useNavigate()
  const { language, currency, exchangeRate, saleModeEnabled, addToFavorites, removeFromFavorites, isFavorite } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    if (categoryId === 'brands') {
      navigate('/brands')
      return
    }
    navigate('/category', { state: { categoryId } })
  }

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const getNewProducts = (limit: number = 6) => {
    return [...products]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }

  const getPopularProducts = (limit: number = 6) => {
    const productsWithOrders = products.map(product => ({
      ...product,
      orderCount: Math.floor(Math.random() * 100)
    }))
    return productsWithOrders
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, limit)
  }

  // ✅ СКИДКИ: показываются ТОЛЬКО если режим скидок ВКЛ в админке
  const getDiscountProducts = (limit: number = 6) => {
    if (!saleModeEnabled) return []
    return products.filter(p => p.sale_price != null && Number(p.sale_price) > 0).slice(0, limit)
  }

  const ProductCard = ({ product }: { product: any }) => {
    const onSale = isProductOnSale(product, saleModeEnabled)
    const effectivePrice = getEffectivePriceUsd(product, saleModeEnabled)
    const discountPercent = onSale
      ? Math.round((1 - Number(product.sale_price) / Number(product.price_usd)) * 100)
      : 0

    return (
      <Link key={product.id} to={`/product/${product.id}`}>
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <div className="aspect-square bg-gray-100 relative">
            <img
              src={product.images?.[0] || 'https://via.placeholder.com/500'}
              alt={language === 'ru' ? product.name_ru : product.name_uz}
              className="w-full h-full object-cover"
            />
            {onSale && (
              <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                -{discountPercent}%
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
                className={isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}
              />
            </button>
          </div>
          <div className="p-3">
            <p className="text-sm font-medium truncate">
              {language === 'ru' ? product.name_ru : product.name_uz}
            </p>
            {onSale && (
              <p className="text-gray-400 text-xs line-through mt-1">
                {formatPrice(product.price_usd)}
              </p>
            )}
            <p className={`font-bold mt-1 ${onSale ? 'text-red-500' : 'text-black'}`}>
              {formatPrice(effectivePrice)}
            </p>
          </div>
        </div>
      </Link>
    )
  }

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
    <div className="p-4 pb-24">
      {/* Приветственный баннер */}
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

      {/* Категории */}
      <h3 className="text-lg font-bold mb-3">
        {language === 'ru' ? 'Категории' : 'Kategoriyalar'}
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md flex items-center gap-3 cursor-pointer transition-all"
          >
            <span className="text-3xl">{cat.icon}</span>
            <span className="font-medium text-sm">
              {language === 'ru' ? cat.name_ru : cat.name_uz}
            </span>
          </div>
        ))}
        <div
          onClick={() => navigate('/brands')}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md flex items-center gap-3 cursor-pointer"
        >
          <span className="text-3xl">🏷️</span>
          <span className="font-medium text-sm">
            {language === 'ru' ? 'Бренды' : 'Brendlar'}
          </span>
        </div>
      </div>

      {/* ✅ БОКС СКИДКИ (только если режим ВКЛ и есть товары со скидкой) */}
      {getDiscountProducts().length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3 text-red-500">
            {language === 'ru' ? '💰 Скидки' : '💰 Chefirmalar'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {getDiscountProducts(6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Новые товары */}
      {getNewProducts().length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">
              {language === 'ru' ? '✨ Новые товары' : '✨ Yangi mahsulotlar'}
            </h3>
            <button
              onClick={() => navigate('/all-products', { state: { sortBy: 'newest' } })}
              className="text-sm text-gray-600 hover:text-black flex items-center gap-1"
            >
              {language === 'ru' ? 'Больше' : 'Ko\'proq'}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {getNewProducts(6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Популярные товары */}
      {getPopularProducts().length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">
              {language === 'ru' ? '🔥 Популярные товары' : '🔥 Mashhur mahsulotlar'}
            </h3>
            <button
              onClick={() => navigate('/all-products', { state: { sortBy: 'popular' } })}
              className="text-sm text-gray-600 hover:text-black flex items-center gap-1"
            >
              {language === 'ru' ? 'Больше' : 'Ko\'proq'}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {getPopularProducts(6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}