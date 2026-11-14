import {escapeHtml} from './orderNotifications.ts'
import {webTarget} from './links.ts'
import type {TelegramOptions} from './notifications.ts'
export function restockNotification(r:{product_id:string;variant_id:string;name:string;size:string;color?:string|null}):{message:string;options:TelegramOptions}{
 if(!/^[a-f0-9-]{36}$/i.test(r.product_id)||!/^[a-f0-9-]{36}$/i.test(r.variant_id)||!r.name||!r.size)throw new Error('Invalid restock')
 return {message:[`🔔 <b>Ваш размер снова в наличии</b>`,escapeHtml(r.name),`Размер: <b>${escapeHtml(r.size)}</b>`,r.color?`Цвет: ${escapeHtml(r.color)}`:'','Ваш товар снова доступен для заказа в LOFT Store.'].filter(Boolean).join('\n\n'),options:{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'Посмотреть товар',web_app:{url:webTarget({type:'product',id:r.product_id,variant:r.variant_id})}}]]}}}
}
