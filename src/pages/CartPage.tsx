import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Minus, Plus, Trash2, ShoppingBag, CreditCard, Upload } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { createOrder, createOrderFromSpecial, notifyNewOrder } from '../lib/supabase'
import { MANAGER_TELEGRAM_LINK, PAYMENT_DETAILS, uploadPaymentScreenshot, savePaymentScreenshot } from '../lib/payments'

export default function CartPage({ telegramUser }: { telegramUser?: any }) {
  const navigate = useNavigate()
  const { cart, removeFromCart, addToCart, getTotalPrice, currency, exchangeRate, language } = useStore()
  const [showCheckout, setShowCheckout] = useState(false)

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  if (cart.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <ShoppingBag size={64} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">
          {language === 'ru' ? 'Корзина пуста' : 'Savat bo\'sh'}
        </h2>
        <p className="text-gray-500 text-center px-4">
          {language === 'ru' 
            ? 'Добавьте товары из каталога, чтобы оформить заказ' 
            : 'Buyurtma rasmiylashtirish uchun kataloqdan mahsulotlar qo\'shing'}
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 pb-32">
      <Toaster position="top-center" richColors />
      
      <h1 className="text-2xl font-bold mb-4">
        {language === 'ru' ? 'Корзина' : 'Savat'}
      </h1>

      <div className="space-y-3 mb-32">
        {cart.map((item) => (
          <div key={`${item.productId}-${item.size}`} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3">
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate(`/product/${item.productId}`, { 
                state: { fromCart: true }
              })}
            />
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => navigate(`/product/${item.productId}`, { 
                state: { fromCart: true }
              })}
            >
              <h3 className="font-medium text-sm mb-1">{item.name}</h3>
              <p className="text-xs text-gray-500 mb-2">
                {language === 'ru' ? 'Размер:' : 'O\'lcham:'} {item.size}
              </p>
              <p className="font-bold">
                {formatPrice(item.priceUsd)}
              </p>
              {item.isSpecialOrder && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                  🌍 {language === 'ru' ? 'Спецзаказ' : 'Maxsus buyurtma'}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end justify-between">
              <button
                onClick={() => removeFromCart(item.productId, item.size)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
              {!item.isSpecialOrder && (
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
                  <button
                    onClick={() => item.quantity > 1 && addToCart({ ...item, quantity: -1 })}
                    className="text-gray-600"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-medium text-sm">{item.quantity}</span>
                  <button
                    onClick={() => addToCart({ ...item, quantity: 1 })}
                    className="text-gray-600"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg pb-24">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-600">
            {language === 'ru' ? 'Итого:' : 'Jami:'}
          </span>
          <span className="text-xl font-bold">
            {formatPrice(getTotalPrice())}
          </span>
        </div>
        <button
          onClick={() => setShowCheckout(true)}
          className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors"
        >
          {language === 'ru' ? 'Оформить заказ' : 'Buyurtma berish'}
        </button>
      </div>

      {showCheckout && (
        <CheckoutModal
          onClose={() => setShowCheckout(false)}
          formatPrice={formatPrice}
          getTotalPrice={getTotalPrice}
          telegramUser={telegramUser}
        />
      )}
    </div>
  )
}

function CheckoutModal({ onClose, formatPrice, getTotalPrice, telegramUser }: any) {
  const { cart, clearCart, language, currency, exchangeRate } = useStore()
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

  const specialItem = cart.find((i: any) => i.isSpecialOrder)
  const isSpecialOrder = !!specialItem

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

  const createOrderInDb = async (): Promise<any> => {
    const userId = telegramUser?.id?.toString() || 'guest-user'
    
    const totalInSums = Math.round(getTotalPrice() * exchangeRate)
    
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
      total_price_usd: getTotalPrice(),
      total_price_uzs: totalInSums,
      exchange_rate_at_order: exchangeRate,
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
      const screenshotUrl = await uploadPaymentScreenshot(currentOrderId, file)
      const saved = await savePaymentScreenshot(currentOrderId, screenshotUrl)

      if (saved) {
        setScreenshotUploaded(true)
        toast.success(language === 'ru' ? 'Скриншот загружен! Ожидайте подтверждения.' : 'Screenshot yuklandi! Tasdiqlashni kuting.')
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      toast.error(language === 'ru' ? 'Ошибка загрузки скриншота' : 'Screenshot yuklashda xatolik')
    } finally {
      setUploadingScreenshot(false)
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

  if (showPaymentInfo) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* ✅ БЕЗ border-b */}
        <div className="bg-white p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => {
                if (screenshotUploaded) {
                  setShowPaymentInfo(false)
                  setOrderSuccess(true)
                  clearCart()
                } else {
                  setShowPaymentInfo(false)
                }
              }} 
              className="text-gray-600 hover:text-black"
            >
              ← {language === 'ru' ? 'Назад' : 'Orqaga'}
            </button>
            <h1 className="text-xl font-bold">LOFT Store</h1>
            <div className="w-16"></div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 pb-40">
          <div className="text-6xl text-center mb-4">💳</div>
          
          <h2 className="text-2xl font-bold mb-4 text-center">
            {language === 'ru' ? 'Оплата заказа' : 'Buyurtmani to\'lash'}
          </h2>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-orange-800 font-medium text-center">
              {language === 'ru' 
                ? `⏳ Заказ №${currentOrderId} ожидает оплаты` 
                : `⏳ ${currentOrderId}-buyurtma to'lovni kutmoqda`}
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-bold mb-3">
              {language === 'ru' ? '📱 Реквизиты для оплаты:' : '📱 To\'lov rekvizitlari:'}
            </h3>
            <div className="space-y-2 text-sm">
              <p><b>CLICK:</b> {PAYMENT_DETAILS.click}</p>
              <p><b>Payme:</b> {PAYMENT_DETAILS.payme}</p>
              <p><b>Uzum Bank:</b> {PAYMENT_DETAILS.uzum}</p>
            </div>
            <p className="text-lg font-bold mt-4 pt-4 border-t">
              {language === 'ru' ? '💰 Сумма:' : '💰 Summa:'} {formatPrice(getTotalPrice())}
            </p>
          </div>

          <div className="mb-4">
            <h3 className="font-bold mb-3">
              {language === 'ru' ? '📸 Загрузите скриншот оплаты:' : '📸 To\'lov screenshotini yuklang:'}
            </h3>
            
            {!screenshotUploaded ? (
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                uploadingScreenshot 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-500'
              }`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploadingScreenshot ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                  ) : (
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                  )}
                  <p className="text-sm text-gray-500">
                    {uploadingScreenshot 
                      ? (language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...')
                      : (language === 'ru' ? 'Нажмите для загрузки скриншота' : 'Screenshotni yuklash uchun bosing')
                    }
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {language === 'ru' ? 'PNG, JPG до 10MB' : 'PNG, JPG 10MB gacha'}
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-800 font-bold mb-2">
                  {language === 'ru' ? 'Скриншот загружен!' : 'Screenshot yuklandi!'}
                </p>
                <p className="text-sm text-green-700">
                  {language === 'ru' 
                    ? 'Мы проверим оплату и подтвердим заказ в течение 15 минут' 
                    : 'To\'lovni tekshiramiz va 15 daqiqa ichida tasdiqlaymiz'}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <a
              href={MANAGER_TELEGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              📩 {language === 'ru' ? 'Написать менеджеру' : 'Menejerga yozish'}
            </a>
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Заказ №${currentOrderId}\nСумма: ${formatPrice(getTotalPrice())}\n\nCLICK: ${PAYMENT_DETAILS.click}\nPayme: ${PAYMENT_DETAILS.payme}\nUzum: ${PAYMENT_DETAILS.uzum}`
                )
                toast.success(language === 'ru' ? 'Реквизиты скопированы!' : 'Rekvizitlar nusxalandi!')
              }}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold"
            >
              📋 {language === 'ru' ? 'Скопировать реквизиты' : 'Rekvizitlarni nusxalash'}
            </button>
            
            {screenshotUploaded && (
              <button
                onClick={() => {
                  setShowPaymentInfo(false)
                  setOrderSuccess(true)
                  clearCart()
                }}
                className="w-full bg-black text-white py-3 rounded-xl font-bold"
              >
                {language === 'ru' ? 'Готово' : 'Tayyor'}
              </button>
            )}
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium">
              ️ {language === 'ru' 
                ? 'Заказ будет обработан только после подтверждения оплаты менеджером' 
                : 'Buyurtma faqat menejer tomonidan to\'lov tasdiqlangandan so\'ng ko\'rib chiqiladi'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (orderSuccess) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">
          {language === 'ru' ? 'Заказ оформлен!' : 'Buyurtma tasdiqlandi!'}
        </h2>
        <p className="text-gray-600 mb-4">
          {language === 'ru' ? `Номер вашего заказа: ` : `Sizning buyurtma raqamingiz: `}
          <span className="font-bold text-black">№{orderId}</span>
        </p>
        {isSpecialOrder && (
          <p className="text-sm text-purple-700 mb-2 font-medium">
             {language === 'ru' ? 'Заказ из спецзаказа' : 'Maxsus buyurtmadan'}
          </p>
        )}
        <p className="text-sm text-gray-500 mb-6 text-center">
          {language === 'ru' 
            ? 'Менеджер свяжется с вами в ближайшее время' 
            : 'Menejer tez orada siz bilan bog\'lanadi'}
        </p>
        <button
          onClick={onClose}
          className="w-full max-w-sm bg-black text-white py-3 rounded-xl font-bold"
        >
          {language === 'ru' ? 'Отлично' : 'Ajoyib'}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* ✅ БЕЗ border-b */}
      <div className="p-4 flex items-center justify-between sticky top-0 bg-white z-10">
        <button onClick={onClose} className="text-gray-600 hover:text-black">
          ← {language === 'ru' ? 'Назад' : 'Orqaga'}
        </button>
        <h1 className="text-xl font-bold">LOFT Store</h1>
        <div className="w-16"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <h2 className="text-2xl font-bold mb-4">
          {language === 'ru' ? 'Оформление заказа' : 'Buyurtmani rasmiylashtirish'}
        </h2>

        {isSpecialOrder && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-800 font-medium">
              🌍 {language === 'ru' ? 'Оформление спецзаказа' : 'Maxsus buyurtmani rasmiylashtirish'}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              {language === 'ru' 
                ? 'После оплаты менеджер приступит к заказу товара' 
                : 'To\'lovdan so\'ng menejer mahsulot buyurtma qiladi'}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {language === 'ru' ? 'Имя' : 'Ism'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'ru' ? 'Ваше имя' : 'Sizning ismingiz'}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {language === 'ru' ? 'Телефон' : 'Telefon'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+998 XX XXX XX XX"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {language === 'ru' ? 'Способ получения' : 'Olish usuli'}
            </label>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  deliveryMethod === 'pickup' ? 'bg-white shadow text-black' : 'text-gray-500'
                }`}
                onClick={() => handleDeliveryChange('pickup')}
              >
                {language === 'ru' ? 'Самовывоз' : 'O\'z-o\'zini olish'}
              </button>
              <button
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  deliveryMethod === 'delivery' ? 'bg-white shadow text-black' : 'text-gray-500'
                }`}
                onClick={() => handleDeliveryChange('delivery')}
              >
                {language === 'ru' ? 'Доставка' : 'Yetkazib berish'}
              </button>
            </div>
          </div>

          {deliveryMethod === 'pickup' && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900">
              📍 {language === 'ru' 
                ? 'Рынок Малика, ТЦ Меркато (здание korzinka.uz, 2 этаж, магазин 34)' 
                : 'Malika bozori, Mercato savdo markazi (korzinka.uz binosi, 2-qavat, 34-do\'kon)'}
            </div>
          )}

          {deliveryMethod === 'delivery' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {language === 'ru' ? 'Адрес доставки' : 'Yetkazib berish manzili'}
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={language === 'ru' ? 'Улица, дом, квартира' : 'Ko\'cha, uy, kvartira'}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                {language === 'ru' 
                  ? 'Пример: ул. Навои, дом 15, квартира 23' 
                  : 'Misol: Navoiy ko\'chasi, 15-uy, 23-kvartira'}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {language === 'ru' ? 'Способ оплаты' : 'To\'lov usuli'}
            </label>
            
            <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:border-black transition-colors">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'online_card'}
                onChange={() => setPaymentMethod('online_card')}
                className="w-4 h-4"
              />
              <CreditCard size={20} className="text-blue-600" />
              <span className="text-sm font-medium">
                {language === 'ru' ? 'Оплата переводом' : 'Pul o\'tkazish orqali to\'lash'}
              </span>
            </label>

            {deliveryMethod === 'pickup' && (
              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:border-black transition-colors mt-2">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'upon_receipt'}
                  onChange={() => setPaymentMethod('upon_receipt')}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  {language === 'ru' ? 'Оплата при получении в магазине' : 'Do\'konda olganda to\'lash'}
                </span>
              </label>
            )}

            {deliveryMethod === 'delivery' && (
              <p className="text-xs text-red-500 mt-2">
                {language === 'ru' 
                  ? '* При доставке доступна только предоплата переводом' 
                  : '* Yetkazib berishda faqat oldindan pul o\'tkazish'}
              </p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">
                {language === 'ru' ? 'Итого к оплате:' : 'To\'lov uchun jami:'}
              </span>
              <span className="text-xl font-bold">
                {formatPrice(getTotalPrice())}
              </span>
            </div>
            {currency === 'USD' && (
              <p className="text-xs text-gray-500 mt-1 text-right">
                ≈ {Math.round(getTotalPrice() * exchangeRate).toLocaleString()} сум
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 ${
              submitting 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800'
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
    </div>
  )
}