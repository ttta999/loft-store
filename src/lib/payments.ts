import { storeApi, uploadPrivateImage } from './api'

import { supabase } from './supabase'
import { dataCache } from './resourceCache'
import { parsePaymentCards } from './paymentCards'
export { formatCardNumber } from './paymentCards'
export type { PaymentCards, PaymentCard } from './paymentCards'

export const MANAGER_TELEGRAM_LINK = 'https://t.me/loft_corneli'
export function getPaymentCards(force = false) {
  return dataCache.load('payment:cards', async () => {
    // Payment recipients must bypass the general HTTP response cache.
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'payment_cards').abortSignal(new AbortController().signal).single()
    if (error) throw new Error('Не удалось загрузить реквизиты оплаты. Попробуйте ещё раз.')
    return parsePaymentCards(data?.value)
  }, 60_000, force)
}

// The upload endpoint verifies ownership and attaches the receipt atomically.
export const uploadPaymentScreenshot = async (orderId: string, file: File): Promise<string> => {
  const result = await uploadPrivateImage('payment-screenshots', file, orderId)
  return result.url
}
export const cancelOrder = async (orderId: string): Promise<boolean> => {
  try { await storeApi('cancelOrder', { orderId }); return true } catch { return false }
}
