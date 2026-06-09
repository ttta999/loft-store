import { useState } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { User, Package, Globe, DollarSign, ChevronRight } from 'lucide-react'

// Модальное окно для просмотра деталей заказа
function OrderDetailModal({ order, onClose, language, currency }: { order: any; onClose: () => void; language: string; currency: string }) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto pb-32">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold">
            {language === 'ru' ? 'Детали заказа' : 'Buyurtma tafsilotlari'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-2xl">
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              {language === 'ru' ? 'Заказ №' : 'Buyurtma №'}{order.id}
            </p>
            <p className="text-sm text-gray-600">
              {new Date(order.created_at).toLocaleDateString()}
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
                      {currency === 'USD' 
                        ? `$${item.priceUsd}` 
                        : `${(item.priceUsd * 13000).toLocaleString()} сум`}
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
                {currency === 'USD' 
                  ? `$${order.total_price_usd}` 
                  : `${(order.total_price_usd * 13000).toLocaleString()} сум`}
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Статус' : 'Holat'}
            </h3>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              order.status === 'Активный' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {order.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Модальное окно для просмотра деталей спецзаказа
function ChinaRequestDetailModal({ request, onClose, language }: { request: any; onClose: () => void; language: string }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto pb-32">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold">
            {language === 'ru' ? 'Детали спецзаказа' : 'Maxsus buyurtma tafsilotlari'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-2xl">
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              {language === 'ru' ? 'Спецзаказ №' : 'Maxsus buyurtma №'}{request.id}
            </p>
            <p className="text-sm text-gray-600">
              {new Date(request.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Ссылка на товар' : 'Mahsulot havolasi'}
            </h3>
            <a 
              href={request.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {request.link}
            </a>
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
              <img 
                src={request.image_url} 
                alt="Product" 
                className="w-full rounded-lg"
              />
            </div>
          )}

          <div>
            <h3 className="font-bold mb-2">
              {language === 'ru' ? 'Статус' : 'Holat'}
            </h3>
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              {request.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage({ telegramUser }: { telegramUser?: any }) {
  const { language, currency, setLanguage, setCurrency } = useStore()
  const [activeSection, setActiveSection] = useState<'main' | 'orders' | 'china'>('main')
  const [orders, setOrders] = useState<any[]>([])
  const [chinaRequests, setChinaRequests] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [selectedChinaRequest, setSelectedChinaRequest] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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
            ⏰ {language === 'ru' 
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
        <button
          onClick={() => setActiveSection('main')}
          className="text-gray-600 hover:text-black mb-4 flex items-center gap-2"
        >
          ← {language === 'ru' ? 'Назад' : 'Orqaga'}
        </button>

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
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">
                        {language === 'ru' ? `Заказ №${order.id}` : `Buyurtma №${order.id}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'Активный' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Фото товаров */}
                  <div className="flex gap-1 mb-2 mt-3">
                    {items.slice(0, 2).map((item: any, idx: number) => (
                      <img 
                        key={idx}
                        src={item.image} 
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded border border-gray-200"
                      />
                    ))}
                    {items.length > 2 && (
                      <div className="relative w-10 h-10 rounded border border-gray-200 overflow-hidden bg-gray-100">
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
                    {currency === 'USD' 
                      ? `$${order.total_price_usd}` 
                      : `${(order.total_price_usd * 13000).toLocaleString()} сум`}
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
          />
        )}
      </div>
    )
  }

  if (activeSection === 'china') {
    return (
      <div className="p-4 pb-20">
        <button
          onClick={() => setActiveSection('main')}
          className="text-gray-600 hover:text-black mb-4 flex items-center gap-2"
        >
          ← {language === 'ru' ? 'Назад' : 'Orqaga'}
        </button>

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
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {request.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">{request.link}</p>
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
          />
        )}
      </div>
    )
  }

  return null
}