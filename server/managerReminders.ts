import {escapeHtml} from './orderNotifications.ts'
import type {TelegramOptions} from './notifications.ts'
const actions:Record<string,string>={payment_review:'Проверить оплату',special_assessment:'Оценить спецзаказ',supplier_purchase:'Заказать у поставщика',assembly:'Подготовить заказ',pickup_ready:'Уточнить получение заказа',refund:'Выполнить возврат'}
export function managerReminder(task:any):{message:string;options:TelegramOptions}{
 const id=String(task.request_id||task.order_id||'');if(!/^[1-9][0-9]*$/.test(id)||!actions[task.kind]||!Number.isInteger(task.hours)||task.hours<1)throw new Error('Invalid reminder')
 const target=task.request_id?`china?request=${id}`:task.kind==='refund'?`refunds?order=${id}`:`orders?order=${id}`
 const message=[`⏰ <b>Требует внимания</b>`,`${task.request_id?'Спецзаказ':'Заказ'} №${id} · ${actions[task.kind]}`,`Срок ожидания: более ${task.hours} ч.`,task.client_name?`Клиент: ${escapeHtml(task.client_name)}`:'','Пожалуйста, проверьте задачу.',`<a href="https://loft-store-admin.vercel.app/${target}">Открыть ${task.request_id?'заявку':'заказ'}</a>`].filter(Boolean).join('\n\n')
 return {message,options:{parse_mode:'HTML'}}
}
