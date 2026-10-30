import { storeApi, uploadPrivateImage } from './api'

interface PaymentData {
  orderId: string
  amount: number
  description: string
}

export const PAYMENT_DETAILS = {
  cardNumber: '5354 6739 3850 3829',
  cardHolder: 'Abrorbek Xusanov',
}

export const PAYMENT_CARDS: Record<'UZS' | 'USD', { number: string; holder: string }> = {
  UZS: { number: '5614 3829 5950 3289', holder: 'Otabek Khusanov' },
  USD: { number: '4023 0570 1085 2969', holder: 'Khusan Raximov' },
}

export const MANAGER_TELEGRAM_LINK = 'https://t.me/loft_corneli'

export const showPaymentDetails = (paymentData: PaymentData): string => {
  const message = `
💳 <b>Оплата заказа №${paymentData.orderId}</b>

💰 <b>Сумма:</b> ${paymentData.amount.toLocaleString()} сум

💳 <b>Карта для перевода:</b>
${PAYMENT_DETAILS.cardNumber}
👤 Получатель: ${PAYMENT_DETAILS.cardHolder}

📸 <b>После оплаты:</b>
1. Сделайте скриншот перевода
2. Загрузите его в приложении
3. Мы подтвердим заказ в течение 15 минут

⏱ <b>Важно:</b> Заказ будет обработан только после подтверждения оплаты!
  `.trim()

  return message
}

// The upload endpoint verifies ownership and attaches the receipt atomically.
export const uploadPaymentScreenshot = async (orderId: string, file: File): Promise<string> => {
  const result = await uploadPrivateImage('payment-screenshots', file, orderId)
  return result.url
}
export const cancelOrder = async (orderId: string): Promise<boolean> => {
  try { await storeApi('cancelOrder', { orderId }); return true } catch { return false }
}
