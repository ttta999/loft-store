import { Link, useNavigate, useLocation } from 'react-router-dom' // ✅ Добавили useLocation
import { useStore, isProductOnSale } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { Heart, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import IslandHeader from '../components/IslandHeader'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const location = useLocation() // ✅ Получаем location для чтения state
  const { favorites, removeFromFavorites, currency, exchangeRate, language, saleModeEnabled } = useStore()
  const [products, setProducts] = useState<any[]>([])

  // ✅ Путь, откуда пришли (фолбэк на главную, если state пустой)
  const from = location.state?.from || '/'

  useEffect(() => {
    getProducts().then(setProducts)
  }, [])

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  // ✅ Функция возврата — переходим на страницу, откуда пришли
  const handleBack = () => {
    navigate(from)
  }

  if (favorites.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F1E8]">
        <IslandHeader needsBack onBack={handleBack} />

        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <Heart size={64} className="text-[#E8E2D5] mb-4" />
          <h2 className="text-xl font-bold mb-2 text-[#1B2A4A]">
            {language === 'ru' ? 'Избранное пусто' : 'Sevimlilar bo\'sh'}
          </h2>
          <p className="text-[#8A8275] text-center px-4 mb-6">
            {language === 'ru'
              ? 'Добавляйте товары в избранное, чтобы не потерять их'
              : 'Mahsulotlarni yo\'qotib qo\'ymaslik uchun sevimlilarga qo\'shing'}
          </p>
          <Link to="/" className="bg-[#1B2A4A] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#142038]">
            {language === 'ru' ? 'Перейти в каталог' : 'Kataloqqa o\'tish'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <IslandHeader needsBack onBack={handleBack} />

      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold mb-4 text-[#1B2A4A]">
          {language === 'ru' ? 'Избранное' : 'Sevimlilar'}
        </h1>
        <div className="grid grid-cols-2 gap-3">
          {favorites.map((item) => {
            const product = products.find(p => p.id === item.productId)
            const onSale = product ? isProductOnSale(product, saleModeEnabled) : false
            const displayPrice = onSale ? Number(product.sale_price) : item.priceUsd
            return (
              <div key={item.productId} className="bg-[#FBF9F4] rounded-xl overflow-hidden shadow-sm border border-[#E8E2D5]">
                <Link to={`/product/${item.productId}`}>
                  <div className="aspect-square bg-[#F5F1E8]">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
                <div className="p-3">
                  <Link to={`/product/${item.productId}`}>
                    <p className="text-sm font-medium truncate mb-2 text-[#1B2A4A]">
                      {item.name}
                    </p>
                  </Link>
                  <div className="flex items-center justify-between">
                    <div>
                      {onSale && (
                        <p className="text-[#8A8275] text-xs line-through">
                          {formatPrice(item.priceUsd)}
                        </p>
                      )}
                      <p className={`font-bold ${onSale ? 'text-[#9B3B3B]' : 'text-[#1B2A4A]'}`}>
                        {formatPrice(displayPrice)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromFavorites(item.productId)}
                      className="text-[#9B3B3B] hover:text-red-700 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}