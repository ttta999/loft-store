import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import SizeSelector from '../components/SizeSelector'
import { useStore } from '../store/useStore'
import { supabase, getProductSizes } from '../lib/supabase'

export default function ProductPage() {
  const { id } = useParams()
  const { language, currency, exchangeRate, addToCart, addToFavorites, removeFromFavorites, isFavorite } = useStore()
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [product, setProduct] = useState<any>(null)
  const [sizes, setSizes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    if (id) {
      loadProduct()
      loadSizes()
    }
  }, [id])

  const loadProduct = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Ошибка при загрузке товара:', error)
      setProduct(null)
    } else {
      setProduct(data)
    }
    setLoading(false)
  }

  const loadSizes = async () => {
    if (!id) return
    const variants = await getProductSizes(id)
    const sizeValues = variants.map((v: any) => v.size_value)
    setSizes(sizeValues)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-500">
              {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white p-4 shadow-sm sticky top-0 z-40">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-black"
          >
            <ArrowLeft size={20} />
            <span>{language === 'ru' ? 'Назад' : 'Orqaga'}</span>
          </button>
        </div>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">
            {language === 'ru' ? 'Товар не найден' : 'Mahsulot topilmadi'}
          </p>
        </div>
      </div>
    )
  }

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const handleAddToCart = () => {
    if (product.size_type !== 'one_size' && !selectedSize) {
      toast.error(
        language === 'ru' ? 'Пожалуйста, выберите размер' : 'Iltimos, o\'lchamni tanlang',
        {
          description: language === 'ru' 
            ? 'Без этого мы не сможем отправить товар' 
            : 'Bunsiz mahsulotni yubora olmaymiz',
          duration: 3000,
        }
      )
      return
    }

    const sizeToAdd = product.size_type === 'one_size' ? 'One Size' : (selectedSize || '')

    addToCart({
      productId: product.id,
      name: language === 'ru' ? product.name_ru : product.name_uz,
      priceUsd: product.price_usd,
      size: sizeToAdd,
      quantity: 1,
      image: product.images?.[0] || '',
    })

    toast.success(
      language === 'ru' ? 'Товар добавлен в корзину!' : 'Mahsulot savatga qo\'shildi!',
      {
        description: language === 'ru' 
          ? 'Нажмите на иконку корзины внизу' 
          : 'Pastdagi savat belgisini bosing',
        duration: 3000,
      }
    )
  }

  const handleToggleFavorite = () => {
    if (!product) return
    
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id)
      toast.success(
        language === 'ru' ? 'Удалено из избранного' : 'Sevimlilardan o\'chirildi',
        { duration: 2000 }
      )
    } else {
      addToFavorites({
        productId: product.id,
        name: language === 'ru' ? product.name_ru : product.name_uz,
        priceUsd: product.price_usd,
        image: product.images?.[0] || '',
      })
      toast.success(
        language === 'ru' ? 'Добавлено в избранное ❤️' : 'Sevimlilarga qo\'shildi ❤️',
        { duration: 2000 }
      )
    }
  }

  const images = product.images || [product.images?.[0] || 'https://via.placeholder.com/500']

  const goToPreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const startX = touch.clientX
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      const endX = touch.clientX
      const diff = startX - endX
      
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          goToNextImage()
        } else {
          goToPreviousImage()
        }
      }
      
      document.removeEventListener('touchend', handleTouchEnd)
    }
    
    document.addEventListener('touchend', handleTouchEnd)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-center" richColors />
      
      {/* Шапка с кнопкой назад */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-40">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-black"
        >
          <ArrowLeft size={20} />
          <span>{language === 'ru' ? 'Назад' : 'Orqaga'}</span>
        </button>
      </div>

      <div className="p-4">
        {/* Галерея фото товара */}
        <div className="bg-white rounded-2xl overflow-hidden mb-4 relative">
          <div 
            className="relative"
            onTouchStart={handleTouchStart}
          >
            <img
              src={images[currentImageIndex]}
              alt={language === 'ru' ? product.name_ru : product.name_uz}
              className="w-full aspect-square object-cover"
            />
            
            {/* Кнопки навигации */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPreviousImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={goToNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Кнопка избранного */}
            <button
              onClick={handleToggleFavorite}
              className="absolute top-4 right-4 bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
            >
              <Heart 
                size={24} 
                className={isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}
              />
            </button>

            {/* Индикаторы фото */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_: any, index: number) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex ? 'bg-white w-6' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Миниатюры */}
          {images.length > 1 && (
            <div className="p-3 flex gap-2 overflow-x-auto">
              {images.map((image: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentImageIndex ? 'border-black' : 'border-transparent'
                  }`}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Информация о товаре */}
        <div className="bg-white rounded-2xl p-4 mb-4">
          <h1 className="text-xl font-bold mb-2">
            {language === 'ru' ? product.name_ru : product.name_uz}
          </h1>
          <p className="text-2xl font-bold text-black mb-4">
            {formatPrice(product.price_usd)}
          </p>

          {/* Выбор размера */}
          <SizeSelector
            sizeType={product.size_type}
            availableSizes={sizes.length > 0 ? sizes : ['One Size']}
            onSelect={setSelectedSize}
            language={language}
          />

          {/* Кнопка добавить в корзину */}
          <button
            onClick={handleAddToCart}
            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
          >
            <ShoppingCart size={20} />
            {language === 'ru' ? 'В корзину' : 'Savatga'}
          </button>
        </div>
      </div>
    </div>
  )
}