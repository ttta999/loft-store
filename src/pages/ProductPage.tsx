import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { getProducts } from '../lib/supabase'
import { ChevronLeft, Heart } from 'lucide-react'
import SizeSelector from '../components/SizeSelector'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { language, currency, exchangeRate, addToCart, addToFavorites, removeFromFavorites, isFavorite } = useStore()
  const [product, setProduct] = useState<any>(null)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    if (!id) return
    setLoading(true)
    const allProducts = await getProducts()
    const foundProduct = allProducts.find(p => p.id === id)
    setProduct(foundProduct || null)
    setLoading(false)
  }

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const handleAddToCart = () => {
    if (!product) return
    
    const sizeToAdd = selectedSize || (product.sizes?.[0] || 'One Size')
    
    addToCart({
      productId: product.id,
      name: language === 'ru' ? product.name_ru : product.name_uz,
      priceUsd: product.price_usd,
      size: sizeToAdd,
      quantity: 1,
      image: product.images?.[0] || ''
    })
    
    alert(language === 'ru' ? 'Товар добавлен в корзину' : 'Mahsulot savatga qo\'shildi')
  }

  const handleToggleFavorite = () => {
    if (!product) return
    
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
  }

  const getSizeType = () => {
    if (!product) return 'numeric'
    if (product.size_type) return product.size_type
    if (product.category === 'shoes') return 'numeric'
    if (product.category === 'clothes') return 'alphabetical'
    if (product.sizes?.length === 1 && product.sizes[0] === 'One Size') return 'one_size'
    return 'numeric'
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-500">
            {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
          </p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {language === 'ru' ? 'Товар не найден' : 'Mahsulot topilmadi'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold"
          >
            {language === 'ru' ? 'На главную' : 'Bosh sahifa'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-black mb-4"
      >
        <ChevronLeft size={20} />
        {language === 'ru' ? 'Назад' : 'Orqaga'}
      </button>

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="aspect-square bg-gray-100 relative">
          <img
            src={product.images?.[0] || 'https://via.placeholder.com/500'}
            alt={language === 'ru' ? product.name_ru : product.name_uz}
            className="w-full h-full object-cover"
          />
          <button
            onClick={handleToggleFavorite}
            className="absolute top-4 right-4 bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
          >
            <Heart 
              size={24} 
              className={isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}
            />
          </button>
        </div>

        <div className="p-4">
          <h1 className="text-2xl font-bold mb-2">
            {language === 'ru' ? product.name_ru : product.name_uz}
          </h1>
          
          <p className="text-2xl font-bold text-black mb-4">
            {formatPrice(product.price_usd)}
          </p>

          {product.description && (
            <div className="mb-4">
              <h3 className="font-bold mb-2">
                {language === 'ru' ? 'Описание' : 'Tavsif'}
              </h3>
              <p className="text-gray-600 text-sm">
                {language === 'ru' ? product.description_ru : product.description_uz}
              </p>
            </div>
          )}

          {product.sizes && product.sizes.length > 0 && (
            <div className="mb-6">
              <SizeSelector
                sizeType={getSizeType()}
                availableSizes={product.sizes}
                onSelect={setSelectedSize}
                language={language as 'ru' | 'uz'}
              />
            </div>
          )}

          <button
            onClick={handleAddToCart}
            className="w-full py-4 rounded-xl font-bold text-lg bg-black text-white hover:bg-gray-800 transition-colors"
          >
            {language === 'ru' ? 'Добавить в корзину' : 'Savatga qo\'shish'}
          </button>
        </div>
      </div>
    </div>
  )
}