import { database } from './http.ts'
import type { StoredRecord } from './models.ts'

export interface TelegramOptions { parse_mode?: 'HTML'; reply_markup?: { inline_keyboard: { text: string; web_app: { url: string } }[][] } }

export async function send(token: string | undefined, chatId: string | undefined, message: string, options: TelegramOptions = {}) {
  if (!token || !chatId) throw new Error('Notification configuration missing')
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: options.parse_mode ? message : message.slice(0,4000), ...options, link_preview_options: { is_disabled: true } }),
    signal: AbortSignal.timeout(8000),
  })
  const result = await response.json()
  if (!response.ok || !result.ok) throw new Error('Notification delivery failed')
}
// All text and recipients come from persisted records, never from the request body.
export async function dispatchNotification(userId: string, kind: 'order' | 'request', record: StoredRecord) {
  const db = database()
  const { data: event, error } = await db.rpc('store_claim_notification', { p_user: userId, p_kind: kind, p_id: record.id })
  if (error) return
  if (event?.id) try {
    const message = kind === 'order'
      ? `🛍 Новый заказ №${record.id}\n👤 ${record.client_name}\n📞 ${record.client_phone}\n💰 ${record.total_price_uzs} сум\n📦 ${(record.items || []).map((i) => `${i.name}, ${i.size}${i.colorName ? ', '+i.colorName : ''} × ${i.quantity}`).join('\n')}\n🚚 ${record.delivery_method === 'pickup' ? 'Самовывоз' : record.delivery_address}\n💳 ${record.payment_method === 'online_card' ? 'Переводом, ожидает оплаты' : 'При получении, ещё не оплачен'}`
      : `🌍 Новый спецзаказ №${record.id}\n📦 ${record.product_name}\n🔗 ${record.link || 'Нет ссылки'}\n📏 ${record.size_color || 'Не указан'}\n💬 ${record.comment || 'Нет комментария'}`
    let managerChat = process.env.TELEGRAM_MANAGER_CHAT_ID
    if (!managerChat) {
      const { data, error } = await db.rpc('store_manager_chat')
      if (error) throw error
      managerChat = data || undefined
    }
    await send(process.env.TELEGRAM_MANAGER_BOT_TOKEN, managerChat, message)
    // A separate outbox row prevents re-sending the manager message if client delivery fails.
    const { error: completeError } = await db.rpc('store_complete_notification', { p_event_id: event.id })
    if (completeError) throw completeError
  } catch { console.error('Notification delivery pending') }
  if (kind === 'order') {
    const { data: clientEvent } = await db.rpc('store_claim_notification', { p_user: userId, p_kind: 'order_client', p_id: record.id })
    if (!clientEvent?.id) return
    try {
      await send(process.env.TELEGRAM_BOT_TOKEN, userId, `✅ Ваш заказ №${record.id} принят!\n💰 ${record.total_price_uzs} сум\n${record.payment_method === 'online_card' ? 'Ожидаем оплату переводом.' : 'Оплата при получении.'}\nСпасибо за заказ!`)
      const { error: completeError } = await db.rpc('store_complete_notification', { p_event_id: clientEvent.id })
      if (completeError) throw completeError
    } catch { console.error('Client notification delivery pending') }
  }
}
