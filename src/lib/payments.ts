import { supabase } from './supabase'

interface PaymentData {
  orderId: string
  amount: number
  description: string
}

// ✅ Реквизиты для оплаты (настрой свои)
export const PAYMENT_DETAILS = {
  click: '+998 93 378 87 70',
  payme: '+998 93 378 87 70',
  uzum: '+998 93 378 87 70',
}

// ✅ Ссылка на менеджера в Telegram
export const MANAGER_TELEGRAM_LINK = 'https://t.me/loft_corneli' // Замени на свой username

// ✅ Показать реквизиты оплаты
export const showPaymentDetails = (paymentData: PaymentData): string => {
  const message = `
💳 <b>Оплата заказа №${paymentData.orderId}</b>

💰 <b>Сумма:</b> ${paymentData.amount.toLocaleString()} сум

📱 <b>Реквизиты для перевода:</b>

• <b>CLICK:</b> ${PAYMENT_DETAILS.click}
• <b>Payme:</b> ${PAYMENT_DETAILS.payme}
• <b>Uzum Bank:</b> ${PAYMENT_DETAILS.uzum}

📸 <b>После оплаты:</b>
1. Сделайте скриншот перевода
2. Загрузите его в приложении
3. Мы подтвердим заказ в течение 15 минут

⏱ <b>Важно:</b> Заказ будет обработан только после подтверждения оплаты!
  `.trim()

  return message
}

// ✅ Загрузка скриншота оплаты в Supabase Storage
export const uploadPaymentScreenshot = async (
  orderId: string,
  file: File
): Promise<string> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${orderId}-${Date.now()}.${fileExt}`
  
  const { error } = await supabase.storage
    .from('payment-screenshots')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('payment-screenshots')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

// ✅ Сохранение ссылки на скриншот в заказе
export const savePaymentScreenshot = async (
  orderId: string,
  screenshotUrl: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_screenshot_url: screenshotUrl,
      })
      .eq('id', orderId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Ошибка сохранения скриншота:', error)
    return false
  }
}

// ✅ Отмена заказа
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
    return true
  } catch (error) {
    console.error('Ошибка отмены заказа:', error)
    return false
  }
}

// ✅ Подтверждение оплаты (для менеджера)
export const confirmPayment = async (orderId: string) => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'Активный',
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        payment_provider: 'manual'
      })
      .eq('id', orderId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Ошибка подтверждения оплаты:', error)
    return false
  }
}