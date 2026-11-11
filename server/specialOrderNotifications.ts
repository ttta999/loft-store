import type { TelegramOptions } from './notifications.ts'
export interface SpecialOrderSnapshot {
  id: number | string
  status: string
  delivery_method: string
  amount?: number
  currency?: string
  courier_link?: string | null
}
const escape = (value: string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
export function specialOrderNotification(order: SpecialOrderSnapshot): { message: string; options: TelegramOptions } {
  if (!/^[1-9][0-9]*$/.test(String(order.id))) throw new Error('Invalid order ID')
  const id = String(order.id)
  const messages: Record<string,string[]> = {
    'Принят': [`✅ <b>Заказ №${id} принят</b>`, 'Полная оплата вашего спецзаказа подтверждена.', 'Теперь мы приступаем к оформлению закупки у поставщика.', 'О следующих этапах сообщим отдельно.'],
    'Заказан у поставщика': [`🛍️ <b>Заказ №${id} оформлен у поставщика</b>`, 'Мы успешно заказали ваш товар у поставщика.', 'Следующий этап — отправка товара в Узбекистан.', 'Сообщим, когда заказ отправится в путь.'],
    'В пути': [`✈️ <b>Заказ №${id} в пути</b>`, 'Ваш товар отправлен поставщиком и направляется в Узбекистан.', 'Продолжаем следить за его доставкой и сообщим о прибытии.'],
    'Прибыл в страну': [`📍 <b>Заказ №${id} прибыл в Узбекистан</b>`, 'Ваш товар прибыл в страну!', 'Теперь он проходит дальнейшую обработку перед поступлением в магазин.', 'Сообщим, когда заказ будет готов к следующему этапу.'],
    'Собирается': [`📦 <b>Готовим заказ №${id}</b>`, 'Ваш товар поступил в магазин.', 'Мы проверяем и подготавливаем его к выдаче или доставке.', 'Скоро сообщим о готовности.'],
    'Готов к выдаче': [`🎉 <b>Заказ №${id} готов к выдаче</b>`, 'Ваш спецзаказ полностью подготовлен и ожидает вас в магазине.', '📍 ТЦ «Меркато», 2 этаж, магазин №34.', 'Спасибо, что выбрали LOFT Store!'],
    'Получен': [`✅ <b>Заказ №${id} получен</b>`, 'Ваш спецзаказ успешно выдан.', 'Спасибо за доверие к LOFT Store! Будем рады вашим новым заказам.'],
    'Упакован': [`📦 <b>Заказ №${id} упакован</b>`, 'Ваш спецзаказ подготовлен к доставке.', 'Следующий этап — передача курьеру.'],
    'Передан курьеру': [`🚚 <b>Заказ №${id} передан курьеру</b>`, 'Ваш заказ передан курьеру для доставки по указанному адресу.', 'Пожалуйста, оставайтесь на связи.'],
    'Доставлен': [`✅ <b>Заказ №${id} доставлен</b>`, 'Ваш спецзаказ успешно доставлен!', 'Спасибо за покупку в LOFT Store. Надеемся, вам всё понравилось! ❤️'],
    'Отменён': [`❌ <b>Заказ №${id} отменён</b>`, 'Ваш спецзаказ был отменён.', 'Если у вас возникли вопросы об отмене или возврате оплаты, пожалуйста, свяжитесь с нашей поддержкой.'],
  }
  let paragraphs = messages[order.status]
  if (order.status === 'Ожидает оплаты') {
    const amount = Number(order.amount)
    if (!Number.isFinite(amount) || amount <= 0 || !['USD','UZS'].includes(order.currency || '')) throw new Error('Invalid amount')
    paragraphs = [`💳 <b>Заказ №${id} ожидает оплаты</b>`, 'Ваш спецзаказ успешно создан.', `Сумма к оплате: <b>${amount.toLocaleString('ru-RU',{maximumFractionDigits: order.currency === 'USD' ? 2 : 0})} ${order.currency === 'UZS' ? 'сум' : 'USD'}</b>`, 'Для продолжения оформления необходимо внести полную предоплату переводом и загрузить подтверждение платежа.']
  }
  if (!paragraphs) throw new Error('Unknown fulfillment status')
  if (order.status === 'Передан курьеру' && order.courier_link) {
    try {
      const url = new URL(order.courier_link)
      if (['http:','https:'].includes(url.protocol) && url.hostname && order.courier_link.length <= 2000) paragraphs = [...paragraphs, `🔗 Отследить курьера: ${escape(order.courier_link)}`]
    } catch { /* Invalid tracking links are omitted. */ }
  }
  return { message: paragraphs.join('\n\n'), options: { parse_mode:'HTML', reply_markup:{ inline_keyboard:[[{text:'Перейти к заказу',web_app:{url:`https://loft-store-24bz.vercel.app/profile?section=orders&order=${id}`}}]] } } }
}
