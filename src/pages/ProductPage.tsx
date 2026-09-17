import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, Heart, ChevronLeft, ChevronRight, Share2, X } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import SizeSelector from '../components/SizeSelector'
import IslandHeader from '../components/IslandHeader'
import { useStore, isProductOnSale, getEffectivePriceUsd } from '../store/useStore'
import { supabase, getProductSizes, checkProductStock } from '../lib/supabase'
import { getCachedProduct, getCachedSizes, cacheProduct, cacheSizes } from '../lib/productCache'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { language, currency, exchangeRate, saleModeEnabled, addToCart, addToFavorites, removeFromFavorites, isFavorite } = useStore()
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  // ✅ МГНОВЕННАЯ инициализация из кеша — без спиннера, если товар уже в памяти
  const [product, setProduct] = useState<any>(() => getCachedProduct(id))
  const [sizes, setSizes] = useState<string[]>(() => getCachedSizes(id) || [])
  const [loading, setLoading] = useState(() => !getCachedProduct(id))
  const [sizesLoading, setSizesLoading] = useState(() => !getCachedSizes(id))

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showFullScreen, setShowFullScreen] = useState(false)
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0)

  useEffect(() => {
    if (!id) return

    // ✅ Сброс состояния под новый id (мгновенно из кеша, если есть)
    const cachedProduct = getCachedProduct(id)
    const cachedSizes = getCachedSizes(id)
    setProduct(cachedProduct)
    setLoading(!cachedProduct)
    setSizes(cachedSizes || [])
    setSizesLoading(!cachedSizes)
    setSelectedSize(null)
    setCurrentImageIndex(0)
    setShowFullScreen(false)

    loadProduct()
    loadSizes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadProduct = async () => {
    const cached = getCachedProduct(id)

    // ✅ Товар из кеша: рендерим сразу, тихо обновляем в фоне (без спиннера)
    if (cached) {
      setProduct(cached)
      setLoading(false)
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single()
        if (!error && data) {
          cacheProduct(data)
          setProduct(data)
        }
      } catch (err) {
        // Игнорируем: уже показываем данные из кеша
      }
      return
    }

    // ✅ Товара в кеше нет (прямой вход по ссылке) — обычный запрос со спиннером
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      if (error) {
        console.error('Ошибка при загрузке товара:', error)
        setProduct(null)
      } else {
        cacheProduct(data)
        setProduct(data || null)
      }
    } catch (err) {
      console.error('Ошибка загрузки:', err)
      setProduct(null)
    }
    setLoading(false)
  }

  const loadSizes = async () => {
    if (!id) return

    // ✅ Размеры из кеша — мгновенно
    const cachedSizes = getCachedSizes(id)
    if (cachedSizes) {
      setSizes(cachedSizes)
      setSizesLoading(false)
      return
    }

    setSizesLoading(true)
    const variants = await getProductSizes(id)
    const sizeValues = variants.map((v: any) => v.size_value)
    cacheSizes(id, sizeValues)
    setSizes(sizeValues)
    setSizesLoading(false)
  }

  const handleBack = () => {
    navigate(-1)
  }

  const onSale = isProductOnSale(product, saleModeEnabled)
  const effectivePrice = getEffectivePriceUsd(product, saleModeEnabled)
  const discountPercent = onSale
    ? Math.round((1 - Number(product?.sale_price) / Number(product?.price_usd)) * 100)
    : 0

  const handleAddToCart = async () => {
    if (!product) {
      toast.error('Товар недоступен')
      return
    }
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
    const stockCheck = await checkProductStock(product.id, sizeToAdd, 1)
    if (!stockCheck.available) {
      toast.error(stockCheck.error || 'Товар недоступен', {
        description: language === 'ru'
          ? 'Попробуйте выбрать другой размер или посмотрите другие товары'
          : 'Boshqa o\'lchamni tanlang yoki boshqa mahsulotlarga qarang',
        duration: 4000,
      })
      return
    }
    addToCart({
      productId: product.id,
      name: language === 'ru' ? (product.name_ru || 'Товар') : (product.name_uz || 'Mahsulot'),
      priceUsd: effectivePrice,
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
        name: language === 'ru' ? (product.name_ru || 'Товар') : (product.name_uz || 'Mahsulot'),
        priceUsd: effectivePrice,
        image: product.images?.[0] || '',
      })
      toast.success(
        language === 'ru' ? 'Добавлено в избранное ❤️' : 'Sevimlilarga qo\'shildi ❤️',
        { duration: 2000 }
      )
    }
  }

  const handleShare = async () => {
    if (!product) return
    const shareUrl = window.location.href
    const shareTitle = language === 'ru' ? (product.name_ru || 'Товар') : (product.name_uz || 'Mahsulot')
    const shareText = `${shareTitle} — ${formatPrice(effectivePrice)}`
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
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

  const getDescription = () => {
    if (!product) return ''
    if (language === 'ru') {
      return product.description_ru || ''
    }
    return product.description_uz || ''
  }

  const description = getDescription()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
        <IslandHeader needsBack onBack={handleBack} />
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2A4A] dark:border-gold mx-auto mb-4"></div>
            <p className="text-[#8A8275] dark:text-gray-300">
              {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
        <IslandHeader needsBack onBack={handleBack} />
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <p className="text-[#8A8275] dark:text-gray-300">
            {language === 'ru' ? 'Товар не найден' : 'Mahsulot topilmadi'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
      <Toaster position="top-center" richColors />

      <IslandHeader needsBack onBack={handleBack} />

      <div className="p-4">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl overflow-hidden mb-4 shadow-sm border border-[#E8E2D5] dark:border-dark-border">
          <div className="relative">
            <img
              src={images[currentImageIndex]}
              alt={language === 'ru' ? (product.name_ru || 'Товар') : (product.name_uz || 'Mahsulot')}
              className="w-full aspect-square object-cover cursor-pointer"
              onClick={() => openFullScreen(currentImageIndex)}
            />
            {onSale && (
              <span className="absolute top-4 left-4 bg-[#9B3B3B] text-white text-sm font-bold px-3 py-1.5 rounded-full">
                -{discountPercent}%
              </span>
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPreviousImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-dark-accent/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white dark:hover:bg-dark-border transition-colors border border-transparent dark:border-dark-border"
                >
                  <ChevronLeft size={24} className="text-[#1B2A4A] dark:text-white" />
                </button>
                <button
                  onClick={goToNextImage}
                  className="absolute right-14 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-dark-accent/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white dark:hover:bg-dark-border transition-colors border border-transparent dark:border-dark-border"
                >
                  <ChevronRight size={24} className="text-[#1B2A4A] dark:text-white" />
                </button>
              </>
            )}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={handleToggleFavorite}
                className="bg-white/90 dark:bg-dark-accent/90 backdrop-blur-sm rounded-full p-3 shadow-lg hover:scale-110 transition-transform border border-transparent dark:border-dark-border"
              >
                <Heart
                  size={24}
                  className={isFavorite(product.id) ? 'fill-[#9B3B3B] text-[#9B3B3B]' : 'text-[#8A8275] dark:text-gray-300'}
                />
              </button>
              <button
                onClick={handleShare}
                className="bg-white/90 dark:bg-dark-accent/90 backdrop-blur-sm rounded-full p-3 shadow-lg hover:scale-110 transition-transform border border-transparent dark:border-dark-border"
              >
                <Share2 size={24} className="text-[#8A8275] dark:text-gray-300" />
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
                    index === currentImageIndex
                      ? 'border-[#1B2A4A] dark:border-gold'
                      : 'border-[#E8E2D5] dark:border-dark-border'
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

        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 mb-4 shadow-sm border border-[#E8E2D5] dark:border-dark-border">
          <h1 className="text-xl font-bold mb-2 text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? (product.name_ru || 'Товар') : (product.name_uz || 'Mahsulot')}
          </h1>

          {onSale && (
            <p className="text-lg text-[#8A8275] dark:text-gray-400 line-through">
              {formatPrice(product.price_usd || 0)}
            </p>
          )}
          <p className={`text-2xl font-bold mb-2 ${onSale ? 'text-[#9B3B3B] dark:text-red-400' : 'text-[#1B2A4A] dark:text-white'}`}>
            {formatPrice(effectivePrice)}
          </p>
          {onSale && (
            <span className="inline-block bg-[#9B3B3B] text-white text-xs font-bold px-2 py-1 rounded-full mb-2">
              💰 {language === 'ru' ? `Скидка -${discountPercent}%` : `Chegirma -${discountPercent}%`}
            </span>
          )}

          {description && description.trim() !== '' && (
            <div className="mb-4 pb-4 border-b border-[#E8E2D5] dark:border-dark-border">
              <h3 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
                {language === 'ru' ? 'Описание' : 'Tavsif'}
              </h3>
              <p className="text-[#8A8275] dark:text-gray-300 whitespace-pre-line text-sm leading-relaxed">
                {description}
              </p>
            </div>
          )}

          <SizeSelector
            sizeType={product.size_type || 'numeric'}
            availableSizes={sizes.length > 0 ? sizes : ['One Size']}
            onSelect={setSelectedSize}
            language={language}
          />

          <button
            onClick={handleAddToCart}
            disabled={sizesLoading || sizes.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
              sizesLoading || sizes.length === 0
                ? 'bg-[#E8E2D5] dark:bg-dark-accent text-[#8A8275] dark:text-gray-500 cursor-not-allowed'
                : 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] hover:bg-[#142038] dark:hover:bg-[#d6b57e]'
            }`}
          >
            <ShoppingCart size={20} />
            {sizesLoading
              ? (language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...')
              : sizes.length === 0
                ? (language === 'ru' ? 'Нет в наличии' : 'Mavjud emas')
                : (language === 'ru' ? 'В корзину' : 'Savatga')}
          </button>
          {!sizesLoading && sizes.length === 0 && (
            <p className="text-center text-sm text-[#8A8275] dark:text-gray-400 mt-2">
              {language === 'ru'
                ? 'Этот товар временно отсутствует'
                : 'Bu mahsulot vaqtincha mavjud emas'}
            </p>
          )}
        </div>
      </div>

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