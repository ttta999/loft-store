export type OrderLike = { [key: string]: any }
export const isOrderDraft = (o: OrderLike) => o.payment_method === 'online_card' && o.status === 'Ожидает оплаты' && !o.receipt_submitted_at && !o.paid_at
export function hasSpecialItems(o: OrderLike): boolean {
  if (o.special_fulfillment || o.special_order_id) return true
  try { const items=typeof o.items==='string'?JSON.parse(o.items):o.items;return Array.isArray(items)&&items.some(i=>i?.isSpecialOrder||i?.specialRequestId) } catch { return false }
}
export function orderStatus(o: OrderLike, lang = 'ru'): string {
  let status = o.status || ''
  if (status === 'Отменён') status = o.cancelled_by === 'client' ? 'Отменён клиентом' : o.cancelled_by === 'store' ? 'Отменён магазином' : 'Отменён'
  else if (status === 'Ожидает оплаты' && o.receipt_submitted_at && o.payment_status === 'pending') status = 'На обработке'
  else status = ({'Активный':'Принят','В обработке':'Собирается','Готов':o.delivery_method === 'pickup' ? 'Готов к выдаче' : 'Упакован','Выдан':o.delivery_method === 'pickup' ? 'Получен' : 'Передан курьеру'} as Record<string,string>)[status] || status
  const uz: Record<string,string> = {'На обработке':'To‘lov tekshirilmoqda','Ожидает оплаты':'To‘lovni kutmoqda','Принят':'Qabul qilindi','Собирается':'Tayyorlanmoqda','Готов к выдаче':'Berishga tayyor','Упакован':'Qadoqlandi','Получен':'Olib bo‘lindi','Передан курьеру':'Kuryerga topshirildi','Доставлен':'Yetkazib berildi','Отменён':'Bekor qilindi','Отменён клиентом':'Mijoz bekor qildi','Отменён магазином':'Do‘kon bekor qildi','Заказан у поставщика':'Yetkazib beruvchiga buyurtma berildi','В пути':'Yo‘lda','Прибыл в страну':'Mamlakatga yetib keldi'}
  return lang === 'uz' ? uz[status] || status : status
}
export function canClientCancel(o: OrderLike): boolean {
  if (o.checkout_abandoned_at || !['Ожидает оплаты','Активный'].includes(o.status)) return false
  return !hasSpecialItems(o) || o.payment_status === 'pending'
}
export const canManagerCancel = (o: OrderLike) => !['Отменён','Получен','Доставлен'].includes(o.status) && !(o.status==='Выдан'&&o.delivery_method==='pickup')
export const cancellationNeedsReview = (o: OrderLike) => (o.delivery_method==='delivery'&&['Выдан','Передан курьеру'].includes(o.status)) || (o.special_fulfillment&&['Заказан у поставщика','В пути','Прибыл в страну','Собирается','Готов к выдаче','Упакован','Передан курьеру'].includes(o.status))
export function nextOrdinaryStatuses(o: OrderLike): string[] {
  if (o.special_fulfillment || o.status === 'Отменён' || o.stock_released || (o.payment_method === 'online_card' && (o.payment_status !== 'paid' || !o.paid_at))) return []
  return ({'Активный':['В обработке'],'В обработке':o.delivery_method==='delivery'?['Выдан']:['Готов'],'Готов':['Выдан'],'Упакован':o.delivery_method==='delivery'?['Выдан']:[],'Выдан':o.delivery_method === 'delivery' ? ['Доставлен'] : []} as Record<string,string[]>)[o.status] || []
}
export function moneyAmount(o: OrderLike): { amount: number; currency: 'USD' | 'UZS' } | null {
  const currency = o.order_currency
  if (currency !== 'USD' && currency !== 'UZS') return null
  let amount = currency === 'USD' ? o.total_price_usd : o.total_price_uzs
  if (amount == null && currency === 'UZS' && o.total_price_usd != null && Number(o.exchange_rate_at_order) > 0) amount = Math.round(Number(o.total_price_usd) * Number(o.exchange_rate_at_order))
  if (amount == null || !Number.isFinite(Number(amount)) || Number(amount) < 0) return null
  return { amount: Number(amount), currency }
}
export function formatMoney(amount: unknown, currency: unknown, lang = 'ru'): string {
  if (amount == null || !Number.isFinite(Number(amount)) || Number(amount) < 0 || !['USD','UZS'].includes(String(currency))) return lang === 'uz' ? 'Summa tekshirilishi kerak' : 'Сумма требует проверки'
  return `${Number(amount).toLocaleString('ru-RU',{maximumFractionDigits:currency === 'USD' ? 2 : 0})} ${currency === 'USD' ? '$' : lang === 'uz' ? 'so‘m' : 'сум'}`
}
export function formatOrderMoney(o: OrderLike, lang = 'ru'): string {
  const value = moneyAmount(o)
  return value ? formatMoney(value.amount,value.currency,lang) : lang === 'uz' ? 'Summa tekshirilishi kerak' : 'Сумма требует проверки'
}
export const REFUND_STATUSES = ['Проверка платежа','Ожидает возврата','Возврат выполнен','Возврат не требуется']
export function refundStatus(status: string, lang = 'ru'): string {
  const uz: Record<string,string> = {'Проверка платежа':'To‘lov tekshirilmoqda','Ожидает возврата':'Pul qaytarilishi kutilmoqda','Возврат выполнен':'Pul qaytarildi','Возврат не требуется':'Pul qaytarish talab qilinmaydi'}
  return lang === 'uz' ? uz[status] || status : status
}
