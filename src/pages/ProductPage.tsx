import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Heart } from 'lucide-react'
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
        {/* Фото товара */}
        <div className="bg-white rounded-2xl overflow-hidden mb-4 relative">
          <img
            src={product.images?.[0] || 'https://via.placeholder.com/500'}
            alt={language === 'ru' ? product.name_ru : product.name_uz}
            className="w-full aspect-square object-cover"
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