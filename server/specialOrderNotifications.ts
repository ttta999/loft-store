import {customerTranslator,type CustomerLanguage} from './customerLanguage.ts'
import { displayMoney } from '../src/lib/money.ts'
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
export function specialOrderNotification(order: SpecialOrderSnapshot,language:CustomerLanguage='ru'): { message: string; options: TelegramOptions } {
  const t=customerTranslator(language)
  if (!/^[1-9][0-9]*$/.test(String(order.id))) throw new Error('Invalid order ID')
  const id = String(order.id)
  const messages: Record<string,string[]> = {
    'Принят': [t`✅ <b>Заказ №${id} принят</b>`, t('Полная оплата вашего спецзаказа подтверждена.'), t('Теперь мы приступаем к оформлению закупки у поставщика.'), t('О следующих этапах сообщим отдельно.')],
    'Заказан у поставщика': [t`🛍️ <b>Заказ №${id} оформлен у поставщика</b>`, t('Мы успешно заказали ваш товар у поставщика.'), t('Следующий этап — отправка товара в Узбекистан.'), t('Сообщим, когда заказ отправится в путь.')],
    'В пути': [t`✈️ <b>Заказ №${id} в пути</b>`, t('Ваш товар отправлен поставщиком и направляется в Узбекистан.'), t('Продолжаем следить за его доставкой и сообщим о прибытии.')],
    'Прибыл в страну': [t`📍 <b>Заказ №${id} прибыл в Узбекистан</b>`, t('Ваш товар прибыл в страну!'), t('Теперь он проходит дальнейшую обработку перед поступлением в магазин.'), t('Сообщим, когда заказ будет готов к следующему этапу.')],
    'Собирается': [t`📦 <b>Готовим заказ №${id}</b>`, t('Ваш товар поступил в магазин.'), order.delivery_method==='pickup'?t('Мы проверяем и подготавливаем его к выдаче.'):t('Мы проверяем и подготавливаем его к доставке.'), order.delivery_method==='pickup'?t('Сообщим, когда заказ будет готов к получению.'):t('Сообщим, когда заказ будет передан курьеру.')],
    'Готов к выдаче': [t`🎉 <b>Заказ №${id} готов к выдаче</b>`, t('Ваш спецзаказ полностью подготовлен и ожидает вас в магазине.'), t('📍 ТЦ «Меркато», 2 этаж, магазин №34.'), t('Спасибо, что выбрали LOFT Store!')],
    'Получен': [t`✅ <b>Заказ №${id} получен</b>`, t('Ваш спецзаказ успешно выдан.'), t('Спасибо за доверие к LOFT Store! Будем рады вашим новым заказам.')],
    'Упакован': [t`📦 <b>Заказ №${id} упакован</b>`, t('Ваш спецзаказ подготовлен к доставке.'), t('Следующий этап — передача курьеру.')],
    'Передан курьеру': [t`🚚 <b>Заказ №${id} передан курьеру</b>`, t('Ваш заказ передан курьеру для доставки по указанному адресу.'), t('Пожалуйста, оставайтесь на связи.')],
    'Доставлен': [t`✅ <b>Заказ №${id} доставлен</b>`, t('Ваш спецзаказ успешно доставлен!'), t('Спасибо за покупку в LOFT Store. Надеемся, вам всё понравилось! ❤️')],
    'Отменён': [t`❌ <b>Заказ №${id} отменён</b>`, t('Ваш спецзаказ был отменён.'), t('Если у вас возникли вопросы об отмене или возврате оплаты, пожалуйста, свяжитесь с нашей поддержкой.')],
  }
  let paragraphs = messages[order.status]
  if (order.status === 'Ожидает оплаты') {
    const amount = Number(order.amount)
    if (!Number.isFinite(amount) || amount <= 0 || !['USD','UZS'].includes(order.currency || '')) throw new Error('Invalid amount')
    paragraphs = [t`💳 <b>Заказ №${id} ожидает оплаты</b>`, t('Ваш спецзаказ успешно создан.'), t`Сумма к оплате: <b>${displayMoney(amount,order.currency as 'USD'|'UZS','ru','code')}</b>`, t('Для продолжения оформления необходимо внести полную предоплату переводом и загрузить подтверждение платежа.')]
  }
  if (!paragraphs) throw new Error('Unknown fulfillment status')
  if (order.status === 'Передан курьеру' && order.courier_link) {
    try {
      const url = new URL(order.courier_link)
      if (['http:','https:'].includes(url.protocol) && url.hostname && order.courier_link.length <= 2000) paragraphs = [...paragraphs, t`🔗 Отследить курьера: ${escape(order.courier_link)}`]
    } catch { /* Invalid tracking links are omitted. */ }
  }
  return { message: paragraphs.join('\n\n'), options: { parse_mode:'HTML', reply_markup:{ inline_keyboard:[[{text:t('Перейти к заказу'),web_app:{url:`https://loft-store-24bz.vercel.app/profile?section=orders&order=${id}`}}]] } } }
}
