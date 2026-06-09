import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { createOrder } from '../lib/supabase'

export default function CartPage({ telegramUser }: { telegramUser?: any }) {
  const { cart, removeFromCart, addToCart, clearCart, getTotalPrice, currency, exchangeRate, language } = useStore()
  const [showCheckout, setShowCheckout] = useState(false)

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  // Если корзина пустая
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

      {/* Список товаров */}
      <div className="space-y-3 mb-32">
        {cart.map((item) => (
          <div key={`${item.productId}-${item.size}`} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3">
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="font-medium text-sm mb-1">{item.name}</h3>
              <p className="text-xs text-gray-500 mb-2">
                {language === 'ru' ? 'Размер:' : 'O\'lcham:'} {item.size}
              </p>
              <p className="font-bold">
                {formatPrice(item.priceUsd)}
              </p>
            </div>
            <div className="flex flex-col items-end justify-between">
              <button
                onClick={() => removeFromCart(item.productId, item.size)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
                <button
                  onClick={() => {
                    if (item.quantity > 1) {
                      addToCart({ ...item, quantity: -1 })
                    }
                  }}
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
            </div>
          </div>
        ))}
      </div>

      {/* Итого и кнопка оформления */}
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

      {/* Модальное окно оформления заказа */}
      {showCheckout && (
        <CheckoutModal
          onClose={() => setShowCheckout(false)}
          formatPrice={formatPrice}
          getTotalPrice={getTotalPrice}
          telegramUser={telegramUser}
          currency={currency}
        />
      )}
    </div>
  )
}

// Компонент модального окна оформления
function CheckoutModal({ onClose, formatPrice, getTotalPrice, telegramUser, currency }: any) {
  const { cart, clearCart, language } = useStore()
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup')
  const [paymentMethod, setPaymentMethod] = useState<'online_card' | 'upon_receipt'>('online_card')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+998')
  const [address, setAddress] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleDeliveryChange = (method: 'pickup' | 'delivery') => {
    setDeliveryMethod(method)
    if (method === 'delivery') {
      setPaymentMethod('online_card')
    }
  }

  const handlePhoneChange = (value: string) => {
    let cleaned = value.replace(/[^\d+]/g, '')
    
    if (!cleaned.startsWith('+998') && cleaned.length > 0) {
      if (cleaned.startsWith('+')) {
        cleaned = '+998' + cleaned.slice(1)
      } else {
        cleaned = '+998' + cleaned
      }
    }
    
    if (cleaned.startsWith('+') && !cleaned.startsWith('+998')) {
      cleaned = '+998'
    }
    
    if (cleaned.length > 13) {
      cleaned = cleaned.slice(0, 13)
    }
    
    setPhone(cleaned)
  }

  const handleSubmit = async () => {
    // Валидация имени (минимум 3 символа)
    if (!name || name.trim().length < 3) {
      toast.error(
        language === 'ru' 
          ? 'Имя должно содержать минимум 3 символа' 
          : 'Ism kamida 3 ta belgidan iborat bo\'lishi kerak'
      )
      return
    }

    // Валидация телефона (+998 и 9 цифр после)
    const phoneRegex = /^\+998\d{9}$/
    if (!phoneRegex.test(phone)) {
      toast.error(
        language === 'ru' 
          ? 'Телефон должен быть в формате +998XXXXXXXX (9 цифр после +998)' 
          : 'Telefon +998XXXXXXXX formatida bo\'lishi kerak (+998 dan keyin 9 ta raqam)'
      )
      return
    }

    if (deliveryMethod === 'delivery' && !address) {
      toast.error(language === 'ru' ? 'Укажите адрес доставки' : 'Yetkazib berish manzilini kiriting')
      return
    }

    setSubmitting(true)

    try {
      const userId = telegramUser?.id?.toString() || 'guest-user'
      
      const orderData = {
        user_id: userId,
        client_name: name.trim(),
        client_phone: phone,
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === 'delivery' ? address : null,
        payment_method: paymentMethod,
        total_price_usd: getTotalPrice(), // Всегда сохраняем в USD
        items: cart,
        status: 'Активный',
      }

      console.log('Отправляем заказ:', orderData)

      const result: any = await createOrder(orderData)
      const data = Array.isArray(result) ? result[0] : result
      const error = null

      if (error) {
        console.error('Ошибка при создании заказа:', error)
        toast.error(language === 'ru' ? 'Ошибка при создании заказа' : 'Buyurtma yaratishda xatolik')
        setSubmitting(false)
        return
      }

      console.log('Заказ создан:', data)

      const newOrderId = data?.id || Math.floor(Math.random() * 1000) + 500
      setOrderId(newOrderId)
      setOrderSuccess(true)
      clearCart()
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error(language === 'ru' ? 'Произошла ошибка' : 'Xatolik yuz berdi')
    } finally {
      setSubmitting(false)
    }
  }

  if (orderSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">
            {language === 'ru' ? 'Заказ оформлен!' : 'Buyurtma tasdiqlandi!'}
          </h2>
          <p className="text-gray-600 mb-4">
            {language === 'ru' 
              ? `Номер вашего заказа: ` 
              : `Sizning buyurtma raqamingiz: `}
            <span className="font-bold text-black">№{orderId}</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {language === 'ru' 
              ? 'Менеджер свяжется с вами в ближайшее время' 
              : 'Menejer tez orada siz bilan bog\'lanadi'}
          </p>
          <button
            onClick={onClose}
            className="w-full bg-black text-white py-3 rounded-xl font-bold"
          >
            {language === 'ru' ? 'Отлично' : 'Ajoyib'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto p-6 pb-32">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {language === 'ru' ? 'Оформление заказа' : 'Buyurtmani rasmiylashtirish'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Контактные данные */}
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

          {/* Способ получения */}
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
               {language === 'ru' 
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
            </div>
          )}

          {/* Способ оплаты */}
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
              <span className="text-sm">
                {language === 'ru' ? 'Оплата картой сейчас' : 'Karta orqali to\'lash'}
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
                  ? '* При доставке доступна только предоплата картой' 
                  : '* Yetkazib berishda faqat oldindan to\'lov'}
              </p>
            )}
          </div>

          {/* Итого */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">
                {language === 'ru' ? 'Итого к оплате:' : 'To\'lov uchun jami:'}
              </span>
              <span className="text-xl font-bold">
                {formatPrice(getTotalPrice())}
              </span>
            </div>
          </div>

          {/* Кнопка подтверждения */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
              submitting 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {submitting 
              ? (language === 'ru' ? 'Отправка...' : 'Yuborilmoqda...')
              : (language === 'ru' ? 'Подтвердить заказ' : 'Buyurtmani tasdiqlash')
            }
          </button>
        </div>
      </div>
    </div>
  )
}