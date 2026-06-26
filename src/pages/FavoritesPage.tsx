import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Heart, Trash2 } from 'lucide-react'

export default function FavoritesPage() {
  const { favorites, removeFromFavorites, currency, exchangeRate, language } = useStore()

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  if (favorites.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* ✅ БЕЗ border-b, с shadow-sm */}
        <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-gray-600 hover:text-black">
              ← {language === 'ru' ? 'Назад' : 'Orqaga'}
            </Link>
            <h1 className="text-xl font-bold">LOFT Store</h1>
            <div className="w-16"></div>
          </div>
        </div>
        
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <Heart size={64} className="text-gray-300 mb-4" />
          <h2 className="text-xl font-bold mb-2">
            {language === 'ru' ? 'Избранное пусто' : 'Sevimlilar bo\'sh'}
          </h2>
          <p className="text-gray-500 text-center px-4 mb-6">
            {language === 'ru' 
              ? 'Добавляйте товары в избранное, чтобы не потерять их' 
              : 'Mahsulotlarni yo\'qotib qo\'ymaslik uchun sevimlilarga qo\'shing'}
          </p>
          <Link 
            to="/" 
            className="bg-black text-white px-6 py-3 rounded-xl font-bold"
          >
            {language === 'ru' ? 'Перейти в каталог' : 'Kataloqqa o\'tish'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ БЕЗ border-b, с shadow-sm */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-gray-600 hover:text-black">
            ← {language === 'ru' ? 'Назад' : 'Orqaga'}
          </Link>
          <h1 className="text-xl font-bold">LOFT Store</h1>
          <div className="w-16"></div>
        </div>
      </div>
      
      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold mb-4">
          {language === 'ru' ? 'Избранное' : 'Sevimlilar'}
        </h1>

        <div className="grid grid-cols-2 gap-3">
          {favorites.map((item) => (
            <div key={item.productId} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <Link to={`/product/${item.productId}`}>
                <div className="aspect-square bg-gray-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>
              <div className="p-3">
                <Link to={`/product/${item.productId}`}>
                  <p className="text-sm font-medium truncate mb-2">
                    {item.name}
                  </p>
                </Link>
                <div className="flex items-center justify-between">
                  <p className="text-black font-bold">
                    {formatPrice(item.priceUsd)}
                  </p>
                  <button
                    onClick={() => removeFromFavorites(item.productId)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}