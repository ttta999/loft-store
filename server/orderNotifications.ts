import { formatMoney, formatOrderMoney, moneyAmount, orderStatus, type OrderLike } from '../src/lib/orderState.ts'
import type { TelegramOptions } from './notifications.ts'
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
function orderId(id: unknown): string {
  if (!/^[1-9][0-9]*$/.test(String(id))) throw new Error('Invalid order ID')
  return String(id)
}
function notice(id: string, paragraphs: string[]): {message: string; options: TelegramOptions} {
  return {message:paragraphs.filter(Boolean).join('\n\n'),options:{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'Перейти к заказу',web_app:{url:`https://loft-store-24bz.vercel.app/profile?section=orders&order=${id}`}}]]}}}
}
export function ordinaryOrderNotification(o: OrderLike) {
  const id=orderId(o.id),stage=o.stage || orderStatus(o),pickup=o.delivery_method==='pickup',cash=o.payment_method==='upon_receipt'
  const value=moneyAmount(o),amount=escapeHtml(o.amount !== undefined ? formatMoney(o.amount,o.currency) : value ? formatMoney(value.amount,value.currency) : 'Сумма требует проверки')
  switch(stage){
    case 'На обработке': return notice(id,[`📋 <b>Заказ №${id} оформлен</b>`,'Ваш заказ передан в обработку.',`Сумма заказа: <b>${amount}</b>`,'Подтверждение оплаты получено. Менеджер проверит поступление средств и сообщит о принятии заказа.','Спасибо, что выбрали LOFT Store!'])
    case 'Принят': return cash
      ? notice(id,[`✅ <b>Заказ №${id} принят</b>`,'Мы получили ваш заказ и приступаем к его обработке.',`Сумма: <b>${amount}</b>\nСпособ получения: самовывоз.\nОплата: при получении.`,'Сообщим, когда заказ будет готов.','Спасибо, что выбрали LOFT Store!'])
      : notice(id,[`✅ <b>Заказ №${id} принят</b>`,'Оплата вашего заказа подтверждена.',`Сумма: <b>${amount}</b>`,'Заказ передан на подготовку. Сообщим о следующих этапах.'])
    case 'Собирается': return notice(id,[`📦 <b>Собираем заказ №${id}</b>`,pickup?'Мы приступили к подготовке вашего заказа.':'Мы приступили к сборке вашего заказа.',pickup?'Сообщим, как только он будет готов к выдаче.':'Сообщим, когда он будет подготовлен к доставке.'])
    case 'Готов к выдаче': return notice(id,[`🛍️ <b>Заказ №${id} готов к выдаче</b>`,'Ваш заказ собран и ожидает вас в магазине.','📍 ТЦ «Меркато», 2 этаж, магазин №34.',cash?`К оплате при получении: <b>${amount}</b>`:'Заказ полностью оплачен.','Ждём вас в LOFT Store!'])
    case 'Получен': return notice(id,[`✅ <b>Заказ №${id} получен</b>`,'Ваш заказ успешно выдан.','Спасибо за покупку в LOFT Store! Будем рады видеть вас снова.'])
    case 'Упакован': return notice(id,[`🛍️ <b>Заказ №${id} упакован</b>`,'Ваш заказ собран и подготовлен к доставке.','Следующий этап — передача курьеру.'])
    case 'Передан курьеру': {
      let tracking=''
      try{const url=new URL(o.courier_link);if(['http:','https:'].includes(url.protocol)&&url.hostname&&o.courier_link.length<=2000)tracking=`Отследить доставку: ${escapeHtml(o.courier_link)}`}catch{/* No invalid or empty tracking link. */}
      return notice(id,[`🚚 <b>Заказ №${id} передан курьеру</b>`,'Ваш заказ передан курьеру для доставки по указанному адресу.','Пожалуйста, оставайтесь на связи.',tracking])
    }
    case 'Доставлен': return notice(id,[`✅ <b>Заказ №${id} доставлен</b>`,'Ваш заказ успешно доставлен!','Спасибо за покупку в LOFT Store. Надеемся, вам всё понравилось! ❤️'])
    default: throw new Error('Unknown ordinary order stage')
  }
}
export function cancellationNotification(o: OrderLike,manager=false) {
  const id=orderId(o.id),reason=escapeHtml(o.reason),description=o.source==='client'?'Вы отменили свой заказ':o.source==='store'?`Ваш заказ отменён магазином. Причина: ${reason}`:'Ваш заказ отменён'
  if(manager) return {message:`❌ <b>Клиент отменил заказ №${id}</b>\n\nСостояние возврата: ${escapeHtml(o.refund_status || 'Возврат не требуется')}`,options:{parse_mode:'HTML' as const}}
  if(o.refund_status==='Проверка платежа')return notice(id,[`❌ <b>Заказ №${id} отменён</b>`,description,'Мы проверяем информацию о вашем переводе.','Если оплата поступила, менеджер оформит возврат средств.','О результате проверки сообщим отдельно.'])
  if(o.refund_status==='Ожидает возврата')return notice(id,[`❌ <b>Заказ №${id} отменён</b>`,description,`Сумма к возврату: <b>${escapeHtml(formatMoney(o.amount,o.currency))}</b>`,'Мы приступим к оформлению возврата средств. Менеджер свяжется с вами, если потребуется уточнить информацию для банковского перевода.','Сообщим после выполнения возврата.'])
  if(o.source==='store')return notice(id,[`❌ <b>Заказ №${id} отменён</b>`,'К сожалению, мы не можем выполнить ваш заказ.',`Причина: ${reason}`,'Приносим извинения за неудобства.','Если у вас возникли вопросы, наша поддержка готова помочь.'])
  return notice(id,[`❌ <b>Заказ №${id} отменён</b>`,'Вы отменили свой заказ в LOFT Store.','Если передумаете, вы всегда можете оформить новый заказ.','Будем рады видеть вас снова!'])
}
export function refundNotification(r: OrderLike) {
  const id=orderId(r.order_id),amount=escapeHtml(formatMoney(r.amount,r.currency))
  if(r.status==='Ожидает возврата')return notice(id,[`💳 <b>Возврат по заказу №${id}</b>`,'Мы подтвердили поступление оплаты за ваш отменённый заказ.',`Сумма к возврату: <b>${amount}</b>`,'Менеджер приступит к оформлению возврата средств и свяжется с вами, если потребуется уточнить информацию.','Сообщим после выполнения перевода.'])
  if(r.status==='Возврат выполнен')return notice(id,[`✅ <b>Возврат по заказу №${id} выполнен</b>`,`Сумма: <b>${amount}</b>`,'Возврат средств успешно выполнен.','Информация о возврате доступна в разделе «Мои заказы».','Спасибо, что выбираете LOFT Store!'])
  if(r.status==='Возврат не требуется')return notice(id,[`ℹ️ <b>Информация по заказу №${id}</b>`,'Мы завершили проверку оплаты вашего отменённого заказа.','Поступление средств не подтверждено, поэтому возврат не требуется.','Если вы уже совершили перевод и считаете, что произошла ошибка, пожалуйста, свяжитесь с нашей поддержкой.'])
  throw new Error('Unknown refund event')
}
export function managerOrderNotification(o: OrderLike) {
  const id=orderId(o.id)
  let items:OrderLike[]=[]
  try {const value=typeof o.items==='string'?JSON.parse(o.items):o.items;if(Array.isArray(value))items=value}catch{}
  const body=`Клиент: ${o.client_name || '—'}\nТелефон: ${o.client_phone || '—'}\n\nТовары:\n${items.map((i:OrderLike)=>`${i.name}, ${i.size}${i.colorName?', '+i.colorName:''} × ${i.quantity}`).join('\n')}\n\nСумма: ${formatOrderMoney(o)}\nПолучение: ${o.delivery_method==='pickup'?'Самовывоз':o.delivery_address || 'Доставка'}\nОплата: ${o.payment_status==='paid'?'Подтверждена':o.payment_method==='online_card'?'Переводом, на проверке':'При получении'}`
  return {message:`🛍️ <b>Новый заказ №${id}</b>\n\n${escapeHtml(body.slice(0,3500))}`,options:{parse_mode:'HTML' as const}}
}
