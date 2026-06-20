import { supabase } from './supabase'

interface PaymentData {
  orderId: string
  amount: number
  description: string
}

// Функция для создания платежа через Telegram + CLICK
export const createPayment = async (paymentData: PaymentData) => {
  const tg = (window as any).Telegram?.WebApp
  
  if (!tg) {
    console.error('❌ Telegram WebApp не найден!')
    alert('Telegram WebApp не доступен')
    return
  }

  const providerToken = import.meta.env.VITE_CLICK_PROVIDER_TOKEN
  
  console.log('🔑 Provider token:', providerToken ? '✅ Найден' : '❌ Не найден')
  console.log('📦 Payment data:', paymentData)
  
  if (!providerToken) {
    console.error('❌ Provider token не найден в .env!')
    alert('Ошибка конфигурации платежей. Проверь .env файл')
    return
  }

  // Подготовка данных для платежа
  const invoiceData = {
    title: 'LOFT Store - Оплата заказа',
    description: paymentData.description,
    payload: JSON.stringify({ 
      orderId: paymentData.orderId,
      type: 'order_payment'
    }),
    provider_token: providerToken,
    currency: 'UZS',
    prices: [
      { 
        label: 'Сумма заказа', 
        amount: Math.round(paymentData.amount * 100)
      }
    ],
    start_parameter: 'loft_payment_' + paymentData.orderId,
    need_name: false,
    need_phone_number: false,
    need_email: false,
    need_shipping_address: false,
    is_flexible: false,
  }

  console.log('📤 Отправляем invoice:', invoiceData)

  // Открываем окно оплаты
  try {
    tg.sendInvoice(invoiceData)
    console.log('✅ Invoice отправлен успешно')
  } catch (error) {
    console.error('❌ Ошибка отправки invoice:', error)
    alert('Ошибка при открытии окна оплаты: ' + error)
  }
}

// Обработка успешной оплаты
export const handlePaymentSuccess = async (orderId: string) => {
  try {
    // Обновляем статус заказа на "Оплачен"
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'Оплачен',
        payment_status: 'paid',
        paid_at: new Date().toISOString()
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

// Обработка отмены оплаты
export const handlePaymentCancel = async (orderId: string) => {
  try {
    // Обновляем статус заказа на "Отменён"
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'Отменён',
        payment_status: 'cancelled'
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
export const initPaymentHandlers = (onSuccess?: (orderId: string) => void, onCancel?: (orderId: string) => void) => {
  const tg = (window as any).Telegram?.WebApp
  
  if (!tg) return

  // Обработка закрытия invoice
  tg.onEvent('invoiceClosed', (invoice: any) => {
    console.log('Invoice closed:', invoice)
    
    if (invoice.status === 'paid') {
      // Оплата прошла успешно
      const payload = JSON.parse(invoice.payload || '{}')
      if (payload.orderId) {
        handlePaymentSuccess(payload.orderId)
        if (onSuccess) onSuccess(payload.orderId)
      }
    } else if (invoice.status === 'cancelled') {
      // Оплата отменена
      const payload = JSON.parse(invoice.payload || '{}')
      if (payload.orderId) {
        handlePaymentCancel(payload.orderId)
        if (onCancel) onCancel(payload.orderId)
      }
    }
  })
}