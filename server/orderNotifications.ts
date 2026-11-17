import {customerTranslator,type CustomerLanguage} from './customerLanguage.ts'
import { formatMoney, formatOrderMoney, moneyAmount, orderStatus, type OrderLike } from '../src/lib/orderState.ts'
import type { TelegramOptions } from './notifications.ts'
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
function orderId(id: unknown): string {
  if (!/^[1-9][0-9]*$/.test(String(id))) throw new Error('Invalid order ID')
  return String(id)
}
function notice(id: string, paragraphs: string[],language:CustomerLanguage='ru'): {message: string; options: TelegramOptions} {
  return {message:paragraphs.filter(Boolean).join('\n\n'),options:{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:language==='uz'?'Buyurtmaga o‘tish':'Перейти к заказу',web_app:{url:`https://loft-store-24bz.vercel.app/profile?section=orders&order=${id}`}}]]}}}
}
export function ordinaryOrderNotification(o: OrderLike,language:CustomerLanguage='ru') {
  const t=customerTranslator(language)
  const id=orderId(o.id),stage=o.stage || orderStatus(o),pickup=o.delivery_method==='pickup',cash=o.payment_method==='upon_receipt'
  const value=moneyAmount(o),amount=escapeHtml(o.amount !== undefined ? formatMoney(o.amount,o.currency) : value ? formatMoney(value.amount,value.currency) : t('Сумма требует проверки'))
  switch(stage){
    case 'На обработке': return notice(id,[t`📋 <b>Заказ №${id} оформлен</b>`,t('Ваш заказ передан в обработку.'),t`Сумма заказа: <b>${amount}</b>`,t('Подтверждение оплаты получено. Менеджер проверит поступление средств и сообщит о принятии заказа.'),t('Спасибо, что выбрали LOFT Store!')],language)
    case 'Принят': return cash
      ? notice(id,[t`✅ <b>Заказ №${id} принят</b>`,t('Мы получили ваш заказ и приступаем к его обработке.'),t`Сумма: <b>${amount}</b>\nСпособ получения: самовывоз.\nОплата: при получении.`,t('Сообщим, когда заказ будет готов.'),t('Спасибо, что выбрали LOFT Store!')],language)
      : notice(id,[t`✅ <b>Заказ №${id} принят</b>`,t('Оплата вашего заказа подтверждена.'),t`Сумма: <b>${amount}</b>`,t('Заказ передан на подготовку. Сообщим о следующих этапах.')],language)
    case 'Собирается': return notice(id,[t`📦 <b>Собираем заказ №${id}</b>`,pickup?t('Мы приступили к подготовке вашего заказа.'):t('Мы приступили к сборке вашего заказа.'),pickup?t('Сообщим, как только он будет готов к выдаче.'):t('Сообщим, когда он будет подготовлен к доставке.')],language)
    case 'Готов к выдаче': return notice(id,[t`🛍️ <b>Заказ №${id} готов к выдаче</b>`,t('Ваш заказ собран и ожидает вас в магазине.'),t('📍 ТЦ «Меркато», 2 этаж, магазин №34.'),cash?t`К оплате при получении: <b>${amount}</b>`:t('Заказ полностью оплачен.'),t('Ждём вас в LOFT Store!')],language)
    case 'Получен': return notice(id,[t`✅ <b>Заказ №${id} получен</b>`,t('Ваш заказ успешно выдан.'),t('Спасибо за покупку в LOFT Store! Будем рады видеть вас снова.')],language)
    case 'Упакован': return notice(id,[t`🛍️ <b>Заказ №${id} упакован</b>`,t('Ваш заказ собран и подготовлен к доставке.'),t('Следующий этап — передача курьеру.')],language)
    case 'Передан курьеру': {
      let tracking=''
      try{const url=new URL(o.courier_link);if(['http:','https:'].includes(url.protocol)&&url.hostname&&o.courier_link.length<=2000)tracking=t`Отследить доставку: ${escapeHtml(o.courier_link)}`}catch{/* No invalid or empty tracking link. */}
      return notice(id,[t`🚚 <b>Заказ №${id} передан курьеру</b>`,t('Ваш заказ передан курьеру для доставки по указанному адресу.'),t('Пожалуйста, оставайтесь на связи.'),tracking],language)
    }
    case 'Доставлен': return notice(id,[t`✅ <b>Заказ №${id} доставлен</b>`,t('Ваш заказ успешно доставлен!'),t('Спасибо за покупку в LOFT Store. Надеемся, вам всё понравилось! ❤️')],language)
    default: throw new Error('Unknown ordinary order stage')
  }
}
export function cancellationNotification(o: OrderLike,manager=false,language:CustomerLanguage='ru') {
  const t=customerTranslator(language)
  const id=orderId(o.id),reason=escapeHtml(o.reason),description=o.source==='client'?t('Вы отменили свой заказ'):o.source==='store'?t`Ваш заказ отменён магазином. Причина: ${reason}`:t('Ваш заказ отменён')
  if(manager) return {message:`❌ <b>Клиент отменил заказ №${id}</b>\n\nСостояние возврата: ${escapeHtml(o.refund_status || 'Возврат не требуется')}`,options:{parse_mode:'HTML' as const}}
  if(o.refund_status==='Проверка платежа')return notice(id,[t`❌ <b>Заказ №${id} отменён</b>`,description,t('Мы проверяем информацию о вашем переводе.'),t('Если оплата поступила, менеджер оформит возврат средств.'),t('О результате проверки сообщим отдельно.')],language)
  if(o.refund_status==='Ожидает возврата')return notice(id,[t`❌ <b>Заказ №${id} отменён</b>`,description,t`Сумма к возврату: <b>${escapeHtml(formatMoney(o.amount,o.currency))}</b>`,t('Мы приступим к оформлению возврата средств. Менеджер свяжется с вами, если потребуется уточнить информацию для банковского перевода.'),t('Сообщим после выполнения возврата.')],language)
  if(o.source==='store')return notice(id,[t`❌ <b>Заказ №${id} отменён</b>`,t('К сожалению, мы не можем выполнить ваш заказ.'),t`Причина: ${reason}`,t('Приносим извинения за неудобства.'),t('Если у вас возникли вопросы, наша поддержка готова помочь.')],language)
  return notice(id,[t`❌ <b>Заказ №${id} отменён</b>`,t('Вы отменили свой заказ в LOFT Store.'),t('Если передумаете, вы всегда можете оформить новый заказ.'),t('Будем рады видеть вас снова!')],language)
}
export function refundNotification(r: OrderLike,language:CustomerLanguage='ru') {
  const t=customerTranslator(language)
  const id=orderId(r.order_id),amount=escapeHtml(formatMoney(r.amount,r.currency))
  if(r.status==='Ожидает возврата')return notice(id,[t`💳 <b>Возврат по заказу №${id}</b>`,t('Мы подтвердили поступление оплаты за ваш отменённый заказ.'),t`Сумма к возврату: <b>${amount}</b>`,t('Менеджер приступит к оформлению возврата средств и свяжется с вами, если потребуется уточнить информацию.'),t('Сообщим после выполнения перевода.')],language)
  if(r.status==='Возврат выполнен')return notice(id,[t`✅ <b>Возврат по заказу №${id} выполнен</b>`,t`Сумма: <b>${amount}</b>`,t('Возврат средств успешно выполнен.'),t('Информация о возврате доступна в разделе «Мои заказы».'),t('Спасибо, что выбираете LOFT Store!')],language)
  if(r.status==='Возврат не требуется')return notice(id,[t`ℹ️ <b>Информация по заказу №${id}</b>`,t('Мы завершили проверку оплаты вашего отменённого заказа.'),t('Поступление средств не подтверждено, поэтому возврат не требуется.'),t('Если вы уже совершили перевод и считаете, что произошла ошибка, пожалуйста, свяжитесь с нашей поддержкой.')],language)
  throw new Error('Unknown refund event')
}
export function managerOrderNotification(o: OrderLike) {
  const id=orderId(o.id)
  let items:OrderLike[]=[]
  try {const value=typeof o.items==='string'?JSON.parse(o.items):o.items;if(Array.isArray(value))items=value}catch{}
  const body=`Клиент: ${o.client_name || '—'}\nТелефон: ${o.client_phone || '—'}\n\nТовары:\n${items.map((i:OrderLike)=>`${i.name}, ${i.size}${i.colorName?', '+i.colorName:''} × ${i.quantity}`).join('\n')}\n\nСумма: ${formatOrderMoney(o)}\nПолучение: ${o.delivery_method==='pickup'?'Самовывоз':o.delivery_address || 'Доставка'}\nОплата: ${o.payment_status==='paid'?'Подтверждена':o.payment_method==='online_card'?'Переводом, на проверке':'При получении'}`
  return {message:`🛍️ <b>Новый заказ №${id}</b>\n\n${escapeHtml(body.slice(0,3500))}`,options:{parse_mode:'HTML' as const}}
}
