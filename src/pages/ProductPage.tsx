import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Heart, ChevronLeft, ChevronRight, Share2, X } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import SizeSelector from '../components/SizeSelector'
import { useStore } from '../store/useStore'
import { supabase, getProductSizes } from '../lib/supabase'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { language, currency, exchangeRate, addToCart, addToFavorites, removeFromFavorites, isFavorite } = useStore()
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [product, setProduct] = useState<any>(null)
  const [sizes, setSizes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showFullScreen, setShowFullScreen] = useState(false)
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0)
  
  // ✅ Проверяем, пришли ли мы из корзины
  const cameFromCart = location.state?.fromCart

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

  const handleBack = () => {
    // ✅ Если пришли из корзины — возвращаемся туда
    if (cameFromCart) {
      navigate('/cart', { state: location.state?.fromCheckout })
    } else {
      // Иначе используем стандартную навигацию назад
      navigate(-1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* ✅ Шапка с LOFT Store даже при загрузке */}
        <div className="bg-white p-4 shadow-sm sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-black"
            >
              <ArrowLeft size={20} />
              <span>{language === 'ru' ? 'Назад' : 'Orqaga'}</span>
            </button>
            <h1 className="text-xl font-bold">LOFT Store</h1>
            <div className="w-16"></div>
          </div>
        </div>
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
        {/* ✅ Шапка с LOFT Store даже при ошибке */}
        <div className="bg-white p-4 shadow-sm sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-black"
            >
              <ArrowLeft size={20} />
              <span>{language === 'ru' ? 'Назад' : 'Orqaga'}</span>
            </button>
            <h1 className="text-xl font-bold">LOFT Store</h1>
            <div className="w-16"></div>
          </div>
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

  const getImages = (): string[] => {
    if (!product) return ['https://via.placeholder.com/500']
    if (Array.isArray(product.images)) {
      return product.images.filter((img: string) => img)
    }
    if (typeof product.images === 'string' && product.images) {
      return [product.images]
    }
    if (product.image) {
      return [product.image]
    }
    return ['https://via.placeholder.com/500']
  }

  const images = getImages()

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
      image: images[0] || '',
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
        image: images[0] || '',
      })
      toast.success(
        language === 'ru' ? 'Добавлено в избранное ❤️' : 'Sevimlilarga qo\'shildi ❤️',
        { duration: 2000 }
      )
    }
  }

  const handleShare = async () => {
    const shareUrl = window.location.href
    const shareTitle = language === 'ru' ? product.name_ru : product.name_uz
    const shareText = `${shareTitle} — ${formatPrice(product.price_usd)}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
      } catch (err) {
        console.log('Поделиться отменено:', err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast.success(
          language === 'ru' ? 'Ссылка скопирована!' : 'Havola nusxalandi!',
          { duration: 2000 }
        )
      } catch (err) {
        console.error('Ошибка копирования:', err)
      }
    }
  }

  const goToPreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const openFullScreen = (index: number) => {
    setFullScreenImageIndex(index)
    setShowFullScreen(true)
  }

  const closeFullScreen = () => {
    setShowFullScreen(false)
  }

  const fullScreenPrev = () => {
    setFullScreenImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const fullScreenNext = () => {
    setFullScreenImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const description = language === 'ru' ? product.description_ru : product.description_uz

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-center" richColors />
      
      {/* ✅ ШАПКА С LOFT STORE — ВСЕГДА ВИДНА */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-black"
          >
            <ArrowLeft size={20} />
            <span>{language === 'ru' ? 'Назад' : 'Orqaga'}</span>
          </button>
          <h1 className="text-xl font-bold">LOFT Store</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-2xl overflow-hidden mb-4">
          <div className="relative">
            <img
              src={images[currentImageIndex]}
              alt={language === 'ru' ? product.name_ru : product.name_uz}
              className="w-full aspect-square object-cover cursor-pointer"
              onClick={() => openFullScreen(currentImageIndex)}
            />
            
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
                  className="absolute right-14 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={handleToggleFavorite}
                className="bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
              >
                <Heart 
                  size={24} 
                  className={isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}
                />
              </button>
              <button
                onClick={handleShare}
                className="bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
              >
                <Share2 size={24} className="text-gray-600" />
              </button>
            </div>

            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_: string, index: number) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentImageIndex 
                        ? 'bg-white w-6' 
                        : 'bg-white/50 w-2'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="p-3 flex gap-2 overflow-x-auto">
              {images.map((image: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentImageIndex ? 'border-black' : 'border-gray-200'
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

        <div className="bg-white rounded-2xl p-4 mb-4">
          <h1 className="text-xl font-bold mb-2">
            {language === 'ru' ? product.name_ru : product.name_uz}
          </h1>
          <p className="text-2xl font-bold text-black mb-4">
            {formatPrice(product.price_usd)}
          </p>

          {description && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <h3 className="font-bold mb-2">
                {language === 'ru' ? 'Описание' : 'Tavsif'}
              </h3>
              <p className="text-gray-600 whitespace-pre-line text-sm leading-relaxed">
                {description}
              </p>
            </div>
          )}

          <SizeSelector
            sizeType={product.size_type}
            availableSizes={sizes.length > 0 ? sizes : ['One Size']}
            onSelect={setSelectedSize}
            language={language}
          />

          <button
            onClick={handleAddToCart}
            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
          >
            <ShoppingCart size={20} />
            {language === 'ru' ? 'В корзину' : 'Savatga'}
          </button>
        </div>
      </div>

      {/* Полноэкранный просмотр фото */}
      {showFullScreen && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={closeFullScreen}
            className="absolute top-4 right-4 text-white z-50 bg-black/50 rounded-full p-2"
          >
            <X size={32} />
          </button>
          
          {images.length > 1 && (
            <>
              <button
                onClick={fullScreenPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-3 z-50"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={fullScreenNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-3 z-50"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}
          
          <img
            src={images[fullScreenImageIndex]}
            alt="Full screen"
            className="max-w-full max-h-full object-contain"
          />
          
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === fullScreenImageIndex 
                      ? 'bg-white w-6' 
                      : 'bg-white/50 w-2'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}