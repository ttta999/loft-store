import { Link } from 'react-router-dom'
import { useStore, isProductOnSale } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { Heart, Trash2, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import IslandHeader from '../components/IslandHeader'

// ✅ Склонение «товар / товара / товаров»
const getItemsLabelRu = (count: number): string => {
  const lastTwo = count % 100
  const lastOne = count % 10
  if (lastTwo >= 11 && lastTwo <= 19) return 'товаров'
  if (lastOne === 1) return 'товар'
  if (lastOne >= 2 && lastOne <= 4) return 'товара'
  return 'товаров'
}

export default function FavoritesPage() {
  const { favorites, removeFromFavorites, currency, exchangeRate, language, saleModeEnabled } = useStore()
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    getProducts().then(setProducts)
  }, [])

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const handleBack = () => {
    window.history.back()
  }

  // ✅ ПУСТОЕ СОСТОЯНИЕ — шапка-карточка + карточка с иконкой и кнопкой
  if (favorites.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
        <IslandHeader needsBack onBack={handleBack} />

        <div className="p-4">
          {/* ✅ Шапка-карточка (как шапка заказа) */}
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                {language === 'ru' ? 'Избранное' : 'Sevimlilar'}
              </h1>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                {language === 'ru' ? 'Пока пусто' : 'Hali bo\'sh'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Heart size={18} className="text-[#1B2A4A] dark:text-white" />
            </div>
          </div>

          {/* ✅ Карточка пустого состояния */}
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border mx-auto mb-3 flex items-center justify-center">
              <Heart size={24} className="text-[#8A8275] dark:text-gray-300" />
            </div>
            <p className="text-sm font-medium text-[#1B2A4A] dark:text-white mb-1">
              {language === 'ru' ? 'Избранное пусто' : 'Sevimlilar bo\'sh'}
            </p>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mb-4 px-2">
              {language === 'ru'
                ? 'Добавляйте товары в избранное, чтобы не потерять их'
                : 'Mahsulotlarni yo\'qotib qo\'ymaslik uchun sevimlilarga qo\'shing'}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] text-sm font-bold hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors"
            >
              <ShoppingBag size={16} />
              {language === 'ru' ? 'Перейти в каталог' : 'Kataloqqa o\'tish'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <IslandHeader needsBack onBack={handleBack} />

      <div className="p-4 pb-20">
        {/* ✅ Шапка-карточка: заголовок + счётчик + круглая иконка (стиль страницы заказа) */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
              {language === 'ru' ? 'Избранное' : 'Sevimlilar'}
            </h1>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
              {favorites.length} {
                language === 'ru'
                  ? getItemsLabelRu(favorites.length)
                  : 'ta mahsulot'
              }
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            <Heart size={18} className="text-[#1B2A4A] dark:text-white" />
          </div>
        </div>

        {/* ✅ Единая карточка со строками-иконками и разделителями */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border overflow-hidden divide-y divide-[#E8E2D5] dark:divide-dark-border">
          {favorites.map((item) => {
            const product = products.find(p => p.id === item.productId)
            const onSale = product ? isProductOnSale(product, saleModeEnabled) : false
            const displayPrice = onSale ? Number(product.sale_price) : item.priceUsd

            return (
              <div key={item.productId} className="flex items-center gap-3 p-3.5">
                {/* Миниатюра товара — клик ведёт на карточку */}
                <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover border border-[#E8E2D5] dark:border-dark-border"
                  />
                </Link>

                {/* Название + цены */}
                <Link to={`/product/${item.productId}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1B2A4A] dark:text-white truncate">
                    {item.name}
                  </p>
                  {onSale && (
                    <p className="text-xs text-[#8A8275] dark:text-gray-500 line-through mt-0.5">
                      {formatPrice(item.priceUsd)}
                    </p>
                  )}
                  <p className={`text-sm font-bold mt-0.5 ${
                    onSale ? 'text-[#9B3B3B] dark:text-red-400' : 'text-[#1B2A4A] dark:text-white'
                  }`}>
                    {formatPrice(displayPrice)}
                  </p>
                </Link>

                {/* Кнопка удаления */}
                <button
                  onClick={() => removeFromFavorites(item.productId)}
                  title={language === 'ru' ? 'Удалить из избранного' : 'Sevimlilardan o\'chirish'}
                  className="p-2 rounded-lg text-[#9B3B3B] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}

          {/* ✅ Нижняя строка «Итого» — как в деталях заказа */}
          <div className="flex justify-between items-center px-4 py-3 bg-[#F5F1E8]/60 dark:bg-dark-accent/40">
            <span className="text-xs text-[#8A8275] dark:text-gray-300">
              {language === 'ru' ? 'Всего позиций' : 'Jami pozitsiyalar'}
            </span>
            <span className="text-sm font-bold text-[#1B2A4A] dark:text-white">
              {favorites.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}