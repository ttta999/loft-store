import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, isProductOnSale } from '../store/useStore'
import { Minus, Plus, Trash2, ShoppingBag, CreditCard, Upload, Eye, Store, Truck, Phone, User as UserIcon, MapPin, Info, X, Copy, Check, MessageCircle } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { supabase, createOrder, createOrderFromSpecial, notifyNewOrder, deleteUnpaidOrder } from '../lib/supabase'
import { MANAGER_TELEGRAM_LINK, PAYMENT_CARDS, uploadPaymentScreenshot, savePaymentScreenshot } from '../lib/payments'
import IslandHeader from '../components/IslandHeader'

// ✅ Универсальный хук блокировки скролла body
const useBodyScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [active])
}

// ✅ Компонент просмотра скриншота с блокировкой скролла
// (без кнопки «Открыть в новой вкладке» — только просмотр и закрытие)
function ScreenshotViewer({ url, language, onClose }: { url: string; language: string; onClose: () => void }) {
  useBodyScrollLock(true)
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl w-full flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute -top-14 right-0 text-white hover:text-gray-300 flex items-center gap-2 text-lg font-medium z-10"
        >
          <X size={24} />
          {language === 'ru' ? 'Закрыть' : 'Yopish'}
        </button>
        <img
          src={url}
          alt="Screenshot"
          className="w-full h-auto rounded-lg object-contain"
          style={{ maxHeight: '85vh' }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

// ✅ Склонение «товар / товара / товаров»
const getItemsLabel = (count: number, lang: string): string => {
  if (lang === 'uz') return 'ta mahsulot'
  const lastTwo = count % 100
  const lastOne = count % 10
  if (lastTwo >= 11 && lastTwo <= 19) return 'товаров'
  if (lastOne === 1) return 'товар'
  if (lastOne >= 2 && lastOne <= 4) return 'товара'
  return 'товаров'
}

// ✅ БЕЗ пропсов — telegramUser берём из store
export default function CartPage() {
  const navigate = useNavigate()
  const {
    cart,
    removeFromCart,
    addToCart,
    getTotalPrice,
    currency,
    exchangeRate,
    language,
    saleModeEnabled,
    ensureProducts,
  } = useStore()
  const [showCheckout, setShowCheckout] = useState(false)
  const [deliveryPriceUzs, setDeliveryPriceUzs] = useState<number>(0)

  // ✅ Цена доставки из настроек админки (settings → delivery_price)
  useEffect(() => {
    const loadDeliveryPrice = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'delivery_price')
          .single()
        const price = (data?.value as any)?.price
        setDeliveryPriceUzs(typeof price === 'number' && price > 0 ? price : 0)
      } catch (error) {
        // Настройки ещё не созданы — доставка бесплатная
        setDeliveryPriceUzs(0)
      }
    }
    loadDeliveryPrice()
  }, [])

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  // ✅ Суммы для разбивки
  const productsUsd = getTotalPrice()
  const deliveryUsd = deliveryPriceUzs > 0 ? deliveryPriceUzs / exchangeRate : 0
  const finalUsd = productsUsd + deliveryUsd

  // ✅ Экономия на скидках: (обычная цена − скидочная) × кол-во по товарам в корзине
  const savingsUsd = (() => {
    if (!saleModeEnabled) return 0
    const catalog = ensureProducts() || []
    return cart.reduce((sum: number, item: any) => {
      const p = catalog.find((pp: any) => pp.id === item.productId)
      if (p && isProductOnSale(p, saleModeEnabled) && p.sale_price != null) {
        sum += (Number(p.price_usd) - Number(p.sale_price)) * (item.quantity || 1)
      }
      return sum
    }, 0)
  })()

  // ✅ ПУСТАЯ КОРЗИНА — шапка-карточка + карточка пустого состояния (стиль страницы заказа)
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
        <div className="p-4">
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                {language === 'ru' ? 'Корзина' : 'Savat'}
              </h1>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                {language === 'ru' ? 'Пока пусто' : 'Hali bo\'sh'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <ShoppingBag size={18} className="text-[#1B2A4A] dark:text-white" />
            </div>
          </div>

          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border mx-auto mb-3 flex items-center justify-center">
              <ShoppingBag size={24} className="text-[#8A8275] dark:text-gray-300" />
            </div>
            <p className="text-sm font-medium text-[#1B2A4A] dark:text-white mb-1">
              {language === 'ru' ? 'Корзина пуста' : 'Savat bo\'sh'}
            </p>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mb-4 px-2">
              {language === 'ru'
                ? 'Добавьте товары из каталога, чтобы оформить заказ'
                : 'Buyurtma rasmiylashtirish uchun katalogdan mahsulotlar qo\'shing'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] font-bold text-sm hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors"
            >
              {language === 'ru' ? 'В каталог' : 'Katalogga'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-56">
      <Toaster position="top-center" richColors />

      <div className="p-4">
        {/* ✅ Шапка-карточка: только заголовок + круглая иконка (без счётчика) */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
              {language === 'ru' ? 'Корзина' : 'Savat'}
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={18} className="text-[#1B2A4A] dark:text-white" />
          </div>
        </div>

        {/* ✅ Карточка «Товары»: строки с миниатюрами + разделители (без строки «Итого») */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 overflow-hidden">
          <div className="divide-y divide-[#E8E2D5] dark:divide-dark-border">
            {cart.map((item) => (
              <div key={`${item.productId}-${item.size}`} className="p-3.5 flex gap-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-xl border border-[#E8E2D5] dark:border-dark-border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                  onClick={() => navigate(`/product/${item.productId}`, {
                    state: { fromCart: true }
                  })}
                />
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/product/${item.productId}`, {
                    state: { fromCart: true }
                  })}
                >
                  <p className="font-medium text-sm text-[#1B2A4A] dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                    {language === 'ru' ? 'Размер:' : 'O\'lcham:'} {item.size}
                  </p>
                  <p className="font-bold text-sm text-[#1B2A4A] dark:text-white mt-1">
                    {formatPrice(item.priceUsd)}
                  </p>
                  {item.isSpecialOrder && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 text-xs rounded-full">
                      🌍 {language === 'ru' ? 'Спецзаказ' : 'Maxsus buyurtma'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end justify-between flex-shrink-0">
                  <button
                    onClick={() => removeFromCart(item.productId, item.size)}
                    title={language === 'ru' ? 'Удалить из корзины' : 'Savatdan o\'chirish'}
                    className="p-1.5 rounded-lg text-[#9B3B3B] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  {!item.isSpecialOrder ? (
                    <div className="flex items-center gap-1 bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border rounded-lg px-1.5 py-1">
                      <button
                        onClick={() => item.quantity > 1 && addToCart({ ...item, quantity: -1 })}
                        className="p-0.5 text-[#8A8275] dark:text-gray-300"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold text-sm text-[#1B2A4A] dark:text-white w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => addToCart({ ...item, quantity: 1 })}
                        className="p-0.5 text-[#8A8275] dark:text-gray-300"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#8A8275] dark:text-gray-300">1 {language === 'ru' ? 'шт.' : 'donа'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ Плавающая карточка оформления: разбивка цен + кнопка */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-4 pb-24 pt-2">
        <div className="pointer-events-auto bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border shadow-lg p-3 space-y-2.5">
          {/* ✅ Разбивка: Товары → Скидка → Доставка → Итого */}
          <div className="px-1 space-y-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Товары' : 'Mahsulotlar'}
              </span>
              <span className="text-sm font-medium text-[#1B2A4A] dark:text-white whitespace-nowrap">
                {formatPrice(productsUsd)}
              </span>
            </div>

            {savingsUsd > 0 && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs text-[#8A8275] dark:text-gray-300">
                  {language === 'ru' ? 'Скидка' : 'Chegirma'}
                </span>
                <span className="text-sm font-bold text-[#9B3B3B] dark:text-red-400 whitespace-nowrap">
                  −{formatPrice(savingsUsd)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Доставка' : 'Yetkazib berish'}
              </span>
              {deliveryPriceUzs > 0 ? (
                <span className="text-sm font-medium text-[#1B2A4A] dark:text-white whitespace-nowrap">
                  {formatPrice(deliveryUsd)}
                </span>
              ) : (
                <span className="text-sm font-bold text-green-700 dark:text-green-400 whitespace-nowrap">
                  {language === 'ru' ? 'Бесплатно' : 'Bepul'}
                </span>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-[#E8E2D5] dark:border-dark-border">
              <span className="text-sm font-bold text-[#1B2A4A] dark:text-white">
                {language === 'ru' ? 'Итого' : 'Jami'}
              </span>
              <span className="text-base font-bold text-[#1B2A4A] dark:text-white whitespace-nowrap">
                {formatPrice(finalUsd)}
              </span>
            </div>
          </div>

          {/* Кнопка — как кнопки действий на странице заказа */}
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full py-3 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] font-bold flex items-center justify-center gap-2 hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors"
          >
            <CreditCard size={18} />
            {language === 'ru' ? 'Оформить заказ' : 'Buyurtma berish'}
          </button>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          onClose={() => setShowCheckout(false)}
          formatPrice={formatPrice}
          getTotalPrice={getTotalPrice}
          language={language}
          deliveryPriceUzs={deliveryPriceUzs}
        />
      )}
    </div>
  )
}

// ✅ telegramUser берём из store внутри модалки
function CheckoutModal({ onClose, formatPrice, getTotalPrice, language, deliveryPriceUzs }: any) {
  // ✅ Блокируем скролл body пока модалка открыта
  useBodyScrollLock(true)

  // ✅ currency нужна: сохраняем валюту в заказ + выбираем карту оплаты
  const { cart, clearCart, currency, exchangeRate, telegramUser } = useStore()
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup')
  const [paymentMethod, setPaymentMethod] = useState<'online_card' | 'upon_receipt'>('online_card')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+998')
  const [address, setAddress] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPaymentInfo, setShowPaymentInfo] = useState(false)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const [screenshotUploaded, setScreenshotUploaded] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [showScreenshotModal, setShowScreenshotModal] = useState(false)

  const specialItem = cart.find((i: any) => i.isSpecialOrder)
  const isSpecialOrder = !!specialItem

  const totalQty = cart.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)

  // ✅ Доставка: платная только при методе «Доставка»
  const deliveryCostUsd = deliveryMethod === 'delivery' && deliveryPriceUzs > 0
    ? deliveryPriceUzs / exchangeRate
    : 0
  const finalUsd = getTotalPrice() + deliveryCostUsd

  // ✅ Карта оплаты подстраивается под валюту корзины
  const orderCurrency: 'UZS' | 'USD' = currency === 'USD' ? 'USD' : 'UZS'
  const payCard = PAYMENT_CARDS[orderCurrency]

  useEffect(() => {
    if (isSpecialOrder) {
      setPaymentMethod('online_card')
    }
  }, [isSpecialOrder])

  const handleDeliveryChange = (method: 'pickup' | 'delivery') => {
    setDeliveryMethod(method)
    if (method === 'delivery') {
      setPaymentMethod('online_card')
    }
  }

  const handlePhoneChange = (value: string) => {
    let cleaned = value.replace(/[^\d+]/g, '')
    if (!cleaned.startsWith('+998') && cleaned.length > 0) {
      cleaned = cleaned.startsWith('+') ? '+998' + cleaned.slice(1) : '+998' + cleaned
    }
    if (cleaned.startsWith('+') && !cleaned.startsWith('+998')) cleaned = '+998'
    if (cleaned.length > 13) cleaned = cleaned.slice(0, 13)
    setPhone(cleaned)
  }

  const validateAddress = (addr: string): string | null => {
    if (!addr.trim()) {
      return language === 'ru' ? 'Введите адрес доставки' : 'Yetkazib berish manzilini kiriting'
    }
    if (addr.trim().length < 5) {
      return language === 'ru' ? 'Адрес слишком короткий (минимум 5 символов)' : 'Manzil juda qisqa (kamida 5 ta belgi)'
    }
    const hasLetters = /[a-zA-Zа-яА-Я]/.test(addr)
    if (!hasLetters) {
      return language === 'ru' ? 'Адрес должен содержать буквы (укажите улицу или ориентир)' : 'Manzilda harflar bo\'lishi kerak'
    }
    return null
  }

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(payCard.number.replace(/\s/g, ''))
      toast.success(language === 'ru' ? 'Номер карты скопирован!' : 'Karta raqami nusxalandi!')
    } catch (error) {
      console.error('Ошибка копирования:', error)
      toast.error(language === 'ru' ? 'Не удалось скопировать' : 'Nusxalab bo\'lmadi')
    }
  }

  const createOrderInDb = async (): Promise<any> => {
    const userId = telegramUser?.id?.toString() || 'guest-user'
    const totalInSums = Math.round(finalUsd * exchangeRate)
    const itemsWithPrices = cart.map(item => ({
      ...item,
      priceUzs: Math.round(item.priceUsd * exchangeRate),
    }))
    const orderData = {
      user_id: userId,
      user_chat_id: userId,
      client_name: name.trim(),
      client_phone: phone,
      delivery_method: deliveryMethod,
      delivery_address: deliveryMethod === 'delivery' ? address.trim() : null,
      payment_method: paymentMethod,
      total_price_usd: finalUsd,
      total_price_uzs: totalInSums,
      exchange_rate_at_order: exchangeRate,
      // ✅ ВАЛЮТА ЗАКАЗА — сохраняем, чтобы в истории показывать в ней же
      order_currency: orderCurrency,
      items: itemsWithPrices,
      status: paymentMethod === 'online_card' ? 'Ожидает оплаты' : 'Активный',
      payment_status: paymentMethod === 'online_card' ? 'pending' : 'paid',
    }
    let result: any
    if (isSpecialOrder && specialItem.specialRequestId) {
      result = await createOrderFromSpecial(specialItem.specialRequestId, orderData)
    } else {
      result = await createOrder(orderData)
    }
    const data = Array.isArray(result.data) ? result.data[0] : result.data
    if (result.error || !data) {
      throw new Error(result.error?.message || 'Ошибка создания заказа')
    }
    return data
  }

  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentOrderId) return
    setUploadingScreenshot(true)
    try {
      const screenshotUrlResult = await uploadPaymentScreenshot(currentOrderId, file)
      const saved = await savePaymentScreenshot(currentOrderId, screenshotUrlResult)
      if (saved) {
        setScreenshotUploaded(true)
        setScreenshotUrl(screenshotUrlResult)
        toast.success(language === 'ru' ? 'Скриншот загружен! Ожидайте подтверждения.' : 'Screenshot yuklandi! Tasdiqlashni kuting.')
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      toast.error(language === 'ru' ? 'Ошибка загрузки скриншота' : 'Screenshot yuklashda xatolik')
    } finally {
      setUploadingScreenshot(false)
    }
  }

  // ✅ ПОЛНОЕ удаление неоплаченного заказа из БД — без следа «Отменён».
  const cancelUnpaidOrder = async () => {
    if (!currentOrderId) return
    try {
      await deleteUnpaidOrder(currentOrderId)
    } catch (err) {
      console.error('Ошибка удаления неоплаченного заказа:', err)
    }
  }

  const handleSubmit = async () => {
    if (!name || name.trim().length < 3) {
      toast.error(language === 'ru' ? 'Имя должно содержать минимум 3 символа' : 'Ism kamida 3 ta belgidan iborat bo\'lishi kerak')
      return
    }
    const phoneRegex = /^\+998\d{9}$/
    if (!phoneRegex.test(phone)) {
      toast.error(language === 'ru' ? 'Телефон должен быть в формате +998XXXXXXXX' : 'Telefon +998XXXXXXXX formatida bo\'lishi kerak')
      return
    }
    if (deliveryMethod === 'delivery') {
      const addressError = validateAddress(address)
      if (addressError) {
        toast.error(addressError)
        return
      }
    }
    setSubmitting(true)
    try {
      const orderData = await createOrderInDb()
      await notifyNewOrder(orderData)
      const newOrderId = orderData.id
      if (paymentMethod === 'online_card') {
        setCurrentOrderId(newOrderId.toString())
        setShowPaymentInfo(true)
        setSubmitting(false)
        return
      }
      setOrderId(newOrderId)
      setOrderSuccess(true)
      clearCart()
    } catch (error: any) {
      console.error('Полная ошибка:', error)
      toast.error(language === 'ru' ? 'Ошибка: ' + error.message : 'Xatolik: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ✅ ЭКРАН ОПЛАТЫ — шапка-карточка со статус-пиллом (стиль страницы заказа)
  if (showPaymentInfo) {
    return (
      <div className="fixed inset-0 bg-[#F5F1E8] dark:bg-dark-bg z-50 flex flex-col">
        {/* ✅ Остров со стрелкой «назад» — при выходе БЕЗ скриншота заказ ПОЛНОСТЬЮ удаляется из БД */}
        <IslandHeader
          needsBack={true}
          onBack={async () => {
            if (screenshotUploaded) {
              // Скриншот загружен → заказ принят
              setShowPaymentInfo(false)
              setOrderSuccess(true)
              clearCart()
            } else {
              // ❌ Скриншот НЕ загружен → полностью удаляем заказ из БД
              await cancelUnpaidOrder()
              setShowPaymentInfo(false)
            }
          }}
        />

        <div className="flex-1 overflow-y-auto px-4 pb-48">
          {/* ✅ Шапка: номер заказа + статус-пилл + строка «Итого» (как на странице заказа) */}
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                  {language === 'ru' ? `Заказ №${currentOrderId}` : `Buyurtma №${currentOrderId}`}
                </h2>
                <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-1">
                  {language === 'ru' ? 'Сумма к оплате' : "To'lov summasi"}
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300">
                ⏳ {language === 'ru' ? 'Ожидает оплаты' : "To'lovni kutmoqda"}
              </span>
            </div>
            <div className="border-t border-[#E8E2D5] dark:border-dark-border mt-3 pt-3 flex justify-between items-center">
              <span className="font-bold text-[#1B2A4A] dark:text-white">
                {language === 'ru' ? 'Итого:' : 'Jami:'}
              </span>
              <span className="text-xl font-bold text-[#1B2A4A] dark:text-white">
                {formatPrice(finalUsd)}
              </span>
            </div>
          </div>

          {/* ✅ Реквизиты + скриншот: единая карточка со строками-иконками */}
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 divide-y divide-[#E8E2D5] dark:divide-dark-border">
            <div className="flex items-center gap-3 p-3.5">
              <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                <CreditCard size={16} className="text-[#1B2A4A] dark:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#8A8275] dark:text-gray-300 flex items-center gap-1.5">
                  {language === 'ru' ? 'Карта для оплаты' : "To'lov kartasi"}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]">
                    {orderCurrency}
                  </span>
                </p>
                <p className="text-sm font-bold tracking-wider text-[#1B2A4A] dark:text-white break-all">
                  {payCard.number}
                </p>
                <p className="text-xs text-[#C9A961] font-medium mt-0.5">{payCard.holder}</p>
              </div>
              <button
                onClick={handleCopyCard}
                title={language === 'ru' ? 'Скопировать номер карты' : 'Karta raqamini nusxalash'}
                className="w-9 h-9 rounded-lg bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] flex items-center justify-center flex-shrink-0 hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors"
              >
                <Copy size={16} />
              </button>
            </div>

            <div className="flex items-start gap-3 p-3.5">
              <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                <Upload size={16} className="text-[#1B2A4A] dark:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#8A8275] dark:text-gray-300 mb-1.5">
                  {language === 'ru' ? '📸 Подтвердите оплату скриншотом' : "📸 To'lovni screenshot bilan tasdiqlang"}
                </p>
                {!screenshotUploaded ? (
                  <label className={`flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                    uploadingScreenshot
                      ? 'border-[#1B2A4A] dark:border-gold bg-[#F5F1E8] dark:bg-dark-accent'
                      : 'border-[#E8E2D5] dark:border-dark-border hover:border-[#1B2A4A] dark:hover:border-gold bg-[#F5F1E8]/50 dark:bg-dark-accent/40'
                  }`}>
                    <div className="flex flex-col items-center justify-center">
                      {uploadingScreenshot ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1B2A4A] dark:border-gold mb-1"></div>
                      ) : (
                        <Upload className="w-5 h-5 mb-1 text-[#8A8275] dark:text-gray-300" />
                      )}
                      <p className="text-xs text-[#8A8275] dark:text-gray-300">
                        {uploadingScreenshot
                          ? (language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...')
                          : (language === 'ru' ? 'Нажмите для загрузки' : 'Yuklash uchun bosing')
                        }
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadScreenshot}
                      className="hidden"
                      disabled={uploadingScreenshot}
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl p-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-base">✅</span>
                    </div>
                    <p className="flex-1 text-sm font-medium text-green-800 dark:text-green-300">
                      {language === 'ru' ? 'Скриншот загружен' : 'Screenshot yuklandi'}
                    </p>
                    {screenshotUrl && (
                      <button
                        onClick={() => setShowScreenshotModal(true)}
                        className="w-9 h-9 rounded-lg bg-white dark:bg-dark-accent border border-green-200 dark:border-green-500/30 flex items-center justify-center text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-dark-border transition-colors flex-shrink-0"
                        title={language === 'ru' ? 'Посмотреть скриншот' : 'Screenshotni ko\'rish'}
                      >
                        <Eye size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ✅ Инфо-примечание */}
          <div className="flex items-center gap-3 p-4 bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border rounded-2xl">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <span className="text-base">⏳</span>
            </div>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 leading-relaxed">
              {language === 'ru'
                ? 'Заказ будет обработан после подтверждения оплаты менеджером'
                : 'Buyurtma menejer to\'lovni tasdiqlagandan so\'ng ko\'rib chiqiladi'}
            </p>
          </div>
        </div>

        {/* ✅ Кнопки действий — ПОДНЯТЫ над BottomNavbar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-4 pb-24 pt-2">
          <div className="pointer-events-auto bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border shadow-lg p-3 space-y-2.5">
            {screenshotUploaded && (
              <button
                onClick={() => {
                  setShowPaymentInfo(false)
                  setOrderSuccess(true)
                  clearCart()
                }}
                className="w-full py-3 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] font-bold flex items-center justify-center gap-2 hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors"
              >
                <Check size={18} />
                {language === 'ru' ? 'Готово' : 'Tayyor'}
              </button>
            )}
            <a
              href={MANAGER_TELEGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border text-[#1B2A4A] dark:text-white font-bold flex items-center justify-center gap-2 transition-colors hover:bg-[#E8E2D5] dark:hover:bg-dark-border"
            >
              <MessageCircle size={18} />
              {language === 'ru' ? 'Написать менеджеру' : 'Menejerga yozish'}
            </a>
          </div>
        </div>

        {showScreenshotModal && screenshotUrl && (
          <ScreenshotViewer
            url={screenshotUrl}
            language={language}
            onClose={() => setShowScreenshotModal(false)}
          />
        )}
      </div>
    )
  }

  // ✅ ЭКРАН УСПЕХА
  if (orderSuccess) {
    return (
      <div className="fixed inset-0 bg-[#F5F1E8] dark:bg-dark-bg z-50 flex flex-col items-center justify-center p-6">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-8 border border-[#E8E2D5] dark:border-dark-border shadow-sm max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? 'Заказ оформлен!' : 'Buyurtma tasdiqlandi!'}
          </h2>
          <p className="text-[#8A8275] dark:text-gray-300 mb-4">
            {language === 'ru' ? `Номер вашего заказа: ` : `Sizning buyurtma raqamingiz: `}
            <span className="font-bold text-[#1B2A4A] dark:text-white">№{orderId}</span>
          </p>
          {isSpecialOrder && (
            <span className="inline-block mb-2 px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 text-sm rounded-full">
              🌍 {language === 'ru' ? 'Заказ из спецзаказа' : 'Maxsus buyurtmadan'}
            </span>
          )}
          <p className="text-sm text-[#8A8275] dark:text-gray-300 mb-6">
            {language === 'ru'
              ? 'Спасибо за ваш заказ!'
              : 'Buyurtmangiz uchun rahmat!'}
          </p>
          <button
            onClick={onClose}
            className="w-full bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] py-3 rounded-2xl font-bold hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors shadow-md"
          >
            {language === 'ru' ? 'Отлично' : 'Ajoyib'}
          </button>
        </div>
      </div>
    )
  }

  // ✅ ФОРМА ОФОРМЛЕНИЯ
  return (
    <div className="fixed inset-0 bg-[#F5F1E8] dark:bg-dark-bg z-50 flex flex-col">
      <IslandHeader
        needsBack={true}
        onBack={onClose}
      />

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {/* ✅ Шапка-карточка формы (стиль страницы заказа) */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
              {language === 'ru' ? 'Оформление заказа' : 'Buyurtmani rasmiylashtirish'}
            </h2>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
              {totalQty} {getItemsLabel(totalQty, language)} · {formatPrice(finalUsd)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            <CreditCard size={18} className="text-[#1B2A4A] dark:text-white" />
          </div>
        </div>

        {isSpecialOrder && (
          <div className="mb-3 p-4 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-2xl">
            <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">
              🌍 {language === 'ru' ? 'Оформление спецзаказа' : 'Maxsus buyurtmani rasmiylashtirish'}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {language === 'ru'
                ? 'После оплаты менеджер приступит к заказу товара'
                : 'To\'lovdan so\'ng menejer mahsulot buyurtma qiladi'}
            </p>
          </div>
        )}

        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 divide-y divide-[#E8E2D5] dark:divide-dark-border shadow-sm">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <UserIcon size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[#8A8275] dark:text-gray-300 block mb-0.5">
                {language === 'ru' ? 'Имя' : 'Ism'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === 'ru' ? 'Ваше имя' : 'Sizning ismingiz'}
                className="w-full bg-transparent text-sm font-medium text-[#1B2A4A] dark:text-white focus:outline-none placeholder:text-[#8A8275] dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Phone size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[#8A8275] dark:text-gray-300 block mb-0.5">
                {language === 'ru' ? 'Телефон' : 'Telefon'}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+998 XX XXX XX XX"
                className="w-full bg-transparent text-sm font-medium text-[#1B2A4A] dark:text-white focus:outline-none placeholder:text-[#8A8275] dark:placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 divide-y divide-[#E8E2D5] dark:divide-dark-border shadow-sm">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              {deliveryMethod === 'pickup'
                ? <Store size={16} className="text-[#1B2A4A] dark:text-white" />
                : <Truck size={16} className="text-[#1B2A4A] dark:text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Получение' : 'Olish'}
              </p>
              <p className="text-sm font-medium text-[#1B2A4A] dark:text-white">
                {deliveryMethod === 'pickup'
                  ? (language === 'ru' ? 'Самовывоз' : "O'z-o'zini olish")
                  : (language === 'ru' ? 'Доставка' : 'Yetkazib berish')}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    deliveryMethod === 'pickup'
                      ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300'
                  }`}
                  onClick={() => handleDeliveryChange('pickup')}
                >
                  {language === 'ru' ? 'Самовывоз' : "O'z-o'zini olish"}
                </button>
                <button
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    deliveryMethod === 'delivery'
                      ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300'
                  }`}
                  onClick={() => handleDeliveryChange('delivery')}
                >
                  {language === 'ru' ? 'Доставка' : 'Yetkazib berish'}
                </button>
              </div>
            </div>
          </div>

          {deliveryMethod === 'pickup' && (
            <div className="flex items-center gap-3 p-3.5">
              <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-[#1B2A4A] dark:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Адрес магазина' : "Do'kon manzili"}</p>
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-white">
                  {language === 'ru'
                    ? 'ТЦ Mercato, 2 этаж, магазин 34'
                    : 'Mercato savdo markazi, 2-qavat, 34-do\'kon'}
                </p>
              </div>
            </div>
          )}

          {deliveryMethod === 'delivery' && (
            <div className="flex items-center gap-3 p-3.5">
              <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-[#1B2A4A] dark:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-xs text-[#8A8275] dark:text-gray-300 block mb-1">
                  {language === 'ru' ? 'Адрес доставки' : 'Yetkazib berish manzili'}
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={language === 'ru' ? 'Улица, дом, квартира' : 'Ko\'cha, uy, kvartira'}
                  rows={2}
                  className="w-full p-2 border border-[#E8E2D5] dark:border-dark-border rounded-xl focus:outline-none focus:border-[#1B2A4A] dark:focus:border-gold bg-[#F5F1E8] dark:bg-dark-accent text-sm text-[#1B2A4A] dark:text-white placeholder:text-[#8A8275] dark:placeholder:text-gray-500"
                />
                <p className="text-xs text-[#8A8275] dark:text-gray-400 mt-1">
                  {language === 'ru'
                    ? 'Пример: ул. Навои, дом 15, квартира 23'
                    : 'Misol: Navoiy ko\'chasi, 15-uy, 23-kvartira'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ✅ Оплата + разбивка цен с border-t (как на странице заказа) */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <CreditCard size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mb-2">
                {language === 'ru' ? 'Способ оплаты' : 'To\'lov usuli'}
              </p>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'online_card'}
                  onChange={() => setPaymentMethod('online_card')}
                  className="w-4 h-4 accent-[#1B2A4A] dark:accent-[#C9A961]"
                />
                <span className="text-sm font-medium text-[#1B2A4A] dark:text-white">
                  {language === 'ru' ? 'Оплата переводом' : 'Pul o\'tkazish orqali to\'lash'}
                </span>
              </label>
              {deliveryMethod === 'pickup' && !isSpecialOrder && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'upon_receipt'}
                    onChange={() => setPaymentMethod('upon_receipt')}
                    className="w-4 h-4 accent-[#1B2A4A] dark:accent-[#C9A961]"
                  />
                  <span className="text-sm font-medium text-[#1B2A4A] dark:text-white">
                    {language === 'ru' ? 'Оплата при получении' : 'Olganda to\'lash'}
                  </span>
                </label>
              )}
              {deliveryMethod === 'delivery' && (
                <div className="flex items-start gap-1.5 mt-2 p-2 bg-[#F5F1E8] dark:bg-dark-accent rounded-lg">
                  <Info size={14} className="text-[#8A8275] dark:text-gray-300 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 leading-relaxed">
                    {language === 'ru'
                      ? 'Доставка — по предоплате переводом на карту'
                      : "Yetkazib berish — kartaga oldindan to'lov bilan"}
                  </p>
                </div>
              )}
              {isSpecialOrder && (
                <div className="flex items-start gap-1.5 mt-2 p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
                  <Info size={14} className="text-purple-600 dark:text-purple-300 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
                    {language === 'ru'
                      ? 'Спецзаказ — только полная предоплата переводом'
                      : "Maxsus buyurtma — faqat to'liq oldindan to'lov"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Разбивка: Товары → Доставка → Итого */}
          <div className="px-4 py-3 border-t border-[#E8E2D5] dark:border-dark-border bg-[#F5F1E8]/60 dark:bg-dark-accent/40 space-y-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Товары' : 'Mahsulotlar'}
              </span>
              <span className="text-sm font-medium text-[#1B2A4A] dark:text-white">
                {formatPrice(getTotalPrice())}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Доставка' : 'Yetkazib berish'}
              </span>
              {deliveryCostUsd > 0 ? (
                <span className="text-sm font-medium text-[#1B2A4A] dark:text-white">
                  {formatPrice(deliveryCostUsd)}
                </span>
              ) : (
                <span className="text-sm font-bold text-green-700 dark:text-green-400">
                  {language === 'ru' ? 'Бесплатно' : 'Bepul'}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-[#E8E2D5] dark:border-dark-border">
              <span className="font-bold text-[#1B2A4A] dark:text-white">
                {language === 'ru' ? 'Итого:' : 'Jami:'}
              </span>
              <span className="text-xl font-bold text-[#1B2A4A] dark:text-white">
                {formatPrice(finalUsd)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
            submitting
              ? 'bg-[#E8E2D5] dark:bg-dark-accent text-[#8A8275] dark:text-gray-500 cursor-not-allowed'
              : 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] hover:bg-[#142038] dark:hover:bg-[#d6b57e]'
          }`}
        >
          {submitting
            ? (language === 'ru' ? 'Отправка...' : 'Yuborilmoqda...')
            : paymentMethod === 'online_card'
              ? (language === 'ru' ? 'Перейти к оплате 💳' : 'To\'lovga o\'tish 💳')
              : (language === 'ru' ? 'Подтвердить заказ' : 'Buyurtmani tasdiqlash')
          }
        </button>
      </div>
    </div>
  )
}