/** Every special line retains its request ID; the legacy column remains readable. */
export function specialOrderIds(order: any): string[] {
  let items: any[] = []
  try { items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [] } catch { /* legacy malformed list */ }
  return [...new Set([order.special_order_id, ...(Array.isArray(items) ? items.filter(i => i.isSpecialOrder || i.specialRequestId).map(i => i.specialRequestId) : [])].filter(id => id != null && id !== '').map(String))]
}

/** Preserve the processing rules for historical mixed orders. */
export const usesSpecialFulfillment = (order: any): boolean => order.special_fulfillment === true
export const SPECIAL_PICKUP = ['Ожидает оплаты','Принят','Заказан у поставщика','В пути','Прибыл в страну','Собирается','Готов к выдаче','Получен']
export const SPECIAL_DELIVERY = ['Ожидает оплаты','Принят','Заказан у поставщика','В пути','Прибыл в страну','Собирается','Передан курьеру','Доставлен']
export function nextSpecialStatuses(order: any): string[] {
  if (!usesSpecialFulfillment(order) || order.status === 'Отменён') return []
  if(order.delivery_method==='delivery'&&order.status==='Упакован')return order.payment_status==='paid'&&order.paid_at?['Передан курьеру','Отменён']:['Отменён']
  const sequence = order.delivery_method === 'pickup' ? SPECIAL_PICKUP : SPECIAL_DELIVERY
  const index = sequence.indexOf(order.status)
  if (index < 0 || index === sequence.length - 1) return []
  const next = order.payment_status === 'paid' && order.paid_at && index > 0 ? sequence[index + 1] : null
  return [...(next ? [next] : []), 'Отменён']
}
export function specialStatusTone(status: string): string {
  return ({'Принят':'Активный','Заказан у поставщика':'В обработке','В пути':'Активный','Прибыл в страну':'В обработке','Собирается':'В обработке','Готов к выдаче':'Готов','Получен':'Выдан','Упакован':'Готов','Передан курьеру':'Выдан'} as Record<string,string>)[status] || status
}
export function specialStatusText(status: string, language: string): string | null {
  const labels: Record<string,string> = {'Принят':'Qabul qilindi','Заказан у поставщика':'Yetkazib beruvchiga buyurtma berildi','В пути':'Yo‘lda','Прибыл в страну':'Mamlakatga yetib keldi','Собирается':'Tayyorlanmoqda','Готов к выдаче':'Berishga tayyor','Получен':'Olib bo‘lindi','Упакован':'Qadoqlandi','Передан курьеру':'Kuryerga topshirildi'}
  return status in labels ? language === 'uz' ? labels[status] : status : null
}
