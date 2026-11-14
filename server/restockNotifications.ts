import {escapeHtml} from './orderNotifications.ts'
import {webTarget} from './links.ts'
import type {TelegramOptions} from './notifications.ts'
export function restockNotification(r:{product_id:string;variant_id:string;name:string;name_uz?:string|null;size:string;color?:string|null;color_uz?:string|null;language?:string}):{message:string;options:TelegramOptions}{
 if(!/^[a-f0-9-]{36}$/i.test(r.product_id)||!/^[a-f0-9-]{36}$/i.test(r.variant_id)||!r.name||!r.size)throw new Error('Invalid restock')
 const uz=r.language==='uz',name=uz?r.name_uz||r.name:r.name,color=uz?r.color_uz||r.color:r.color
 return {message:[`🔔 <b>${uz?'Sizning o‘lchamingiz yana sotuvda':'Ваш размер снова в наличии'}</b>`,escapeHtml(name),`${uz?'O‘lcham':'Размер'}: <b>${escapeHtml(r.size)}</b>`,color?`${uz?'Rang':'Цвет'}: ${escapeHtml(color)}`:'',uz?'Mahsulotingizni LOFT Store orqali yana buyurtma qilishingiz mumkin.':'Ваш товар снова доступен для заказа в LOFT Store.'].filter(Boolean).join('\n\n'),options:{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:uz?'Mahsulotni ko‘rish':'Посмотреть товар',web_app:{url:webTarget({type:'product',id:r.product_id,variant:r.variant_id})}}]]}}}
}
