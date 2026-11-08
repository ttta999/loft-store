import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { Heart } from 'lucide-react'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'

const ProductCard = memo(function ProductCard({ product, placement }: { product: any; placement: string }) {
  const navigate = useNavigate()
  const { language, currency, exchangeRate, saleModeEnabled, addToFavorites, removeFromFavorites } = useStore(useShallow(state => ({ language: state.language, currency: state.currency, exchangeRate: state.exchangeRate, saleModeEnabled: state.saleModeEnabled, addToFavorites: state.addToFavorites, removeFromFavorites: state.removeFromFavorites })))
  const formatPrice = (usd: number) => currency === 'USD' ? `$${usd}` : `${(usd * exchangeRate).toLocaleString()} сум`
  const onSale = isProductOnSale(product, saleModeEnabled)
  const effectivePrice = getEffectivePriceUsd(product, saleModeEnabled)
  const discountPercent = onSale
    ? Math.round((1 - Number(product.sale_price) / Number(product.price_usd)) * 100)
    : 0

  const favorite = useStore(state => state.favorites.some(item => item.productId === product.id))

  return (
    <div
      data-product-placement={`${placement}:${product.id}`} data-product-card={product.id}
      role="link" tabIndex={0}
      onClick={() => navigate(`/product/${product.id}`)}
      onKeyDown={event => {
        if (event.key === 'Enter' && event.target === event.currentTarget) {
          event.preventDefault()
          event.currentTarget.click()
        }
      }}
      className="self-start bg-[#FBF9F4] dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-[#E8E2D5] dark:border-dark-border hover:shadow-md transition-shadow cursor-pointer">
        <div className="aspect-square bg-[#F5F1E8] dark:bg-dark-accent relative">
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
              e.stopPropagation()
              if (favorite) {
                removeFromFavorites(product.id)
              } else {
                addToFavorites({
                  productId: product.id,
                  name: language === 'ru' ? product.name_ru : product.name_uz,
                  priceUsd: effectivePrice,
                  image: product.images?.[0] || '',
                })
              }
            }}
            className="absolute top-2 right-2 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:scale-[1.02] transition-transform border border-transparent dark:border-dark-border"
          >
            <Heart
              size={18}
              className={
                favorite
                  ? 'fill-[#9B3B3B] text-[#9B3B3B]'
                  : 'text-[#8A8275] dark:text-gray-300'
              }
            />
          </button>
        </div>

        <div className="p-3">
          <p className="text-sm font-medium truncate text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? product.name_ru : product.name_uz}
          </p>

          {onSale && (
            <p className="text-[#8A8275] dark:text-gray-500 text-xs line-through mt-1">
              {formatPrice(product.price_usd)}
            </p>
          )}
        </div>

        <div className="flex justify-between items-center px-3 py-2.5 border-t border-[#E8E2D5] dark:border-dark-border bg-[#F5F1E8]/60 dark:bg-dark-accent/40">
          <span className="text-xs text-[#8A8275] dark:text-gray-300">
            {language === 'ru' ? 'Цена' : 'Narx'}
          </span>
          <span className={`text-sm font-bold ${onSale ? 'text-[#9B3B3B] dark:text-red-400' : 'text-[#1B2A4A] dark:text-white'}`}>
            {formatPrice(effectivePrice)}
          </span>
        </div>
    </div>
  )
})

export default ProductCard
