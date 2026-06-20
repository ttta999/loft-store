import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { User, Package, Globe, DollarSign, ChevronRight, CreditCard, X } from 'lucide-react'
import { toast } from 'sonner'
import { createPayment, cancelOrder } from '../lib/payments'

function OrderDetailModal({ order, onClose, language, currency, exchangeRate, onPayAgain, onCancelOrder }: any) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusText = (status: string, deliveryMethod: string) => {
    if (deliveryMethod === 'pickup') {
      const labels: Record<string, string> = {
        'Активный': 'Принят 📄',
        'В обработке': 'Собирается 📦',
        'Готов': 'Готов к выдаче 🎉',
        'Выдан': 'Получен 🤝',
        'Отменён': 'Отменен 🚫',
        'Ожидает оплаты': 'Ожидает оплаты ⏳',
      }
      return labels[status] || status
    }
    const labels: Record<string, string> = {
      'Активный': 'Принят 📄',
      'В обработке': 'Собирается 📦',
      'Готов': 'Упакован 🛍️',
      'Выдан': 'Передан курьеру 🚀',
      'Доставлен': 'Доставлен ✅',
      'Отменён': 'Отменен 🚫',
      'Ожидает оплаты': 'Ожидает оплаты ⏳',
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Активный': 'bg-blue-100 text-blue-800',
      'В обработке': 'bg-yellow-100 text-yellow-800',
      'Готов': 'bg-green-100 text-green-800',
      'Выдан': 'bg-gray-100 text-gray-800',
      'Доставлен': 'bg-emerald-100 text-emerald-800',
      'Отменён': 'bg-red-100 text-red-800',
      'Ожидает оплаты': 'bg-orange-100 text-orange-800',
    }
    return colors[status] || 'bg-green-100 text-green-800'
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-white p-4 border-b sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-gray-600 hover:text-black">
            ← {language === 'ru' ? 'Назад' : 'Orqaga'}
          </button>
          <h1 className="text-xl font-bold">LOFT Store</h1>
          <div className="w-16"></div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <h2 className="text-2xl font-bold mb-4">
          {language === 'ru' ? 'Детали заказа' : 'Buyurtma tafsilotlari'}
        </h2>
        
        {order.special_order_id && (
          <div className="mb-4 px-4 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium">
            🌍 {language === 'ru' ? 'Заказ из спецзаказа' : 'Maxsus buyurtmadan'}
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              {language === 'ru' ? 'Заказ №' : 'Buyurtma №'}{order.id}
            </p>
            <p className="text-sm text-gray-600">
              {formatDateTime(order.created_at)}
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Телефон' : 'Telefon'}
            </h3>
            <p className="text-sm">📞 {order.client_phone}</p>
          </div>

          <div>
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Способ получения' : 'Olish usuli'}
            </h3>
            <p className="text-sm">
              {order.delivery_method === 'pickup' 
                ? (language === 'ru' ? 'Самовывоз' : 'O\'z-o\'zini olish')
                : (language === 'ru' ? 'Доставка' : 'Yetkazib berish')}
            </p>
            {order.delivery_method === 'pickup' && (
              <p className="text-sm text-gray-600 mt-1">
                 {language === 'ru' 
                  ? 'Рынок Малика, ТЦ Меркато (здание korzinka.uz, 2 этаж, магазин 34)' 
                  : 'Malika bozori, Mercato savdo markazi (korzinka.uz binosi, 2-qavat, 34-do\'kon)'}
              </p>
            )}
            {order.delivery_address && (
              <p className="text-sm text-gray-600 mt-1">
                {language === 'ru' ? 'Адрес: ' : 'Manzil: '}{order.delivery_address}
              </p>
            )}
          </div>

          <div>
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Способ оплаты' : 'To\'lov usuli'}
            </h3>
            <p className="text-sm">
              {order.payment_method === 'online_card'
                ? (language === 'ru' ? 'Оплата картой' : 'Karta orqali to\'lash')
                : (language === 'ru' ? 'Оплата при получении' : 'Olganda to\'lash')}
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Товары' : 'Mahsulotlar'}
            </h3>
            <div className="space-y-2">
              {items.map((item: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg flex gap-3">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {language === 'ru' ? 'Размер: ' : 'O\'lcham: '}{item.size}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'ru' ? 'Количество: ' : 'Miqdori: '}{item.quantity}
                    </p>
                    <p className="font-bold text-sm">
                      {formatPrice(item.priceUsd)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="font-bold">
                {language === 'ru' ? 'Итого:' : 'Jami:'}
              </span>
              <span className="text-xl font-bold">
                {formatPrice(order.total_price_usd)}
              </span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Статус' : 'Holat'}
            </h3>
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {getStatusText(order.status, order.delivery_method)}
            </span>
          </div>

          {/* ✅ КНОПКИ ОПЛАТИТЬ И ОТМЕНИТЬ ЗАКАЗ */}
          {order.status === 'Ожидает оплаты' && order.payment_method === 'online_card' && (
            <div className="space-y-2">
              <button
                onClick={() => onPayAgain(order)}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <CreditCard size={20} />
                {language === 'ru' ? '💳 Оплатить заказ' : '💳 Buyurtmani to\'lash'}
              </button>
              
              <button
                onClick={() => onCancelOrder(order)}
                className="w-full bg-red-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
              >
                <X size={20} />
                {language === 'ru' ? '🚫 Отменить заказ' : '🚫 Buyurtmani bekor qilish'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChinaRequestDetailModal({ request, onClose, language, onAccept }: any) {
  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusText = (status: string) => {
    const labels: Record<string, string> = {
      'На рассмотрении': 'Принят 📄',
      'Оценён': 'Оценён 💎',
      'Оплачен': 'Оплачен ✅',
      'Отменён клиентом': 'Отменён вами 🙅‍♂️',
      'Отклонён': 'Отклонён 🛑',
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'На рассмотрении': 'bg-yellow-100 text-yellow-800',
      'Оценён': 'bg-purple-100 text-purple-800',
      'Оплачен': 'bg-green-100 text-green-800',
      'Отменён клиентом': 'bg-orange-100 text-orange-800',
      'Отклонён': 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-white p-4 border-b sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-gray-600 hover:text-black">
            ← {language === 'ru' ? 'Назад' : 'Orqaga'}
          </button>
          <h1 className="text-xl font-bold">LOFT Store</h1>
          <div className="w-16"></div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <h2 className="text-2xl font-bold mb-4">
          {language === 'ru' ? 'Детали спецзаказа' : 'Maxsus buyurtma tafsilotlari'}
        </h2>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              {language === 'ru' ? 'Спецзаказ №' : 'Maxsus buyurtma №'}{request.id}
            </p>
            <p className="text-sm text-gray-600">
              {formatDateTime(request.created_at)}
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Название или ссылка на товар' : 'Mahsulot nomi yoki havolasi'}
            </h3>
            {request.link?.startsWith('http') ? (
              <a href={request.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                {request.link}
              </a>
            ) : (
              <p className="text-sm text-gray-700">{request.link}</p>
            )}
          </div>

          {request.size_color && (
            <div>
              <h3 className="font-bold mb-2">
                {language === 'ru' ? 'Размер / Цвет' : 'O\'lcham / Rang'}
              </h3>
              <p className="text-sm text-gray-700">{request.size_color}</p>
            </div>
          )}

          {request.comment && (
            <div>
              <h3 className="font-bold mb-2">
                {language === 'ru' ? 'Комментарий' : 'Izoh'}
              </h3>
              <p className="text-sm text-gray-700">{request.comment}</p>
            </div>
          )}

          {request.image_url && (
            <div>
              <h3 className="font-bold mb-2">
                {language === 'ru' ? 'Фото товара' : 'Mahsulot fotosurati'}
              </h3>
              <img src={request.image_url} alt="Product" className="w-full rounded-lg" />
            </div>
          )}

          {request.manager_price && (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-lg font-bold text-purple-900 mb-1">
                💰 {language === 'ru' ? 'Оценка менеджера:' : 'Menejer bahosi:'} ${request.manager_price}
              </p>
              {request.manager_comment && (
                <p className="text-sm text-purple-700">
                  📝 {request.manager_comment}
                </p>
              )}
            </div>
          )}

          <div className="mb-8">
            <h3 className="font-bold mb-3">
              {language === 'ru' ? 'Статус' : 'Holat'}
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                {getStatusText(request.status)}
              </span>
              
              {request.status === 'Оценён' && request.manager_price && (
                <button
                  onClick={() => onAccept(request)}
                  className="bg-black text-white px-6 py-2.5 rounded-lg font-bold hover:bg-gray-800 transition-colors whitespace-nowrap flex-1 sm:flex-none"
                >
                  💳 {language === 'ru' ? `Согласиться и оплатить $${request.manager_price}` : `Rozilik bildirish va to'lash $${request.manager_price}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ProfilePageProps {
  telegramUser?: any
  showBackButton: boolean
  setShowBackButton: (show: boolean) => void
  onBackClick: (() => void) | null
  setOnBackClick: (fn: (() => void) | null) => void
}

export default function ProfilePage({
  telegramUser,
  showBackButton: _showBackButton,
  setShowBackButton,
  onBackClick: _onBackClick,
  setOnBackClick
}: ProfilePageProps) {
  const { language, currency, exchangeRate, setLanguage, setCurrency, addToCart } = useStore()
  const [activeSection, setActiveSection] = useState<'main' | 'orders' | 'china'>('main')
  const [orders, setOrders] = useState<any[]>([])
  const [chinaRequests, setChinaRequests] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [selectedChinaRequest, setSelectedChinaRequest] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeSection === 'main') {
      setShowBackButton(false)
      setOnBackClick(null)
    } else if (activeSection === 'orders') {
      setShowBackButton(true)
      setOnBackClick(() => () => setActiveSection('main'))
    } else if (activeSection === 'china') {
      setShowBackButton(true)
      setOnBackClick(() => () => setActiveSection('main'))
    }

    if (selectedOrder || selectedChinaRequest) {
      setShowBackButton(true)
      setOnBackClick(() => () => {
        setSelectedOrder(null)
        setSelectedChinaRequest(null)
      })
    }
  }, [activeSection, selectedOrder, selectedChinaRequest, setShowBackButton, setOnBackClick])

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getOrderStatusText = (status: string, deliveryMethod: string) => {
    if (deliveryMethod === 'pickup') {
      const labels: Record<string, string> = {
        'Активный': 'Принят 📄',
        'В обработке': 'Собирается 📦',
        'Готов': 'Готов к выдаче 🎉',
        'Выдан': 'Получен 🤝',
        'Отменён': 'Отменен 🚫',
        'Ожидает оплаты': 'Ожидает оплаты ⏳',
      }
      return labels[status] || status
    }
    const labels: Record<string, string> = {
      'Активный': 'Принят 📄',
      'В обработке': 'Собирается 📦',
      'Готов': 'Упакован 🛍️',
      'Выдан': 'Передан курьеру 🚀',
      'Доставлен': 'Доставлен ✅',
      'Отменён': 'Отменен 🚫',
      'Ожидает оплаты': 'Ожидает оплаты ⏳',
    }
    return labels[status] || status
  }

  const getOrderStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Активный': 'bg-blue-100 text-blue-800',
      'В обработке': 'bg-yellow-100 text-yellow-800',
      'Готов': 'bg-green-100 text-green-800',
      'Выдан': 'bg-gray-100 text-gray-800',
      'Доставлен': 'bg-emerald-100 text-emerald-800',
      'Отменён': 'bg-red-100 text-red-800',
      'Ожидает оплаты': 'bg-orange-100 text-orange-800',
    }
    return colors[status] || 'bg-green-100 text-green-800'
  }

  const getChinaStatusText = (status: string) => {
    const labels: Record<string, string> = {
      'На рассмотрении': 'Принят 📄',
      'Оценён': 'Оценён 💎',
      'Оплачен': 'Оплачен ✅',
      'Отменён клиентом': 'Отменён вами 🙅‍️',
      'Отклонён': 'Отклонён 🛑',
    }
    return labels[status] || status
  }

  const getChinaStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'На рассмотрении': 'bg-yellow-100 text-yellow-800',
      'Оценён': 'bg-purple-100 text-purple-800',
      'Оплачен': 'bg-green-100 text-green-800',
      'Отменён клиентом': 'bg-orange-100 text-orange-800',
      'Отклонён': 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const loadOrders = async () => {
    setLoading(true)
    const userId = telegramUser?.id || 'guest-user'
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Ошибка при загрузке заказов:', error)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  const loadChinaRequests = async () => {
    setLoading(true)
    const userId = telegramUser?.id || 'guest-user'
    const { data, error } = await supabase
      .from('china_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Ошибка при загрузке спецзаказов:', error)
    } else {
      setChinaRequests(data || [])
    }
    setLoading(false)
  }

  // ✅ Функция оплаты заказа
  const handlePayAgain = async (order: any) => {
    try {
      const totalInSums = order.total_price_usd * exchangeRate
      
      await createPayment({
        orderId: order.id.toString(),
        amount: totalInSums,
        description: `Заказ №${order.id} в LOFT Store`
      })
      
      toast.success(language === 'ru' ? 'Открываем окно оплаты...' : 'To\'lov oynasi ochilmoqda...')
    } catch (error) {
      console.error('Ошибка оплаты:', error)
      toast.error(language === 'ru' ? 'Ошибка при оплате' : 'To\'lovda xatolik')
    }
  }

  // ✅ Функция отмены заказа
  const handleCancelOrder = async (order: any) => {
    const confirmed = confirm(
      language === 'ru' 
        ? `Вы уверены что хотите отменить заказ №${order.id}?` 
        : `${order.id}-buyurtmani bekor qilishga ishonchingiz komilmi?`
    )
    
    if (!confirmed) return
    
    try {
      const success = await cancelOrder(order.id.toString())
      
      if (success) {
        toast.success(language === 'ru' ? 'Заказ отменён' : 'Buyurtma bekor qilindi')
        setSelectedOrder(null)
        await loadOrders()
      } else {
        toast.error(language === 'ru' ? 'Ошибка при отмене заказа' : 'Buyurtmani bekor qilishda xatolik')
      }
    } catch (error) {
      console.error('Ошибка отмены:', error)
      toast.error(language === 'ru' ? 'Ошибка при отмене заказа' : 'Buyurtmani bekor qilishda xatolik')
    }
  }

  const handleAcceptSpecialOrder = (request: any) => {
    const specialItem = {
      productId: `special-${request.id}-${Date.now()}`,
      name: `Спецзаказ №${request.id}`,
      size: request.size_color || '—',
      quantity: 1,
      priceUsd: request.manager_price,
      image: request.image_url || '',
      isSpecialOrder: true,
      specialRequestId: request.id,
    }
    
    addToCart(specialItem)
    setSelectedChinaRequest(null)
    toast.success(
      language === 'ru' 
        ? 'Спецзаказ добавлен в корзину! Перейдите в корзину для оформления.' 
        : 'Maxsus buyurtma savatga qo\'shildi! Savatga o\'ting.'
    )
  }

  if (activeSection === 'main') {
    return (
      <div className="p-4 pb-20">
        <div className="bg-white rounded-2xl p-6 mb-6 text-center">
          {telegramUser?.photoUrl ? (
            <img 
              src={telegramUser.photoUrl} 
              alt="Avatar" 
              className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
            />
          ) : (
            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
              <User size={40} className="text-gray-400" />
            </div>
          )}
          <h2 className="text-xl font-bold mb-1">
            {telegramUser 
              ? `${telegramUser.firstName} ${telegramUser.lastName || ''}`.trim()
              : (language === 'ru' ? 'Гость' : 'Mehmon')}
          </h2>
          {telegramUser?.username ? (
            <p className="text-sm text-gray-500">@{telegramUser.username}</p>
          ) : (
            <p className="text-sm text-gray-500">
              {language === 'ru' ? 'Войдите через Telegram' : 'Telegram orqali kiring'}
            </p>
          )}
        </div>

        <h3 className="text-lg font-bold mb-3">
          {language === 'ru' ? 'Настройки' : 'Sozlamalar'}
        </h3>
        <div className="bg-white rounded-xl overflow-hidden mb-6">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-gray-600" />
              <span className="font-medium">
                {language === 'ru' ? 'Язык' : 'Til'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('ru')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  language === 'ru' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                RU
              </button>
              <button
                onClick={() => setLanguage('uz')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  language === 'uz' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                UZ
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <DollarSign size={20} className="text-gray-600" />
              <span className="font-medium">
                {language === 'ru' ? 'Валюта' : 'Valyuta'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  currency === 'USD' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                USD
              </button>
              <button
                onClick={() => setCurrency('UZS')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  currency === 'UZS' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                UZS
              </button>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-3">
          {language === 'ru' ? 'Мои заказы' : 'Mening buyurtmalarim'}
        </h3>
        <div className="bg-white rounded-xl overflow-hidden">
          <button
            onClick={() => {
              setActiveSection('orders')
              loadOrders()
            }}
            className="flex items-center justify-between w-full p-4 border-b border-gray-100 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Package size={20} className="text-gray-600" />
              <span className="font-medium">
                {language === 'ru' ? 'История заказов' : 'Buyurtmalar tarixi'}
              </span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>

          <button
            onClick={() => {
              setActiveSection('china')
              loadChinaRequests()
            }}
            className="flex items-center justify-between w-full p-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-gray-600" />
              <span className="font-medium">
                {language === 'ru' ? 'Мои спецзаказы' : 'Maxsus buyurtmalarim'}
              </span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="mt-6 bg-blue-50 rounded-xl p-4">
          <h4 className="font-bold mb-2 text-blue-900">
            {language === 'ru' ? 'Контакты LOFT' : 'LOFT aloqa'}
          </h4>
          <p className="text-sm text-blue-800 mb-1">
             {language === 'ru' 
              ? 'Рынок Малика, ТЦ Меркато' 
              : 'Malika bozori, Mercato savdo markazi'}
          </p>
          <p className="text-sm text-blue-800 mb-1">
            {language === 'ru'
              ? '(здание korzinka.uz, 2 этаж, магазин 34)'
              : '(korzinka.uz binosi, 2-qavat, 34-do\'kon)'}
          </p>
          <p className="text-sm text-blue-800 mb-1">
             +998 93 378 87 70
          </p>
          <p className="text-sm text-blue-800">
             {language === 'ru' 
              ? 'Ежедневно 10:00 - 20:00' 
              : 'Har kuni 10:00 - 20:00'}
          </p>
        </div>
      </div>
    )
  }

  if (activeSection === 'orders') {
    return (
      <div className="p-4 pb-20">
        <h2 className="text-2xl font-bold mb-4">
          {language === 'ru' ? 'История заказов' : 'Buyurtmalar tarixi'}
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-500">
              {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package size={64} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {language === 'ru' ? 'У вас пока нет заказов' : 'Sizda hali buyurtmalar yo\'q'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
              return (
                <div 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold">
                        {language === 'ru' ? `Заказ №${order.id}` : `Buyurtma №${order.id}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(order.created_at)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                      {getOrderStatusText(order.status, order.delivery_method)}
                    </span>
                  </div>

                  {order.special_order_id && (
                    <div className="mb-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full inline-block">
                      🌍 {language === 'ru' ? 'Спецзаказ' : 'Maxsus buyurtma'}
                    </div>
                  )}

                  <div className="flex gap-1 mb-3">
                    {items.slice(0, 2).map((item: any, idx: number) => (
                      <img 
                        key={idx}
                        src={item.image} 
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded border border-gray-200"
                      />
                    ))}
                    {items.length > 2 && (
                      <div className="relative w-12 h-12 rounded border border-gray-200 overflow-hidden bg-gray-100">
                        <img 
                          src={items[2].image} 
                          alt="more"
                          className="w-full h-full object-cover blur-sm opacity-50"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-gray-700 text-xs font-bold">+{items.length - 2}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-lg font-bold">
                    {formatPrice(order.total_price_usd)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ru' ? 'Нажмите для деталей' : 'Tafsilotlar uchun bosing'}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            language={language}
            currency={currency}
            exchangeRate={exchangeRate}
            onPayAgain={handlePayAgain}
            onCancelOrder={handleCancelOrder}
          />
        )}
      </div>
    )
  }

  if (activeSection === 'china') {
    return (
      <div className="p-4 pb-20">
        <h2 className="text-2xl font-bold mb-4">
          {language === 'ru' ? 'Мои спецзаказы' : 'Maxsus buyurtmalarim'}
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-500">
              {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
            </p>
          </div>
        ) : chinaRequests.length === 0 ? (
          <div className="text-center py-12">
            <Globe size={64} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {language === 'ru' ? 'У вас нет спецзаказов' : 'Sizda maxsus buyurtmalar yo\'q'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {chinaRequests.map((request) => (
              <div 
                key={request.id} 
                onClick={() => setSelectedChinaRequest(request)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">
                      {language === 'ru' ? `Спецзаказ #${request.id}` : `Maxsus buyurtma #${request.id}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(request.created_at)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getChinaStatusColor(request.status)}`}>
                    {getChinaStatusText(request.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">{request.link}</p>
                {request.manager_price && (
                  <p className="text-sm text-purple-700 font-medium mt-1">
                    💰 {language === 'ru' ? 'Оценка:' : 'Baho:'} ${request.manager_price}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'ru' ? 'Нажмите для деталей' : 'Tafsilotlar uchun bosing'}
                </p>
              </div>
            ))}
          </div>
        )}

        {selectedChinaRequest && (
          <ChinaRequestDetailModal
            request={selectedChinaRequest}
            onClose={() => setSelectedChinaRequest(null)}
            language={language}
            onAccept={handleAcceptSpecialOrder}
          />
        )}
      </div>
    )
  }

  return null
}