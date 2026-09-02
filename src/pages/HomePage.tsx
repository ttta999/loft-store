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
      <Link to={`/product/${product.id}`}>
        <div className="bg-[#FBF9F4] rounded-2xl overflow-hidden shadow-sm border border-[#E8E2D5] hover:shadow-md transition-shadow">
          <div className="aspect-square bg-[#F5F1E8] relative">
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
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2A4A] mx-auto mb-4"></div>
          <p className="text-[#8A8275]">
            {language === 'ru' ? 'Загрузка товаров...' : 'Mahsulotlar yuklanmoqda...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <div className="bg-gradient-to-r from-[#1B2A4A] to-[#142038] rounded-2xl p-6 mb-6 text-white shadow-md">
        <h2 className="text-2xl font-bold mb-2 tracking-wide">
          {language === 'ru' ? 'Добро пожаловать в LOFT' : 'LOFTga xush kelibsiz'}
        </h2>
        <p className="text-[#C9A961] text-sm">
          {language === 'ru'
            ? 'Стильная одежда и обувь в Ташкенте'
            : 'Toshkentdagi zamonaviy kiyim va poyabzal'}
        </p>
      </div>

      <h3 className="text-lg font-bold mb-3 text-[#1B2A4A]">
        {language === 'ru' ? 'Категории' : 'Kategoriyalar'}
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className="bg-[#FBF9F4] rounded-2xl p-4 shadow-sm border border-[#E8E2D5] hover:shadow-md flex items-center gap-3 cursor-pointer transition-all"
          >
            <span className="text-3xl">{cat.icon}</span>
            <span className="font-medium text-sm text-[#1B2A4A]">
              {language === 'ru' ? cat.name_ru : cat.name_uz}
            </span>
          </div>
        ))}
        <div
          onClick={() => navigate('/brands')}
          className="bg-[#FBF9F4] rounded-2xl p-4 shadow-sm border border-[#E8E2D5] hover:shadow-md flex items-center gap-3 cursor-pointer transition-all"
        >
          <span className="text-3xl">🏷️</span>
          <span className="font-medium text-sm text-[#1B2A4A]">
            {language === 'ru' ? 'Бренды' : 'Brendlar'}
          </span>
        </div>
      </div>

      {getDiscountProducts().length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3 text-[#9B3B3B]">
            {language === 'ru' ? '💰 Скидки' : '💰 Chefirmalar'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {getDiscountProducts(6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {getNewProducts().length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-[#1B2A4A]">
              {language === 'ru' ? '✨ Новые товары' : '✨ Yangi mahsulotlar'}
            </h3>
            <button
              onClick={() => navigate('/all-products', { state: { sortBy: 'newest' } })}
              className="text-sm text-[#8A8275] hover:text-[#1B2A4A] flex items-center gap-1 transition-colors"
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

      {getPopularProducts().length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-[#1B2A4A]">
              {language === 'ru' ? '🔥 Популярные товары' : '🔥 Mashhur mahsulotlar'}
            </h3>
            <button
              onClick={() => navigate('/all-products', { state: { sortBy: 'popular' } })}
              className="text-sm text-[#8A8275] hover:text-[#1B2A4A] flex items-center gap-1 transition-colors"
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