import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useStore, isProductOnSale } from '../store/useStore'
import { supabase, getProducts } from '../lib/supabase'
import { User, Package, Globe, DollarSign, ChevronRight, X, Upload, MessageCircle, Heart, Phone, Store, Truck, CreditCard, Eye, Copy, Trash2, Sun, Moon, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { cancelOrder, MANAGER_TELEGRAM_LINK, PAYMENT_DETAILS, uploadPaymentScreenshot, savePaymentScreenshot } from '../lib/payments'
import IslandHeader from '../components/IslandHeader'

// ✅ Ссылки на соцсети
const SOCIAL_LINKS = {
  telegram: 'https://t.me/Loft_mens_shop',
  instagram: 'https://www.instagram.com/loft_mens_shop',
}

// ✅ Module-level кеш: переживает размонтирование ProfilePage.
// При возврате «назад» списки заказов/спецзаказов появляются мгновенно.
let profileOrdersCache: any[] | null = null
let profileChinaRequestsCache: any[] | null = null

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

function OrderDetailModal({ order, onClose, language, currency, exchangeRate, onCancelOrder, onScreenshotUploaded }: any) {
  useBodyScrollLock(true)

  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const [showScreenshotModal, setShowScreenshotModal] = useState(false)

  const formatOrderPrice = (order: any) => {
    if (order.total_price_uzs) {
      return `${Number(order.total_price_uzs).toLocaleString()} сум`
    }
    if (currency === 'USD') return `$${order.total_price_usd}`
    return `${(order.total_price_usd * exchangeRate).toLocaleString()} сум`
  }

  const formatItemPrice = (item: any) => {
    if (item.priceUzs) {
      return `${Number(item.priceUzs).toLocaleString()} сум`
    }
    if (currency === 'USD') return `$${item.priceUsd}`
    return `${(item.priceUsd * exchangeRate).toLocaleString()} сум`
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
    if (language === 'uz') {
      if (deliveryMethod === 'pickup') {
        const labels: Record<string, string> = {
          'Активный': "Qabul qilindi 📄",
          'В обработке': "Yig'ilmoqda 📦",
          'Готов': "Berishga tayyor 🎉",
          'Выдан': "Olib bo'lindi 🤝",
          'Отменён': "Bekor qilindi 🚫",
          'Ожидает оплаты': "To'lovni kutmoqda ⏳",
        }
        return labels[status] || status
      }
      const labels: Record<string, string> = {
        'Активный': "Qabul qilindi 📄",
        'В обработке': "Yig'ilmoqda 📦",
        'Готов': "Qadoqlandi 🛍️",
        'Выдан': "Kuryerga topshirildi 🚀",
        'Доставлен': "Yetkazib berildi ✅",
        'Отменён': "Bekor qilindi 🚫",
        'Ожидает оплаты': "To'lovni kutmoqda ⏳",
      }
      return labels[status] || status
    }
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
      'Активный': 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
      'В обработке': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
      'Готов': 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
      'Выдан': 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300',
      'Доставлен': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
      'Отменён': 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
      'Ожидает оплаты': 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300',
    }
    return colors[status] || 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
  }

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_DETAILS.cardNumber.replace(/\s/g, ''))
      toast.success(language === 'ru' ? 'Номер карты скопирован!' : 'Karta raqami nusxalandi!')
    } catch (error) {
      console.error('Ошибка копирования:', error)
      toast.error(language === 'ru' ? 'Не удалось скопировать' : 'Nusxalab bo\'lmadi')
    }
  }

  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingScreenshot(true)
    try {
      const screenshotUrl = await uploadPaymentScreenshot(order.id.toString(), file)
      const saved = await savePaymentScreenshot(order.id.toString(), screenshotUrl)
      if (saved) {
        toast.success(language === 'ru' ? 'Скриншот загружен!' : 'Screenshot yuklandi!')
        if (onScreenshotUploaded) onScreenshotUploaded()
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      toast.error(language === 'ru' ? 'Ошибка загрузки скриншота' : 'Screenshot yuklashda xatolik')
    } finally {
      setUploadingScreenshot(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#F5F1E8] dark:bg-dark-bg z-50 flex flex-col">
      <IslandHeader needsBack={true} onBack={onClose} />

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-[#1B2A4A] dark:text-white">
                {language === 'ru' ? `Заказ №${order.id}` : `Buyurtma №${order.id}`}
              </h2>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-1">{formatDateTime(order.created_at)}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(order.status)}`}>
              {getStatusText(order.status, order.delivery_method)}
            </span>
          </div>
          {order.special_order_id && (
            <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 text-xs rounded-full">
              🌍 {language === 'ru' ? 'Заказ из спецзаказа' : 'Maxsus buyurtmadan'}
            </span>
          )}
        </div>

        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 divide-y divide-[#E8E2D5] dark:divide-dark-border">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Phone size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Телефон' : 'Telefon'}</p>
              <p className="text-sm font-medium text-[#1B2A4A] dark:text-white">{order.client_phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              {order.delivery_method === 'pickup'
                ? <Store size={16} className="text-[#1B2A4A] dark:text-white" />
                : <Truck size={16} className="text-[#1B2A4A] dark:text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Получение' : 'Olish'}
              </p>
              <p className="text-sm font-medium text-[#1B2A4A] dark:text-white">
                {order.delivery_method === 'pickup'
                  ? (language === 'ru' ? 'Самовывоз' : "O'z-o'zini olish")
                  : (language === 'ru' ? 'Доставка' : 'Yetkazib berish')}
              </p>
              {order.delivery_method === 'pickup' ? (
                <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                  📍 {language === 'ru' ? 'ТЦ Mercato, 2 этаж, магазин 34' : 'Mercato savdo markazi, 2-qavat, 34-do\'kon'}
                </p>
              ) : order.delivery_address ? (
                <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">📍 {order.delivery_address}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <CreditCard size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8A8275] dark:text-gray-300">{language === 'ru' ? 'Оплата' : 'To\'lov'}</p>
              <p className="text-sm font-medium text-[#1B2A4A] dark:text-white">
                {order.payment_method === 'online_card'
                  ? (language === 'ru' ? 'Переводом' : 'Pul o\'tkazish')
                  : (language === 'ru' ? 'При получении' : 'Olganda to\'lash')}
              </p>
            </div>
          </div>
        </div>

        {order.delivery_method === 'delivery' && order.courier_link && (
          <a
            href={order.courier_link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors mb-3"
          >
            🚚 {language === 'ru' ? 'Отследить курьера' : 'Kuryerni kuzatish'}
          </a>
        )}

        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-3 mb-3">
          <h3 className="font-bold text-[#1B2A4A] dark:text-white mb-2 px-1">
            {language === 'ru' ? 'Товары' : 'Mahsulotlar'}
          </h3>
          <div className="space-y-2">
            {items.map((item: any, index: number) => (
              <div key={index} className="bg-[#F5F1E8] dark:bg-dark-accent p-3 rounded-xl flex gap-3 border border-[#E8E2D5] dark:border-dark-border">
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[#1B2A4A] dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                    {language === 'ru' ? 'Размер:' : 'O\'lcham:'} {item.size} · {language === 'ru' ? 'Кол-во:' : 'Miqdor:'} {item.quantity}
                  </p>
                  <p className="font-bold text-sm text-[#1B2A4A] dark:text-white mt-1">
                    {formatItemPrice(item)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#E8E2D5] dark:border-dark-border mt-3 pt-3 flex justify-between items-center px-1">
            <span className="font-bold text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? 'Итого:' : 'Jami:'}
            </span>
            <span className="text-xl font-bold text-[#1B2A4A] dark:text-white">
              {formatOrderPrice(order)}
            </span>
          </div>
        </div>

        {order.payment_method === 'online_card' && (
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? '💳 Оплата заказа' : "💳 Buyurtmani to'lash"}
            </h3>

            {order.status === 'Отменён' ? (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-4">
                <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-2">
                  🚫 {language === 'ru' ? 'Заказ отменён' : 'Buyurtma bekor qilindi'}
                </p>
                <p className="text-xs text-red-700 dark:text-red-400">
                  {language === 'ru'
                    ? 'Оплата не требуется. Если были списаны средства, свяжитесь с менеджером для возврата.'
                    : "To'lov talab qilinmaydi. Agar mablag'lar yechib olingan bo'lsa, qaytarish uchun menejer bilan bog'laning."}
                </p>
                {order.payment_screenshot_url && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-500/30">
                    <p className="text-xs text-red-700 dark:text-red-400 mb-2">
                      {language === 'ru' ? '📸 Скриншот оплаты:' : "📸 To'lov screenshoti:"}
                    </p>
                    <button
                      onClick={() => setShowScreenshotModal(true)}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium flex items-center gap-1"
                    >
                      <Eye size={16} />
                      {language === 'ru' ? 'Посмотреть скриншот' : 'Screenshotni ko\'rish'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-2xl overflow-hidden shadow-md">
                  <div className="bg-gradient-to-br from-[#1B2A4A] to-[#142038] dark:from-dark-accent dark:to-dark-card p-4 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] text-[#C9A961] font-semibold tracking-widest">LOFT STORE</span>
                      <CreditCard size={18} className="text-[#C9A961]" />
                    </div>
                    <p className="text-base font-bold tracking-widest mb-3">{PAYMENT_DETAILS.cardNumber}</p>
                    <span className="text-xs text-[#C9A961] font-medium">{PAYMENT_DETAILS.cardHolder}</span>
                  </div>
                  <button
                    onClick={handleCopyCard}
                    className="w-full bg-[#FBF9F4] dark:bg-dark-card border border-t-0 border-[#E8E2D5] dark:border-dark-border py-2.5 text-xs font-medium text-[#1B2A4A] dark:text-white flex items-center justify-center gap-2 hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors"
                  >
                    <Copy size={14} />
                    {language === 'ru' ? 'Скопировать номер карты' : 'Karta raqamini nusxalash'}
                  </button>
                </div>

                <div className="bg-[#FBF9F4] dark:bg-dark-card p-4 rounded-2xl border border-[#E8E2D5] dark:border-dark-border">
                  <p className="text-lg font-bold text-[#1B2A4A] dark:text-white">
                    {language === 'ru' ? '💰 Сумма:' : "💰 Summa:"} {formatOrderPrice(order)}
                  </p>
                </div>

                {!order.payment_screenshot_url ? (
                  <div>
                    <p className="text-sm font-medium mb-2 text-[#1B2A4A] dark:text-white">
                      {language === 'ru' ? '📸 Загрузите скриншот оплаты:' : "📸 To'lov screenshotini yuklang:"}
                    </p>
                    <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                      uploadingScreenshot
                        ? 'border-[#1B2A4A] dark:border-gold bg-[#F5F1E8] dark:bg-dark-accent'
                        : 'border-[#E8E2D5] dark:border-dark-border hover:border-[#1B2A4A] dark:hover:border-gold'
                    }`}>
                      <div className="flex flex-col items-center justify-center">
                        {uploadingScreenshot ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1B2A4A] dark:border-gold mb-2"></div>
                        ) : (
                          <Upload className="w-6 h-6 mb-2 text-[#8A8275] dark:text-gray-300" />
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
                  </div>
                ) : (
                  <div className="relative bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-2xl p-3.5">
                    <p className="text-sm text-green-800 dark:text-green-300 font-medium text-center pr-12">
                      ✅ {language === 'ru' ? 'Скриншот загружен' : 'Screenshot yuklandi'}
                    </p>
                    <button
                      onClick={() => setShowScreenshotModal(true)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white dark:bg-dark-accent border border-green-200 dark:border-green-500/30 flex items-center justify-center text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-dark-border transition-colors"
                      title={language === 'ru' ? 'Посмотреть скриншот' : 'Screenshotni ko\'rish'}
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                )}

                {order.status === 'Ожидает оплаты' && (
                  <>
                    <a
                      href={MANAGER_TELEGRAM_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors"
                    >
                      <MessageCircle size={20} />
                      {language === 'ru' ? 'Написать менеджеру' : 'Menejerga yozish'}
                    </a>
                    <button
                      onClick={() => onCancelOrder(order)}
                      className="w-full bg-[#9B3B3B] dark:bg-red-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
                    >
                      <X size={20} />
                      {language === 'ru' ? 'Отменить заказ' : 'Buyurtmani bekor qilish'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showScreenshotModal && order.payment_screenshot_url && (
        <ScreenshotViewer
          url={order.payment_screenshot_url}
          language={language}
          onClose={() => setShowScreenshotModal(false)}
        />
      )}
    </div>
  )
}

function ScreenshotViewer({ url, language, onClose }: { url: string; language: string; onClose: () => void }) {
  useBodyScrollLock(true)
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 flex items-center gap-2 text-lg font-medium z-10"
        >
          <X size={24} />
          {language === 'ru' ? 'Закрыть' : 'Yopish'}
        </button>
        <img
          src={url}
          alt="Screenshot"
          className="w-full h-auto rounded-lg object-contain"
          style={{ maxHeight: '80vh' }}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="mt-4 flex justify-center">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-white dark:bg-dark-card text-[#1B2A4A] dark:text-white rounded-lg font-bold hover:bg-gray-100 dark:hover:bg-dark-accent transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            📥 {language === 'ru' ? 'Открыть в новой вкладке' : 'Yangi oynada ochish'}
          </a>
        </div>
      </div>
    </div>
  )
}

function ChinaRequestDetailModal({ request, onClose, language, onAccept, exchangeRate }: any) {
  useBodyScrollLock(true)

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
    if (language === 'uz') {
      const labels: Record<string, string> = {
        'На рассмотрении': "Qabul qilindi 📄",
        'Оценён': "Baholandi 💎",
        'Оплачен': "To'landi ✅",
        'Отменён клиентом': "Siz bekor qildingiz 🙅‍♂️",
        'Отклонён': "Rad etildi 🛑",
      }
      return labels[status] || status
    }
    const labels: Record<string, string> = {
      'На рассмотрении': 'Принят 📄',
      'Оценён': 'Оценён 💎',
      'Оплачен': 'Оплачен ✅',
      'Отменён клиентом': 'Отменён вами 🙅️',
      'Отклонён': 'Отклонён 🛑',
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'На рассмотрении': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
      'Оценён': 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300',
      'Оплачен': 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
      'Отменён клиентом': 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300',
      'Отклонён': 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300'
  }

  const priceInSums = request.manager_price ? Math.round(request.manager_price * (exchangeRate || 12100)) : 0

  return (
    <div className="fixed inset-0 bg-[#F5F1E8] dark:bg-dark-bg z-50 flex flex-col">
      <IslandHeader needsBack={true} onBack={onClose} />
      
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <h2 className="text-2xl font-bold mb-4 text-[#1B2A4A] dark:text-white">
          {language === 'ru' ? 'Детали спецзаказа' : 'Maxsus buyurtma tafsilotlari'}
        </h2>
        <div className="space-y-4">
          <div className="bg-[#FBF9F4] dark:bg-dark-card p-3 rounded-lg border border-[#E8E2D5] dark:border-dark-border">
            <p className="text-sm text-[#8A8275] dark:text-gray-300">
              {language === 'ru' ? 'Спецзаказ №' : 'Maxsus buyurtma №'}{request.id}
            </p>
            <p className="text-sm text-[#8A8275] dark:text-gray-300">
              {formatDateTime(request.created_at)}
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? 'Название или ссылка на товар' : 'Mahsulot nomi yoki havolasi'}
            </h3>
            {request.link?.startsWith('http') ? (
              <a href={request.link} target="_blank" rel="noopener noreferrer" className="text-sm text-[#1B2A4A] dark:text-white hover:underline break-all">
                {request.link}
              </a>
            ) : (
              <p className="text-sm text-[#8A8275] dark:text-gray-300">{request.link}</p>
            )}
          </div>
          {request.size_color && (
            <div>
              <h3 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
                {language === 'ru' ? 'Размер / Цвет' : "O'lcham / Rang"}
              </h3>
              <p className="text-sm text-[#8A8275] dark:text-gray-300">{request.size_color}</p>
            </div>
          )}
          {request.comment && (
            <div>
              <h3 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
                {language === 'ru' ? 'Комментарий' : 'Izoh'}
              </h3>
              <p className="text-sm text-[#8A8275] dark:text-gray-300">{request.comment}</p>
            </div>
          )}
          {request.image_url && (
            <div>
              <h3 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
                {language === 'ru' ? 'Фото товара' : 'Mahsulot fotosurati'}
              </h3>
              <img src={request.image_url} alt="Product" className="w-full rounded-lg" />
            </div>
          )}
          {request.manager_price && (
            <div className="bg-purple-50 dark:bg-purple-500/10 p-4 rounded-lg border border-purple-200 dark:border-purple-500/30">
              <p className="text-lg font-bold text-purple-900 dark:text-purple-200 mb-1">
                💰 {language === 'ru' ? 'Итого:' : 'Jami:'} {priceInSums.toLocaleString()} сум
              </p>
              {request.manager_comment && (
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  {request.manager_comment}
                </p>
              )}
            </div>
          )}
          <div className="mb-8">
            <h3 className="font-bold mb-3 text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? 'Статус' : 'Holat'}
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                {getStatusText(request.status)}
              </span>
              {request.status === 'Оценён' && request.manager_price && (
                <button
                  onClick={() => onAccept(request)}
                  className="bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] px-6 py-2.5 rounded-lg font-bold hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors whitespace-nowrap flex-1 sm:flex-none"
                >
                  💳 {language === 'ru'
                    ? `Оплатить ${priceInSums.toLocaleString()} сум`
                    : `To'lash ${priceInSums.toLocaleString()} so'm`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ✅ Тип контекста из AppLayout
interface OutletContextType {
  showBackButton: boolean
  setShowBackButton: (show: boolean) => void
  onBackClick: (() => void) | null
  setOnBackClick: (fn: (() => void) | null) => void
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const telegramUser = useStore((state) => state.telegramUser)
  const { setShowBackButton, setOnBackClick } = useOutletContext<OutletContextType>()

  const { language, currency, exchangeRate, setLanguage, setCurrency, addToCart, favorites, removeFromFavorites, saleModeEnabled, theme, setTheme } = useStore()

  // ✅ СОСТОЯНИЕ ТЕПЕРЬ В URL:
  //   /profile                              → главное меню
  //   /profile?section=favorites            → избранное
  //   /profile?section=orders               → список заказов
  //   /profile?section=orders&order=<id>    → модалка заказа
  //   /profile?section=china                → список спецзаказов
  //   /profile?section=china&request=<id>   → модалка спецзаказа
  const section = searchParams.get('section') as 'main' | 'orders' | 'china' | 'favorites' | null
  const orderIdParam = searchParams.get('order')
  const requestIdParam = searchParams.get('request')

  // ✅ Кеш списков — мгновенный рендер при возврате
  const [orders, setOrders] = useState<any[]>(() => profileOrdersCache || [])
  const [chinaRequests, setChinaRequests] = useState<any[]>(() => profileChinaRequestsCache || [])
  const [loading, setLoading] = useState(false)
  const [allProducts, setAllProducts] = useState<any[]>([])

  // ✅ Загружаем список товаров для отображения избранного
  useEffect(() => {
    getProducts().then(setAllProducts)
  }, [])

  // ✅ Автозагрузка заказов при открытии section=orders
  useEffect(() => {
    if (section === 'orders') {
      loadOrders()
    } else if (section === 'china') {
      loadChinaRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // ✅ Показываем стрелку в ЕДИНСТВЕННОМ острове AppLayout, когда открыт подраздел
  useEffect(() => {
    const hasSubView = !!section && section !== 'main'

    if (hasSubView) {
      setShowBackButton(true)
      setOnBackClick(() => () => {
        const idx = (window.history.state as any)?.idx
        if (typeof idx === 'number' && idx > 0) navigate(-1)
        else navigate('/profile')
      })
    } else {
      setShowBackButton(false)
      setOnBackClick(null)
    }

    return () => {
      setShowBackButton(false)
      setOnBackClick(null)
    }
  }, [section, navigate, setShowBackButton, setOnBackClick])

  const getItemsLabel = (count: number, lang: 'ru' | 'uz'): string => {
    if (lang === 'uz') {
      return 'ta mahsulot'
    }
    const lastTwo = count % 100
    const lastOne = count % 10
    if (lastTwo >= 11 && lastTwo <= 19) return 'товаров'
    if (lastOne === 1) return 'товар'
    if (lastOne >= 2 && lastOne <= 4) return 'товара'
    return 'товаров'
  }

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const openSection = (name: 'favorites' | 'orders' | 'china') => {
    navigate(`/profile?section=${name}`)
  }

  const openOrder = (orderId: string | number) => {
    navigate(`/profile?section=orders&order=${orderId}`)
  }

  const openChinaRequest = (requestId: string | number) => {
    navigate(`/profile?section=china&request=${requestId}`)
  }

  const formatOrderPrice = (order: any) => {
    if (order.total_price_uzs) {
      return `${Number(order.total_price_uzs).toLocaleString()} сум`
    }
    if (currency === 'USD') return `$${order.total_price_usd}`
    return `${(order.total_price_usd * exchangeRate).toLocaleString()} сум`
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
    if (language === 'uz') {
      if (deliveryMethod === 'pickup') {
        const labels: Record<string, string> = {
          'Активный': "Qabul qilindi 📄",
          'В обработке': "Yig'ilmoqda 📦",
          'Готов': "Berishga tayyor 🎉",
          'Выдан': "Olab bo'lindi 🤝",
          'Отменён': "Bekor qilindi 🚫",
          'Ожидает оплаты': "To'lovni kutmoqda ⏳",
        }
        return labels[status] || status
      }
      const labels: Record<string, string> = {
        'Активный': "Qabul qilindi 📄",
        'В обработке': "Yig'ilmoqda 📦",
        'Готов': "Qadoqlandi 🛍️",
        'Выдан': "Kuryerga topshirildi 🚀",
        'Доставлен': "Yetkazib berildi ✅",
        'Отменён': "Bekor qilindi 🚫",
        'Ожидает оплаты': "To'lovni kutmoqda ⏳",
      }
      return labels[status] || status
    }
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
      'Активный': 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
      'В обработке': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
      'Готов': 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
      'Выдан': 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300',
      'Доставлен': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
      'Отменён': 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
      'Ожидает оплаты': 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300',
    }
    return colors[status] || 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
  }

  const getChinaStatusText = (status: string) => {
    if (language === 'uz') {
      const labels: Record<string, string> = {
        'На рассмотрении': "Qabul qilindi 📄",
        'Оценён': "Baholandi 💎",
        'Оплачен': "To'landi ✅",
        'Отменён клиентом': "Siz bekor qildingiz 🙅️",
        'Отклонён': "Rad etildi 🛑",
      }
      return labels[status] || status
    }
    const labels: Record<string, string> = {
      'На рассмотрении': 'Принят 📄',
      'Оценён': 'Оценён 💎',
      'Оплачен': 'Оплачен ✅',
      'Отменён клиентом': 'Отменён вами 🙅️',
      'Отклонён': 'Отклонён 🛑',
    }
    return labels[status] || status
  }

  const getChinaStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'На рассмотрении': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
      'Оценён': 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300',
      'Оплачен': 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
      'Отменён клиентом': 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300',
      'Отклонён': 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300'
  }

  const loadOrders = async () => {
    if (profileOrdersCache) {
      setOrders(profileOrdersCache)
      return
    }
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
      const items = data || []
      profileOrdersCache = items
      setOrders(items)
    }
    setLoading(false)
  }

  const loadChinaRequests = async () => {
    if (profileChinaRequestsCache) {
      setChinaRequests(profileChinaRequestsCache)
      return
    }
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
      const items = data || []
      profileChinaRequestsCache = items
      setChinaRequests(items)
    }
    setLoading(false)
  }

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
        profileOrdersCache = null
        await loadOrders()
        navigate(-1)
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
    toast.success(
      language === 'ru'
        ? 'Спецзаказ добавлен в корзину! Перейдите в корзину для оформления.'
        : 'Maxsus buyurtma savatga qo\'shildi! Savatga o\'ting.'
    )
    navigate(-1)
  }

  const handleScreenshotUploaded = (order: any) => {
    const updated = { ...order, payment_screenshot_url: 'uploaded' }
    const newOrders = orders.map(o => o.id === order.id ? updated : o)
    profileOrdersCache = newOrders
    setOrders(newOrders)
  }

  // ✅ Находим конкретный заказ/спецзаказ по id из URL
  const selectedOrder = orderIdParam
    ? orders.find(o => String(o.id) === String(orderIdParam))
    : null
  const selectedChinaRequest = requestIdParam
    ? chinaRequests.find(r => String(r.id) === String(requestIdParam))
    : null

  // ✅ РАЗДЕЛ MAIN (главное меню профиля)
  if (!section || section === 'main') {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
        <div className="p-4">
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-6 mb-6 text-center border border-[#E8E2D5] dark:border-dark-border">
            {telegramUser?.photoUrl ? (
              <img
                src={telegramUser.photoUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-[#E8E2D5] dark:bg-dark-accent rounded-full mx-auto mb-3 flex items-center justify-center">
                <User size={40} className="text-[#8A8275] dark:text-gray-300" />
              </div>
            )}
            <h2 className="text-xl font-bold mb-1 text-[#1B2A4A] dark:text-white">
              {telegramUser
                ? `${telegramUser.firstName} ${telegramUser.lastName || ''}`.trim()
                : (language === 'ru' ? 'Гость' : 'Mehmon')}
            </h2>
            {telegramUser?.username ? (
              <p className="text-sm text-[#8A8275] dark:text-gray-300">@{telegramUser.username}</p>
            ) : (
              <p className="text-sm text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Войдите через Telegram' : 'Telegram orqali kiring'}
              </p>
            )}
          </div>

          <h3 className="text-lg font-bold mb-3 text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? 'Избранное' : 'Sevimlilar'}
          </h3>
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-xl overflow-hidden mb-6 border border-[#E8E2D5] dark:border-dark-border">
            <button
              onClick={() => openSection('favorites')}
              className="flex items-center justify-between w-full p-4 hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Heart size={20} className="text-[#8A8275] dark:text-gray-300" />
                <span className="font-medium text-[#1B2A4A] dark:text-white">
                  {language === 'ru' ? 'Мои избранные товары' : 'Mening sevimli mahsulotlarim'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {favorites.length > 0 && (
                  <span className="text-sm text-[#8A8275] dark:text-gray-300">
                    {favorites.length} {getItemsLabel(favorites.length, language)}
                  </span>
                )}
                <ChevronRight size={20} className="text-[#8A8275] dark:text-gray-300" />
              </div>
            </button>
          </div>

          <h3 className="text-lg font-bold mb-3 text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? 'Мои заказы' : 'Mening buyurtmalarim'}
          </h3>
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-xl overflow-hidden mb-6 border border-[#E8E2D5] dark:border-dark-border">
            <button
              onClick={() => openSection('orders')}
              className="flex items-center justify-between w-full p-4 border-b border-[#E8E2D5] dark:border-dark-border hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package size={20} className="text-[#8A8275] dark:text-gray-300" />
                <span className="font-medium text-[#1B2A4A] dark:text-white">
                  {language === 'ru' ? 'История заказов' : 'Buyurtmalar tarixi'}
                </span>
              </div>
              <ChevronRight size={20} className="text-[#8A8275] dark:text-gray-300" />
            </button>
            <button
              onClick={() => openSection('china')}
              className="flex items-center justify-between w-full p-4 hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-[#8A8275] dark:text-gray-300" />
                <span className="font-medium text-[#1B2A4A] dark:text-white">
                  {language === 'ru' ? 'Мои спецзаказы' : 'Maxsus buyurtmalarim'}
                </span>
              </div>
              <ChevronRight size={20} className="text-[#8A8275] dark:text-gray-300" />
            </button>
          </div>

          <h3 className="text-lg font-bold mb-3 text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? 'Настройки' : 'Sozlamalar'}
          </h3>
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-xl overflow-hidden mb-6 border border-[#E8E2D5] dark:border-dark-border">
            <div className="flex items-center justify-between p-4 border-b border-[#E8E2D5] dark:border-dark-border">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-[#8A8275] dark:text-gray-300" />
                <span className="font-medium text-[#1B2A4A] dark:text-white">
                  {language === 'ru' ? 'Язык' : 'Til'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage('ru')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    language === 'ru'
                      ? 'bg-[#1B2A4A] text-white dark:bg-gold dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] text-[#8A8275] dark:bg-dark-accent dark:text-gray-300'
                  }`}
                >
                  RU
                </button>
                <button
                  onClick={() => setLanguage('uz')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    language === 'uz'
                      ? 'bg-[#1B2A4A] text-white dark:bg-gold dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] text-[#8A8275] dark:bg-dark-accent dark:text-gray-300'
                  }`}
                >
                  UZ
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-[#E8E2D5] dark:border-dark-border">
              <div className="flex items-center gap-3">
                <DollarSign size={20} className="text-[#8A8275] dark:text-gray-300" />
                <span className="font-medium text-[#1B2A4A] dark:text-white">
                  {language === 'ru' ? 'Валюта' : 'Valyuta'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    currency === 'USD'
                      ? 'bg-[#1B2A4A] text-white dark:bg-gold dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] text-[#8A8275] dark:bg-dark-accent dark:text-gray-300'
                  }`}
                >
                  USD
                </button>
                <button
                  onClick={() => setCurrency('UZS')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    currency === 'UZS'
                      ? 'bg-[#1B2A4A] text-white dark:bg-gold dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] text-[#8A8275] dark:bg-dark-accent dark:text-gray-300'
                  }`}
                >
                  UZS
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Monitor size={20} className="text-[#8A8275] dark:text-gray-300" />
                <span className="font-medium text-[#1B2A4A] dark:text-white">
                  {language === 'ru' ? 'Тема' : 'Mavzu'}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setTheme('light')}
                  title={language === 'ru' ? 'Светлая' : 'Yorug\''}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'light'
                      ? 'bg-[#1B2A4A] text-white dark:bg-gold dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] text-[#8A8275] hover:text-[#1B2A4A] dark:bg-dark-accent dark:text-gray-300 dark:hover:text-gold'
                  }`}
                >
                  <Sun size={18} />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  title={language === 'ru' ? 'Тёмная' : 'Qorong\'u'}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-[#1B2A4A] text-white dark:bg-gold dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] text-[#8A8275] hover:text-[#1B2A4A] dark:bg-dark-accent dark:text-gray-300 dark:hover:text-gold'
                  }`}
                >
                  <Moon size={18} />
                </button>
                <button
                  onClick={() => setTheme('system')}
                  title={language === 'ru' ? 'Системная' : 'Tizim'}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'system'
                      ? 'bg-[#1B2A4A] text-white dark:bg-gold dark:text-[#1B2A4A]'
                      : 'bg-[#E8E2D5] text-[#8A8275] hover:text-[#1B2A4A] dark:bg-dark-accent dark:text-gray-300 dark:hover:text-gold'
                  }`}
                >
                  <Monitor size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-[#FBF9F4] dark:bg-dark-card rounded-xl p-4 border border-[#E8E2D5] dark:border-dark-border">
            <h4 className="font-bold mb-2 text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? '📍 Наш магазин' : '📍 Bizning do\'kon'}
            </h4>
            <p className="text-sm text-[#8A8275] dark:text-gray-300 mb-1">
              {language === 'ru' ? 'ТЦ Mercato' : 'Mercato savdo markazi'}
            </p>
            <p className="text-sm text-[#8A8275] dark:text-gray-300 mb-1">
              {language === 'ru' ? '2 этаж, магазин 34' : '2-qavat, 34-do\'kon'}
            </p>
            <p className="text-sm text-[#8A8275] dark:text-gray-300 mb-1">📞 +998 93 378 87 70</p>
            <p className="text-sm text-[#8A8275] dark:text-gray-300">
              🕐 {language === 'ru' ? 'Ежедневно 10:00 - 20:00' : 'Har kuni 10:00 - 20:00'}
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-bold mb-3 text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? 'Мы в соцсетях' : 'Biz ijtimoiy tarmoqlarda'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={SOCIAL_LINKS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#FBF9F4] dark:bg-dark-card rounded-xl p-4 border border-[#E8E2D5] dark:border-dark-border hover:shadow-md hover:border-[#229ED9] transition-all flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#229ED9] to-[#1B7FB8] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </div>
                <span className="font-medium text-sm text-[#1B2A4A] dark:text-white">Telegram</span>
                <span className="text-xs text-[#8A8275] dark:text-gray-300">@loft_mens_shop</span>
              </a>

              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#FBF9F4] dark:bg-dark-card rounded-xl p-4 border border-[#E8E2D5] dark:border-dark-border hover:shadow-md hover:border-[#E1306C] transition-all flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <span className="font-medium text-sm text-[#1B2A4A] dark:text-white">Instagram</span>
                <span className="text-xs text-[#8A8275] dark:text-gray-300">@loft_mens_shop</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ✅ РАЗДЕЛ FAVORITES (остров AppLayout со стрелкой, свой остров НЕ рисуем)
  if (section === 'favorites') {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
        <div className="p-4 pb-20">
          <h2 className="text-2xl font-bold mb-4 text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? 'Избранное' : 'Sevimlilar'}
          </h2>

          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
              <Heart size={64} className="text-[#E8E2D5] dark:text-dark-border mb-4" />
              <p className="text-[#8A8275] dark:text-gray-300 px-4">
                {language === 'ru'
                  ? 'Добавляйте товары в избранное, чтобы не потерять их'
                  : 'Mahsulotlarni yo\'qotib qo\'ymaslik uchun sevimlilarga qo\'shing'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {favorites.map((item) => {
                const product = allProducts.find(p => p.id === item.productId)
                const onSale = product ? isProductOnSale(product, saleModeEnabled) : false
                const displayPrice = onSale ? Number(product.sale_price) : item.priceUsd
                return (
                  <div key={item.productId} className="bg-[#FBF9F4] dark:bg-dark-card rounded-xl overflow-hidden shadow-sm border border-[#E8E2D5] dark:border-dark-border">
                    <Link to={`/product/${item.productId}`}>
                      <div className="aspect-square bg-[#F5F1E8] dark:bg-dark-accent">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>
                    <div className="p-3">
                      <Link to={`/product/${item.productId}`}>
                        <p className="text-sm font-medium truncate mb-2 text-[#1B2A4A] dark:text-white">
                          {item.name}
                        </p>
                      </Link>
                      <div className="flex items-center justify-between">
                        <div>
                          {onSale && (
                            <p className="text-[#8A8275] dark:text-gray-500 text-xs line-through">
                              {formatPrice(item.priceUsd)}
                            </p>
                          )}
                          <p className={`font-bold ${onSale ? 'text-[#9B3B3B] dark:text-red-400' : 'text-[#1B2A4A] dark:text-white'}`}>
                            {formatPrice(displayPrice)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromFavorites(item.productId)}
                          className="text-[#9B3B3B] dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ✅ РАЗДЕЛ ORDERS (+ модалка заказа, если есть order=<id>)
  if (section === 'orders') {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4 text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? 'История заказов' : 'Buyurtmalar tarixi'}
          </h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2A4A] dark:border-gold mx-auto mb-4"></div>
              <p className="text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package size={64} className="text-[#E8E2D5] dark:text-dark-border mx-auto mb-4" />
              <p className="text-[#8A8275] dark:text-gray-300">
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
                    onClick={() => openOrder(order.id)}
                    className="bg-[#FBF9F4] dark:bg-dark-card rounded-xl p-4 shadow-sm border border-[#E8E2D5] dark:border-dark-border cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-[#1B2A4A] dark:text-white">
                          {language === 'ru' ? `Заказ №${order.id}` : `Buyurtma №${order.id}`}
                        </p>
                        <p className="text-sm text-[#8A8275] dark:text-gray-300">
                          {formatDateTime(order.created_at)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                        {getOrderStatusText(order.status, order.delivery_method)}
                      </span>
                    </div>
                    {order.special_order_id && (
                      <div className="mb-2 px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 text-xs rounded-full inline-block">
                        🌍 {language === 'ru' ? 'Спецзаказ' : 'Maxsus buyurtma'}
                      </div>
                    )}
                    <div className="flex gap-1 mb-3">
                      {items.slice(0, 2).map((item: any, idx: number) => (
                        <img
                          key={idx}
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded border border-[#E8E2D5] dark:border-dark-border"
                        />
                      ))}
                      {items.length > 2 && (
                        <div className="relative w-12 h-12 rounded border border-[#E8E2D5] dark:border-dark-border overflow-hidden bg-[#F5F1E8] dark:bg-dark-accent">
                          <img
                            src={items[2].image}
                            alt="more"
                            className="w-full h-full object-cover blur-sm opacity-50"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[#8A8275] dark:text-gray-300 text-xs font-bold">+{items.length - 2}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-lg font-bold text-[#1B2A4A] dark:text-white">
                      {formatOrderPrice(order)}
                    </p>
                    <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-1">
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
              onClose={() => navigate(-1)}
              language={language}
              currency={currency}
              exchangeRate={exchangeRate}
              onCancelOrder={handleCancelOrder}
              onScreenshotUploaded={() => handleScreenshotUploaded(selectedOrder)}
            />
          )}
        </div>
      </div>
    )
  }

  // ✅ РАЗДЕЛ CHINA (+ модалка спецзаказа, если есть request=<id>)
  if (section === 'china') {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-20">
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4 text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? 'Мои спецзаказы' : 'Maxsus buyurtmalarim'}
          </h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2A4A] dark:border-gold mx-auto mb-4"></div>
              <p className="text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
              </p>
            </div>
          ) : chinaRequests.length === 0 ? (
            <div className="text-center py-12">
              <Globe size={64} className="text-[#E8E2D5] dark:text-dark-border mx-auto mb-4" />
              <p className="text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'У вас нет спецзаказов' : 'Sizda maxsus buyurtmalar yo\'q'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {chinaRequests.map((request) => {
                const priceInSums = request.manager_price ? Math.round(request.manager_price * exchangeRate) : 0
                return (
                  <div
                    key={request.id}
                    onClick={() => openChinaRequest(request.id)}
                    className="bg-[#FBF9F4] dark:bg-dark-card rounded-xl p-4 shadow-sm border border-[#E8E2D5] dark:border-dark-border cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-[#1B2A4A] dark:text-white">
                          {language === 'ru' ? `Спецзаказ #${request.id}` : `Maxsus buyurtma #${request.id}`}
                        </p>
                        <p className="text-sm text-[#8A8275] dark:text-gray-300">
                          {formatDateTime(request.created_at)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getChinaStatusColor(request.status)}`}>
                        {getChinaStatusText(request.status)}
                      </span>
                    </div>
                    <p className="text-sm text-[#8A8275] dark:text-gray-300 truncate">{request.link}</p>
                    {request.manager_price && (
                      <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mt-1">
                        💰 {language === 'ru' ? 'Оценка:' : 'Baho:'} {priceInSums.toLocaleString()} сум
                      </p>
                    )}
                    <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-1">
                      {language === 'ru' ? 'Нажмите для деталей' : 'Tafsilotlar uchun bosing'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
          {selectedChinaRequest && (
            <ChinaRequestDetailModal
              request={selectedChinaRequest}
              onClose={() => navigate(-1)}
              language={language}
              exchangeRate={exchangeRate}
              onAccept={handleAcceptSpecialOrder}
            />
          )}
        </div>
      </div>
    )
  }

  return null
}