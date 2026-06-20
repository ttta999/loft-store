import { supabase } from './supabase'

interface PaymentData {
  orderId: string
  amount: number
  description: string
}

// Функция для создания платежа через Telegram + CLICK
export const createPayment = async (paymentData: PaymentData): Promise<boolean> => {
  // ✅ Правильное получение Telegram WebApp
  const tg = (window as any).Telegram?.WebApp
  
  if (!tg) {
    console.error('❌ Telegram WebApp не найден!')
    throw new Error('Telegram WebApp не доступен. Откройте приложение в Telegram.')
  }

  const providerToken = import.meta.env.VITE_CLICK_PROVIDER_TOKEN
  
  console.log('🔑 Provider token:', providerToken ? '✅ Найден' : '❌ Не найден')
  console.log('📦 Payment data:', paymentData)
  
  if (!providerToken) {
    console.error('❌ Provider token не найден в .env!')
    throw new Error('Ошибка конфигурации платежей. Обратитесь к администратору.')
  }

  // Подготовка данных для платежа
  const invoiceData = {
    title: 'LOFT Store - Оплата заказа',
    description: paymentData.description,
    payload: JSON.stringify({ 
      orderId: paymentData.orderId,
      type: 'order_payment',
      timestamp: Date.now()
    }),
    provider_token: providerToken,
    currency: 'UZS',
    prices: [
      { 
        label: 'Сумма заказа', 
        amount: Math.round(paymentData.amount * 100) // Конвертируем в тийины (1 сум = 100 тийин)
      }
    ],
    start_parameter: 'loft_pay_' + paymentData.orderId,
    need_name: false,
    need_phone_number: false,
    need_email: false,
    need_shipping_address: false,
    is_flexible: false,
  }

  console.log('📤 Отправляем invoice:', JSON.stringify(invoiceData, null, 2))

  // ✅ Правильный вызов sendInvoice
  try {
    // Проверяем существует ли метод
    if (typeof tg.sendInvoice !== 'function') {
      console.error('❌ tg.sendInvoice не является функцией!')
      console.log('Доступные методы tg:', Object.keys(tg))
      throw new Error('Метод sendInvoice недоступен. Обновите Telegram.')
    }

    // Вызываем sendInvoice
    tg.sendInvoice(invoiceData)
    console.log('✅ Invoice отправлен успешно')
    return true
  } catch (error: any) {
    console.error('❌ Ошибка отправки invoice:', error)
    throw new Error('Не удалось открыть окно оплаты: ' + (error.message || error))
  }
}

// Обработка успешной оплаты
export const handlePaymentSuccess = async (orderId: string) => {
  try {
    // Обновляем статус заказа на "Активный" только после оплаты
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'Активный', // ✅ Меняем на "Активный"
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        payment_provider: 'click'
      })
      .eq('id', orderId)

    if (error) throw error

    console.log('✅ Заказ оплачен:', orderId)
    return true
  } catch (error) {
    console.error('Ошибка обновления заказа:', error)
    return false
  }
}

// Отмена заказа
export const cancelOrder = async (orderId: string) => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'Отменён',
        payment_status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) throw error

    console.log('❌ Заказ отменён:', orderId)
    return true
  } catch (error) {
    console.error('Ошибка отмены заказа:', error)
    return false
  }
}

// Инициализация обработчиков платежей
export const initPaymentHandlers = (
  onSuccess?: (orderId: string) => void, 
  onCancel?: (orderId: string) => void
) => {
  const tg = (window as any).Telegram?.WebApp
  
  if (!tg) {
    console.warn('⚠️ Telegram WebApp не найден, обработчики не инициализированы')
    return
  }

  // Обработка закрытия invoice
  tg.onEvent('invoiceClosed', (invoice: any) => {
    console.log('📄 Invoice closed:', invoice)
    
    if (invoice.status === 'paid') {
      // Оплата прошла успешно
      const payload = JSON.parse(invoice.payload || '{}')
      if (payload.orderId) {
        handlePaymentSuccess(payload.orderId)
        if (onSuccess) onSuccess(payload.orderId)
      }
    } else if (invoice.status === 'cancelled' || invoice.status === 'failed') {
      // Оплата отменена
      const payload = JSON.parse(invoice.payload || '{}')
      if (payload.orderId) {
        if (onCancel) onCancel(payload.orderId)
      }
    }
  })

  console.log('✅ Payment handlers initialized')
}