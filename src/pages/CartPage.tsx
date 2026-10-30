import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, isProductOnSale } from '../store/useStore'
import { Minus, Plus, Trash2, ShoppingBag, CreditCard, Upload, Store, Truck, Phone, User as UserIcon, MapPin, Info, X, Copy, Check, CheckCircle, MessageCircle, Clock, Package, ChevronRight } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { createOrder, createOrderFromSpecial, deleteUnpaidOrder } from '../lib/supabase'
import { MANAGER_TELEGRAM_LINK, PAYMENT_CARDS, uploadPaymentScreenshot } from '../lib/payments'
import IslandHeader from '../components/IslandHeader'

const useBodyScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [active])
}

function ScreenshotViewer({ url, language, onClose }: { url: string; language: string; onClose: () => void }) {
  useBodyScrollLock(true)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4" onClick={onClose}>
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

// ✅ Круглая кнопка «i» — как InfoToggle в админке
function InfoToggle({ open, onClick, title }: { open: boolean; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
        open
          ? 'bg-[#1B2A4A] dark:bg-gold border-[#1B2A4A] dark:border-gold text-white dark:text-[#1B2A4A]'
          : 'bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border text-[#8A8275] dark:text-gray-300 hover:text-[#1B2A4A] dark:hover:text-gold'
      }`}
    >
      <Info size={13} />
    </button>
  )
}

const getItemsLabel = (count: number, lang: string): string => {
  if (lang === 'uz') return 'ta mahsulot'
  const lastTwo = count % 100
  const lastOne = count % 10
  if (lastTwo >= 11 && lastTwo <= 19) return 'товаров'
  if (lastOne === 1) return 'товар'
  if (lastOne >= 2 && lastOne <= 4) return 'товара'
  return 'товаров'
}

export default function CartPage() {
  const navigate = useNavigate()
  // ✅ theme нужен, чтобы тосты подстраивались под тёмную тему
  const { cart, removeFromCart, addToCart, getTotalPrice, currency, exchangeRate, language, saleModeEnabled, ensureProducts, theme } = useStore()
  const [showCheckout, setShowCheckout] = useState(false)
  const [preparingCheckout, setPreparingCheckout] = useState(false)

  // ✅ Состояния для настроек доставки
  const [deliveryPriceUzs, setDeliveryPriceUzs] = useState<number>(0)
  const [freeDeliveryThresholdUzs, setFreeDeliveryThresholdUzs] = useState<number>(0)

  const openCheckout = async () => {
    if (preparingCheckout) return
    setPreparingCheckout(true)
    try {
      const settings = await useStore.getState().refreshCheckout()
      setDeliveryPriceUzs(settings.deliveryPriceUzs)
      setFreeDeliveryThresholdUzs(settings.freeDeliveryThresholdUzs)
      setShowCheckout(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить корзину')
    } finally { setPreparingCheckout(false) }
  }

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${Math.round(usd * exchangeRate).toLocaleString()} сум`
  }

  const productsUsd = getTotalPrice()

  // ✅ Экономия на скидках
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

  // ✅ FIX: пустое состояние НЕ показываем, пока открыта модалка оформления.
  // Иначе clearCart() после заказа размонтирует CheckoutModal вместе с экраном успеха.
  if (cart.length === 0 && !showCheckout) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
        <div className="p-4">
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">{language === 'ru' ? 'Корзина' : 'Savat'}</h1>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">{language === 'ru' ? 'Пока пусто' : 'Hali bo\'sh'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <ShoppingBag size={18} className="text-[#1B2A4A] dark:text-white" />
            </div>
          </div>
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border mx-auto mb-3 flex items-center justify-center">
              <ShoppingBag size={24} className="text-[#8A8275] dark:text-gray-300" />
            </div>
            <p className="text-sm font-medium text-[#1B2A4A] dark:text-white mb-1">{language === 'ru' ? 'Корзина пуста' : 'Savat bo\'sh'}</p>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mb-4 px-2">{language === 'ru' ? 'Добавьте товары из каталога, чтобы оформить заказ' : 'Buyurtma rasmiylashtirish uchun katalogdan mahsulotlar qo\'shing'}</p>
            <button onClick={() => navigate('/')} className="px-6 py-3 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] font-bold text-sm hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors">
              {language === 'ru' ? 'В каталог' : 'Katalogga'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-56">
      {/* ✅ Тосты в текущей теме */}
      <Toaster position="top-center" richColors theme={theme} />
      <div className="p-4">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">{language === 'ru' ? 'Корзина' : 'Savat'}</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={18} className="text-[#1B2A4A] dark:text-white" />
          </div>
        </div>

        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 overflow-hidden">
          <div className="divide-y divide-[#E8E2D5] dark:divide-dark-border">
            {/* ✅ key учитывает цвет: один товар разных цветов = разные строки */}
            {cart.map((item) => (
              <div key={`${item.productId}-${item.size}-${item.colorId || 'no-color'}`} className="p-3.5 flex gap-3">
                <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl border border-[#E8E2D5] dark:border-dark-border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" onClick={() => navigate(`/product/${item.productId}`, { state: { fromCart: true } })} />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/product/${item.productId}`, { state: { fromCart: true } })}>
                  <p className="font-medium text-sm text-[#1B2A4A] dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                    {language === 'ru' ? 'Размер:' : 'O\'lcham:'} {item.size}
                    {/* ✅ Цвет товара (если выбран) */}
                    {item.colorName && (
                      <>
                        <span className="mx-1">·</span>
                        <span className="text-[#C9A961] dark:text-gold font-medium">{item.colorName}</span>
                      </>
                    )}
                  </p>
                  <p className="font-bold text-sm text-[#1B2A4A] dark:text-white mt-1">{formatPrice(item.priceUsd)}</p>
                  {item.isSpecialOrder && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 text-xs rounded-full">
                      {language === 'ru' ? 'Спецзаказ' : 'Maxsus buyurtma'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end justify-between flex-shrink-0">
                  {/* ✅ Удаление с учётом цвета */}
                  <button onClick={() => removeFromCart(item.productId, item.size, item.colorId || null)} title={language === 'ru' ? 'Удалить из корзины' : 'Savatdan o\'chirish'} className="p-1.5 rounded-lg text-[#9B3B3B] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <Trash2 size={16} />
                  </button>
                  {!item.isSpecialOrder ? (
                    <div className="flex items-center gap-1 bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border rounded-lg px-1.5 py-1">
                      <button onClick={() => item.quantity > 1 && addToCart({ ...item, quantity: -1 })} className="p-0.5 text-[#8A8275] dark:text-gray-300"><Minus size={14} /></button>
                      <span className="font-bold text-sm text-[#1B2A4A] dark:text-white w-5 text-center">{item.quantity}</span>
                      <button onClick={() => addToCart({ ...item, quantity: 1 })} className="p-0.5 text-[#8A8275] dark:text-gray-300"><Plus size={14} /></button>
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

      {/* ✅ Плавающая карточка: БЕЗ строки «Доставка» — только товары и итого */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-4 pb-24 pt-2">
        <div className="pointer-events-auto bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border shadow-lg p-3 space-y-2.5">
          <div className="px-1 space-y-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Товары' : 'Mahsulotlar'}</span>
              <span className="text-sm font-medium text-[#1B2A4A] dark:text-white whitespace-nowrap">{formatPrice(productsUsd)}</span>
            </div>
            {savingsUsd > 0 && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Скидка' : 'Chegirma'}</span>
                <span className="text-sm font-bold text-[#9B3B3B] dark:text-red-400 whitespace-nowrap">−{formatPrice(savingsUsd)}</span>
              </div>
            )}
            <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-[#E8E2D5] dark:border-dark-border">
              <span className="text-sm font-bold text-[#1B2A4A] dark:text-white">{language === 'ru' ? 'Итого' : 'Jami'}</span>
              <span className="text-base font-bold text-[#1B2A4A] dark:text-white whitespace-nowrap">{formatPrice(productsUsd)}</span>
            </div>
          </div>

          <button
            onClick={openCheckout}
            disabled={preparingCheckout}
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
          freeDeliveryThresholdUzs={freeDeliveryThresholdUzs}
        />
      )}
    </div>
  )
}

function CheckoutModal({ onClose, formatPrice, getTotalPrice, language, deliveryPriceUzs, freeDeliveryThresholdUzs }: any) {
  useBodyScrollLock(true)
  const navigate = useNavigate()
  const { cart, clearCart, currency, exchangeRate } = useStore()
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup')
  const [paymentMethod, setPaymentMethod] = useState<'online_card' | 'upon_receipt'>('online_card')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+998')
  const [address, setAddress] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const requestKey = useRef(crypto.randomUUID())
  const [serverTotalUsd, setServerTotalUsd] = useState<number | null>(null)
  const [serverTotalUzs, setServerTotalUzs] = useState<number | null>(null)
  const [showPaymentInfo, setShowPaymentInfo] = useState(false)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const [screenshotUploaded, setScreenshotUploaded] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [showScreenshotModal, setShowScreenshotModal] = useState(false)
  // ✅ Раскрываемая подсказка об оплате (как InfoToggle в админке)
  const [showPaymentNote, setShowPaymentNote] = useState(false)

  // ✅ FIX «висящий заказ»: refs дублируют состояние для cleanup-эффекта при размонтировании
  const showPaymentInfoRef = useRef(false)
  const screenshotUploadedRef = useRef(false)
  const currentOrderIdRef = useRef<string | null>(null)

  useEffect(() => {
    showPaymentInfoRef.current = showPaymentInfo
    screenshotUploadedRef.current = screenshotUploaded
    currentOrderIdRef.current = currentOrderId
  }, [showPaymentInfo, screenshotUploaded, currentOrderId])

  // ✅ FIX: если пользователь ушёл с экрана оплаты БЕЗ скриншота ЛЮБЫМ способом
  // (навбар, роутинг, закрытие вкладки) — неоплаченный заказ ПОЛНОСТЬЮ удаляется из БД,
  // остатки возвращаются. Со скриншотом — заказ остаётся для подтверждения менеджером.
  useEffect(() => {
    return () => {
      if (
        showPaymentInfoRef.current &&
        !screenshotUploadedRef.current &&
        currentOrderIdRef.current
      ) {
        deleteUnpaidOrder(currentOrderIdRef.current).catch((err) =>
          console.error('Ошибка авто-удаления неоплаченного заказа:', err)
        )
      }
    }
  }, [])

  const specialItem = cart.find((i: any) => i.isSpecialOrder)
  const isSpecialOrder = !!specialItem
  const totalQty = cart.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)

  const productsUsd = getTotalPrice()
  const productsTotalUzs = Math.round(productsUsd * exchangeRate)

  // ✅ Доставка считается ТОЛЬКО при методе «Доставка» (при самовывозе всегда 0).
  // ✅ Бесплатно, если сумма заказа достигла порога из настроек админки.
  const isFreeDelivery = deliveryMethod === 'delivery' && freeDeliveryThresholdUzs > 0 && productsTotalUzs >= freeDeliveryThresholdUzs
  const deliveryCostUsd = deliveryMethod === 'delivery' && !isFreeDelivery ? deliveryPriceUzs / exchangeRate : 0
  const finalUsd = serverTotalUsd ?? productsUsd + deliveryCostUsd
  const formattedTotal = serverTotalUzs !== null && currency === 'UZS' ? `${serverTotalUzs.toLocaleString()} сум` : formatPrice(finalUsd)

  const orderCurrency: 'UZS' | 'USD' = currency === 'USD' ? 'USD' : 'UZS'
  const payCard = PAYMENT_CARDS[orderCurrency]

  useEffect(() => {
    if (isSpecialOrder) setPaymentMethod('online_card')
  }, [isSpecialOrder])

  const handleDeliveryChange = (method: 'pickup' | 'delivery') => {
    setDeliveryMethod(method)
    if (method === 'delivery') setPaymentMethod('online_card')
    setShowPaymentNote(false)
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
    if (!addr.trim()) return language === 'ru' ? 'Введите адрес доставки' : 'Yetkazib berish manzilini kiriting'
    if (addr.trim().length < 5) return language === 'ru' ? 'Адрес слишком короткий (минимум 5 символов)' : 'Manzil juda qisqa (kamida 5 ta belgi)'
    if (!/[a-zA-Zа-яА-Я]/.test(addr)) return language === 'ru' ? 'Адрес должен содержать буквы (укажите улицу или ориентир)' : 'Manzilda harflar bo\'lishi kerak'
    return null
  }

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(payCard.number.replace(/\s/g, ''))
      toast.success(language === 'ru' ? 'Номер карты скопирован!' : 'Karta raqami nusxalandi!')
    } catch (error) {
      toast.error(language === 'ru' ? 'Не удалось скопировать' : 'Nusxalab bo\'lmadi')
    }
  }

  // The backend determines ownership, prices, payment state and inventory.
  const createOrderInDb = async (): Promise<any> => {
    const totalInSums = Math.round(finalUsd * exchangeRate)
    const itemsWithPrices = cart.map(item => ({ ...item, priceUzs: Math.round(item.priceUsd * exchangeRate) }))
    const orderData = {
      client_name: name.trim(), client_phone: phone,
      delivery_method: deliveryMethod, delivery_address: deliveryMethod === 'delivery' ? address.trim() : null,
      payment_method: paymentMethod, total_price_usd: finalUsd, total_price_uzs: totalInSums,
      exchange_rate_at_order: exchangeRate, order_currency: orderCurrency, items: itemsWithPrices,
      status: paymentMethod === 'online_card' ? 'Ожидает оплаты' : 'Активный',
      payment_status: 'pending',
    }
    const result: any = isSpecialOrder && specialItem.specialRequestId
      ? await createOrderFromSpecial(specialItem.specialRequestId, orderData, requestKey.current)
      : await createOrder(orderData, requestKey.current)

    const data = Array.isArray(result.data) ? result.data[0] : result.data
    if (result.error || !data) throw new Error(result.error?.message || 'Ошибка создания заказа')
    return data
  }

  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentOrderId) return
    setUploadingScreenshot(true)
    try {
      const screenshotUrlResult = await uploadPaymentScreenshot(currentOrderId, file)
      setScreenshotUploaded(true)
      setScreenshotUrl(screenshotUrlResult)
      toast.success(language === 'ru' ? 'Скриншот загружен! Ожидайте подтверждения.' : 'Screenshot yuklandi! Tasdiqlashni kuting.')
    } catch (error) {
      toast.error(language === 'ru' ? 'Ошибка загрузки скриншота' : 'Screenshot yuklashda xatolik')
    } finally {
      setUploadingScreenshot(false)
    }
  }

  const cancelUnpaidOrder = async () => {
    if (!currentOrderId) return true
    const success = await deleteUnpaidOrder(currentOrderId)
    if (!success) { toast.error(language === 'ru' ? 'Не удалось отменить заказ. Обновите страницу.' : 'Buyurtmani bekor qilib bo‘lmadi.'); return false }
    requestKey.current = crypto.randomUUID()
    setServerTotalUsd(null)
    setServerTotalUzs(null)
    currentOrderIdRef.current = null
    setCurrentOrderId(null)
    return true
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!name || name.trim().length < 3) {
      toast.error(language === 'ru' ? 'Имя должно содержать минимум 3 символа' : 'Ism kamida 3 ta belgidan iborat bo\'lishi kerak')
      return
    }
    if (!/^\+998\d{9}$/.test(phone)) {
      toast.error(language === 'ru' ? 'Телефон должен быть в формате +998XXXXXXXX' : 'Telefon +998XXXXXXXX formatida bo\'lishi kerak')
      return
    }
    if (deliveryMethod === 'delivery') {
      const addressError = validateAddress(address)
      if (addressError) { toast.error(addressError); return }
    }
    setSubmitting(true)
    try {
      const orderData = await createOrderInDb()
      setServerTotalUsd(Number(orderData.total_price_usd))
      setServerTotalUzs(Number(orderData.total_price_uzs))
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
      toast.error(language === 'ru' ? 'Ошибка: ' + error.message : 'Xatolik: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ✅ ЭКРАН ОПЛАТЫ — банковская карта + карточка подтверждения
  if (showPaymentInfo) {
    return (
      <div className="fixed inset-0 bg-[#F5F1E8] dark:bg-dark-bg z-50 flex flex-col">
        <IslandHeader needsBack={true} onBack={async () => {
          if (screenshotUploaded) { setShowPaymentInfo(false); setOrderSuccess(true); clearCart() }
          else { if (await cancelUnpaidOrder()) setShowPaymentInfo(false) }
        }} />
        {/* ✅ key: принудительный remount скролл-контейнера → экран открывается сверху */}
        <div key="payment-scroll" className="flex-1 overflow-y-auto px-4 pb-44">
          {/* ✅ Шапка-карточка: номер заказа + статус + итого */}
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">{language === 'ru' ? `Заказ №${currentOrderId}` : `Buyurtma №${currentOrderId}`}</h2>
                <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-1">{language === 'ru' ? 'Сумма к оплате' : "To'lov summasi"}</p>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 flex items-center gap-1.5">
                <Clock size={12} />
                {language === 'ru' ? 'Ожидает оплаты' : "To'lovni kutmoqda"}
              </span>
            </div>
            <div className="border-t border-[#E8E2D5] dark:border-dark-border mt-3 pt-3 flex justify-between items-center">
              <span className="font-bold text-[#1B2A4A] dark:text-white">{language === 'ru' ? 'Итого:' : 'Jami:'}</span>
              <span className="text-xl font-bold text-[#1B2A4A] dark:text-white">{formattedTotal}</span>
            </div>
          </div>

          {/* ✅ Товары заказа: строки с фото (стиль корзины) */}
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 overflow-hidden">
            <div className="divide-y divide-[#E8E2D5] dark:divide-dark-border">
              {cart.map((item: any) => (
                <div key={`${item.productId}-${item.size}-${item.colorId || 'no-color'}`} className="p-3.5 flex items-center gap-3">
                  <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-xl border border-[#E8E2D5] dark:border-dark-border flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#1B2A4A] dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                      {language === 'ru' ? 'Размер:' : 'O\'lcham:'} {item.size}
                      {item.colorName && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="text-[#C9A961] dark:text-gold font-medium">{item.colorName}</span>
                        </>
                      )}
                      <span className="mx-1">·</span>
                      {item.quantity} {language === 'ru' ? 'шт.' : 'donа'}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[#1B2A4A] dark:text-white whitespace-nowrap">{formatPrice(item.priceUsd * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ✅ ВИЗУАЛЬНАЯ БАНКОВСКАЯ КАРТА */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B2A4A] via-[#22345C] to-[#142038] border border-[#C9A961]/30 dark:border-gold/30 shadow-lg mb-3">
            <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#C9A961]/10 pointer-events-none" />
            <div className="absolute -bottom-20 -right-6 w-52 h-52 rounded-full bg-[#C9A961]/5 pointer-events-none" />
            <div className="relative p-4">
              <div className="flex items-center justify-between gap-2 mb-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  {language === 'ru' ? 'Карта для оплаты' : "To'lov kartasi"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A961] text-[#1B2A4A]">{orderCurrency}</span>
              </div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-7 rounded-md bg-gradient-to-br from-[#E8C88A] to-[#C9A961] flex items-center justify-center flex-shrink-0">
                  <div className="w-6 h-3.5 rounded-[3px] border border-[#1B2A4A]/25" />
                </div>
                <CreditCard size={16} className="text-white/40" />
              </div>
              <p className="text-lg font-bold tracking-[0.14em] text-white mb-4 break-all leading-relaxed">{payCard.number}</p>
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-widest text-white/50 mb-0.5">{language === 'ru' ? 'Получатель' : 'Qabul qiluvchi'}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#C9A961] truncate">{payCard.holder}</p>
                </div>
                <button
                  onClick={handleCopyCard}
                  title={language === 'ru' ? 'Скопировать номер карты' : 'Karta raqamini nusxalash'}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C9A961] text-[#1B2A4A] text-xs font-bold hover:bg-[#b8954f] transition-colors flex-shrink-0"
                >
                  <Copy size={14} />
                  {language === 'ru' ? 'Скопировать' : 'Nusxalash'}
                </button>
              </div>
            </div>
          </div>

          {/* ✅ Карточка подтверждения оплаты */}
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 overflow-hidden">
            <div className="flex items-center justify-between gap-2 p-3.5 border-b border-[#E8E2D5] dark:border-dark-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                  <Upload size={16} className="text-[#1B2A4A] dark:text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1B2A4A] dark:text-white truncate">
                    {language === 'ru' ? 'Подтверждение оплаты' : "To'lovni tasdiqlash"}
                  </p>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5 truncate">
                    {screenshotUploaded
                      ? (language === 'ru' ? 'Скриншот получен' : 'Screenshot qabul qilindi')
                      : (language === 'ru' ? 'Загрузите чек перевода' : 'O\'tkazma chekini yuklang')}
                  </p>
                </div>
              </div>
              {/* ✅ Миниатюра скриншота вместо кнопки-глаза */}
              {screenshotUploaded && screenshotUrl && (
                <button
                  onClick={() => setShowScreenshotModal(true)}
                  title={language === 'ru' ? 'Посмотреть скриншот' : 'Screenshotni ko\'rish'}
                  className="w-10 h-10 rounded-xl overflow-hidden border border-[#E8E2D5] dark:border-dark-border flex-shrink-0 hover:opacity-80 transition-opacity"
                >
                  <img src={screenshotUrl} alt="screenshot" className="w-full h-full object-cover" />
                </button>
              )}
            </div>
            <div className="p-3.5">
              {!screenshotUploaded ? (
                <label className={`flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${uploadingScreenshot ? 'border-[#1B2A4A] dark:border-gold bg-[#F5F1E8] dark:bg-dark-accent' : 'border-[#E8E2D5] dark:border-dark-border hover:border-[#C9A961] dark:hover:border-gold bg-[#F5F1E8]/50 dark:bg-dark-accent/40'}`}>
                  <div className="w-11 h-11 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center mb-2">
                    {uploadingScreenshot ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1B2A4A] dark:border-gold"></div>
                    ) : (
                      <Upload size={18} className="text-[#C9A961]" />
                    )}
                  </div>
                  <p className="text-sm font-bold text-[#1B2A4A] dark:text-white">
                    {uploadingScreenshot ? (language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...') : (language === 'ru' ? 'Нажмите для загрузки' : 'Yuklash uchun bosing')}
                  </p>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">PNG/JPG · {language === 'ru' ? 'чек перевода' : 'o\'tkazma cheki'}</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUploadScreenshot} className="hidden" disabled={uploadingScreenshot} />
                </label>
              ) : (
                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl p-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 flex items-center justify-center flex-shrink-0">
                    <Check size={16} className="text-green-700 dark:text-green-300" />
                  </div>
                  <p className="flex-1 text-sm font-medium text-green-800 dark:text-green-300">{language === 'ru' ? 'Скриншот загружен' : 'Screenshot yuklandi'}</p>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Подсказка-примечание */}
          <div className="flex items-center gap-3 p-4 bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border rounded-2xl">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Clock size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 leading-relaxed">{language === 'ru' ? 'Заказ будет обработан после подтверждения оплаты менеджером' : 'Buyurtma menejer to\'lovni tasdiqlagandan so\'ng ko\'rib chiqiladi'}</p>
          </div>
        </div>

        {/* ✅ Плавающая панель: ОДНА строка из двух кнопок — ничего не перекрывает */}
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-4 pb-24 pt-2">
          <div className="pointer-events-auto bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border shadow-lg p-3">
            <div className="grid grid-cols-2 gap-2">
              <a href={MANAGER_TELEGRAM_LINK} target="_blank" rel="noopener noreferrer" className="py-3 rounded-xl bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border text-[#1B2A4A] dark:text-white font-bold flex items-center justify-center gap-2 transition-colors hover:bg-[#E8E2D5] dark:hover:bg-dark-border">
                <MessageCircle size={16} /> {language === 'ru' ? 'Менеджеру' : 'Menejerga'}
              </a>
              {screenshotUploaded ? (
                <button onClick={() => { setShowPaymentInfo(false); setOrderSuccess(true); clearCart() }} className="py-3 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] font-bold flex items-center justify-center gap-2 hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors">
                  <Check size={16} /> {language === 'ru' ? 'Готово' : 'Tayyor'}
                </button>
              ) : (
                <button onClick={async () => { if (await cancelUnpaidOrder()) setShowPaymentInfo(false) }} className="py-3 rounded-xl bg-[#9B3B3B] dark:bg-red-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-red-700 dark:hover:bg-red-800 transition-colors">
                  <X size={16} /> {language === 'ru' ? 'Отменить' : 'Bekor qilish'}
                </button>
              )}
            </div>
          </div>
        </div>
        {showScreenshotModal && screenshotUrl && <ScreenshotViewer url={screenshotUrl} language={language} onClose={() => setShowScreenshotModal(false)} />}
      </div>
    )
  }

  // ✅ ЭКРАН УСПЕХА — в карточном стиле, как успех спецзаказа
  if (orderSuccess) {
    return (
      <div className="fixed inset-0 bg-[#F5F1E8] dark:bg-dark-bg z-50 flex flex-col">
        <IslandHeader needsBack={true} onBack={onClose} />
        {/* ✅ key: remount → скролл сверху */}
        <div key="success-scroll" className="flex-1 overflow-y-auto p-4 pb-32">
          {/* ✅ Шапка-карточка успеха */}
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-6 border border-[#E8E2D5] dark:border-dark-border mb-3 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-[#1B2A4A] dark:text-white mb-1">
              {language === 'ru' ? 'Заказ оформлен!' : 'Buyurtma tasdiqlandi!'}
            </h2>
            <p className="text-xs text-[#8A8275] dark:text-gray-300">
              {language === 'ru' ? 'Спасибо за ваш заказ!' : 'Buyurtmangiz uchun rahmat!'}
            </p>
          </div>

          {/* ✅ Инфо-карточка: номер заказа + где отслеживать */}
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 divide-y divide-[#E8E2D5] dark:divide-dark-border overflow-hidden">
            <div className="flex items-center gap-3 p-3.5">
              <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                <Package size={16} className="text-[#1B2A4A] dark:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Номер заказа' : 'Buyurtma raqami'}</p>
                <p className="text-sm font-bold text-[#1B2A4A] dark:text-white">№{orderId}</p>
              </div>
              {isSpecialOrder && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 text-xs rounded-full whitespace-nowrap">
                  {language === 'ru' ? 'Спецзаказ' : 'Maxsus'}
                </span>
              )}
            </div>
            <button
              onClick={() => { onClose(); navigate('/profile?section=orders') }}
              className="flex items-center gap-3 p-3.5 w-full text-left hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-[#1B2A4A] dark:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Статус заказа' : 'Buyurtma holati'}</p>
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-white">{language === 'ru' ? 'Профиль → Мои заказы' : 'Profil → Buyurtmalarim'}</p>
              </div>
              <ChevronRight size={18} className="text-[#8A8275] dark:text-gray-300 flex-shrink-0" />
            </button>
          </div>

          {/* ✅ Кнопки действий */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onClose}
              className="py-3 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] font-bold flex items-center justify-center gap-2 hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors"
            >
              <Check size={16} />
              {language === 'ru' ? 'Отлично' : 'Ajoyib'}
            </button>
            <button
              onClick={() => { onClose(); navigate('/profile?section=orders') }}
              className="py-3 rounded-xl bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border text-[#1B2A4A] dark:text-white font-bold flex items-center justify-center gap-2 transition-colors hover:bg-[#E8E2D5] dark:hover:bg-dark-border"
            >
              <Package size={16} />
              {language === 'ru' ? 'Мои заказы' : 'Buyurtmalarim'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#F5F1E8] dark:bg-dark-bg z-50 flex flex-col">
      <IslandHeader needsBack={true} onBack={onClose} />
      {/* ✅ key: remount → скролл сверху */}
      <div key="form-scroll" className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">{language === 'ru' ? 'Оформление заказа' : 'Buyurtmani rasmiylashtirish'}</h2>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
              {totalQty} {getItemsLabel(totalQty, language)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            <CreditCard size={18} className="text-[#1B2A4A] dark:text-white" />
          </div>
        </div>

        {isSpecialOrder && (
          <div className="mb-3 p-4 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-2xl">
            <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">{language === 'ru' ? 'Оформление спецзаказа' : 'Maxsus buyurtmani rasmiylashtirish'}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">{language === 'ru' ? 'После оплаты менеджер приступит к заказу товара' : 'To\'lovdan so\'ng menejer mahsulot buyurtma qiladi'}</p>
          </div>
        )}

        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 divide-y divide-[#E8E2D5] dark:divide-dark-border shadow-sm">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0"><UserIcon size={16} className="text-[#1B2A4A] dark:text-white" /></div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[#8A8275] dark:text-gray-300 block mb-0.5">{language === 'ru' ? 'Имя' : 'Ism'}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={language === 'ru' ? 'Ваше имя' : 'Sizning ismingiz'} className="w-full bg-transparent text-sm font-medium text-[#1B2A4A] dark:text-white focus:outline-none placeholder:text-[#8A8275] dark:placeholder:text-gray-500" />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0"><Phone size={16} className="text-[#1B2A4A] dark:text-white" /></div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[#8A8275] dark:text-gray-300 block mb-0.5">{language === 'ru' ? 'Телефон' : 'Telefon'}</label>
              <input type="tel" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="+998 XX XXX XX XX" className="w-full bg-transparent text-sm font-medium text-[#1B2A4A] dark:text-white focus:outline-none placeholder:text-[#8A8275] dark:placeholder:text-gray-500" />
            </div>
          </div>
        </div>

        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 divide-y divide-[#E8E2D5] dark:divide-dark-border shadow-sm">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              {deliveryMethod === 'pickup' ? <Store size={16} className="text-[#1B2A4A] dark:text-white" /> : <Truck size={16} className="text-[#1B2A4A] dark:text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Получение' : 'Olish'}</p>
              <p className="text-sm font-medium text-[#1B2A4A] dark:text-white">{deliveryMethod === 'pickup' ? (language === 'ru' ? 'Самовывоз' : "O'z-o'zini olish") : (language === 'ru' ? 'Доставка' : 'Yetkazib berish')}</p>
              <div className="flex gap-2 mt-2">
                <button className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${deliveryMethod === 'pickup' ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]' : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300'}`} onClick={() => handleDeliveryChange('pickup')}>{language === 'ru' ? 'Самовывоз' : "O'z-o'zini olish"}</button>
                <button className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${deliveryMethod === 'delivery' ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]' : 'bg-[#E8E2D5] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300'}`} onClick={() => handleDeliveryChange('delivery')}>{language === 'ru' ? 'Доставка' : 'Yetkazib berish'}</button>
              </div>
            </div>
          </div>
          {deliveryMethod === 'pickup' && (
            <div className="flex items-center gap-3 p-3.5">
              <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0"><MapPin size={16} className="text-[#1B2A4A] dark:text-white" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Адрес магазина' : "Do'kon manzili"}</p>
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-white">{language === 'ru' ? 'ТЦ Mercato, 2 этаж, магазин 34' : 'Mercato savdo markazi, 2-qavat, 34-do\'kon'}</p>
              </div>
            </div>
          )}
          {deliveryMethod === 'delivery' && (
            <div className="flex items-center gap-3 p-3.5">
              <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0"><MapPin size={16} className="text-[#1B2A4A] dark:text-white" /></div>
              <div className="flex-1 min-w-0">
                <label className="text-xs text-[#8A8275] dark:text-gray-300 block mb-1">{language === 'ru' ? 'Адрес доставки' : 'Yetkazib berish manzili'}</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder={language === 'ru' ? 'Улица, дом, квартира' : 'Ko\'cha, uy, kvartira'} rows={2} className="w-full p-2 border border-[#E8E2D5] dark:border-dark-border rounded-xl focus:outline-none focus:border-[#1B2A4A] dark:focus:border-gold bg-[#F5F1E8] dark:bg-dark-accent text-sm text-[#1B2A4A] dark:text-white placeholder:text-[#8A8275] dark:placeholder:text-gray-500" />
                <p className="text-xs text-[#8A8275] dark:text-gray-400 mt-1">{language === 'ru' ? 'Пример: ул. Навои, дом 15, квартира 23' : 'Misol: Navoiy ko\'chasi, 15-uy, 23-kvartira'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0"><CreditCard size={16} className="text-[#1B2A4A] dark:text-white" /></div>
            <div className="flex-1 min-w-0">
              {/* ✅ Заголовок «Способ оплаты» + круглая кнопка «i» (только если есть подсказка) */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Способ оплаты' : 'To\'lov usuli'}</p>
                {(deliveryMethod === 'delivery' || isSpecialOrder) && (
                  <InfoToggle
                    open={showPaymentNote}
                    onClick={() => setShowPaymentNote(v => !v)}
                    title={language === 'ru' ? 'Об условиях оплаты' : 'To\'lov shartlari haqida'}
                  />
                )}
              </div>

              {/* ✅ Раскрываемая подсказка (по нажатию на «i») */}
              {showPaymentNote && (deliveryMethod === 'delivery' || isSpecialOrder) && (
                <div className="mb-2 flex items-start gap-2.5 p-3 bg-[#1B2A4A]/5 dark:bg-gold/10 border border-[#1B2A4A]/10 dark:border-gold/20 rounded-xl">
                  <Info size={14} className="text-[#1B2A4A] dark:text-gold mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#1B2A4A] dark:text-white leading-relaxed">
                    {isSpecialOrder
                      ? (language === 'ru' ? 'Спецзаказ — только полная предоплата переводом' : 'Maxsus buyurtma — faqat to\'liq oldindan to\'lov')
                      : (language === 'ru' ? 'Доставка по адресу — только полная предоплата переводом на карту' : 'Manzilga yetkazib berish — faqat kartaga to\'liq oldindan to\'lov')}
                  </p>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="radio" name="payment" checked={paymentMethod === 'online_card'} onChange={() => setPaymentMethod('online_card')} className="w-4 h-4 accent-[#1B2A4A] dark:accent-[#C9A961]" />
                <span className="text-sm font-medium text-[#1B2A4A] dark:text-white">{language === 'ru' ? 'Оплата переводом' : 'Pul o\'tkazish orqali to\'lash'}</span>
              </label>
              {deliveryMethod === 'pickup' && !isSpecialOrder && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="payment" checked={paymentMethod === 'upon_receipt'} onChange={() => setPaymentMethod('upon_receipt')} className="w-4 h-4 accent-[#1B2A4A] dark:accent-[#C9A961]" />
                  <span className="text-sm font-medium text-[#1B2A4A] dark:text-white">{language === 'ru' ? 'Оплата при получении' : 'Olganda to\'lash'}</span>
                </label>
              )}
            </div>
          </div>

          {/* ✅ Разбивка цен: доставка только при методе «Доставка», без лишних уведомлений */}
          <div className="px-4 py-3 border-t border-[#E8E2D5] dark:border-dark-border bg-[#F5F1E8]/60 dark:bg-dark-accent/40 space-y-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Товары' : 'Mahsulotlar'}</span>
              <span className="text-sm font-medium text-[#1B2A4A] dark:text-white">{formatPrice(productsUsd)}</span>
            </div>

            {/* ✅ Строка «Доставка»: цена или «Бесплатно» (порог из настроек админки) */}
            {deliveryMethod === 'delivery' && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Доставка' : 'Yetkazib berish'}</span>
                {isFreeDelivery || deliveryPriceUzs === 0 ? (
                  <span className="text-sm font-bold text-green-700 dark:text-green-400">{language === 'ru' ? 'Бесплатно' : 'Bepul'}</span>
                ) : (
                  <span className="text-sm font-medium text-[#1B2A4A] dark:text-white">{formatPrice(deliveryCostUsd)}</span>
                )}
              </div>
            )}

            <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-[#E8E2D5] dark:border-dark-border">
              <span className="font-bold text-[#1B2A4A] dark:text-white">{language === 'ru' ? 'Итого:' : 'Jami:'}</span>
              <span className="text-xl font-bold text-[#1B2A4A] dark:text-white">{formattedTotal}</span>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={submitting} className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${submitting ? 'bg-[#E8E2D5] dark:bg-dark-accent text-[#8A8275] dark:text-gray-500 cursor-not-allowed' : 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] hover:bg-[#142038] dark:hover:bg-[#d6b57e]'}`}>
          {submitting ? (language === 'ru' ? 'Отправка...' : 'Yuborilmoqda...') : paymentMethod === 'online_card' ? (language === 'ru' ? 'Перейти к оплате' : 'To\'lovga o\'tish') : (language === 'ru' ? 'Подтвердить заказ' : 'Buyurtmani tasdiqlash')}
        </button>
      </div>
    </div>
  )
}