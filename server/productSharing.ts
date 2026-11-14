import {productTelegramPhoto} from './telegramPhoto.ts'
import {database} from './http.ts'
import {HttpError} from './auth.ts'
import {targetLink} from './links.ts'
import {displayMoney} from '../src/lib/money.ts'
import {escapeHtml} from './orderNotifications.ts'
export async function prepareProductShare(userId:string,productId:string,currency:'USD'|'UZS',language:'ru'|'uz'){
 const db=database()
 const {data:p,error}=await db.from('products').select('id,name_ru,name_uz,category,subcategory,price_usd,sale_price,images,is_active').eq('id',productId).eq('is_active',true).maybeSingle()
 if(error||!p)throw new HttpError(404,'Товар недоступен')
 const [{data:category},{data:sub},{data:settings,error:settingsError}]=await Promise.all([db.from('categories').select('id').eq('id',p.category).eq('is_active',true).maybeSingle(),p.subcategory?db.from('subcategories').select('id').eq('id',p.subcategory).eq('is_active',true).maybeSingle():Promise.resolve({data:{id:null}}),db.from('settings').select('key,value').in('key',['exchange_rate','sale_mode_enabled'])])
 if(!category||!sub)throw new HttpError(404,'Товар недоступен')
 if(settingsError)throw new Error('Settings unavailable')
 const values=Object.fromEntries((settings||[]).map(s=>[s.key,s.value]))
 const price=values.sale_mode_enabled?.enabled===true&&Number(p.sale_price)>0?Number(p.sale_price):Number(p.price_usd),rate=Number(values.exchange_rate?.rate)
 if(!Number.isFinite(price)||price<=0)throw new Error('Price unavailable')
 if(currency==='UZS'&&(!Number.isFinite(rate)||!(rate>0)))throw new Error('Rate unavailable')
 const title=language==='uz'?p.name_uz||p.name_ru:p.name_ru
 const text=`<b>${escapeHtml(title)}</b>\n\n${language==='ru'?'Цена':'Narx'}: ${escapeHtml(displayMoney(currency==='USD'?price:price*rate,currency,language))}\n\n${language==='ru'?'LOFT Store — брендовая мужская одежда.':'LOFT Store — brend erkaklar kiyimi.'}`
 const link=await targetLink({type:'product',id:p.id})
 const markup={inline_keyboard:[[{text:language==='ru'?'Открыть товар':'Mahsulotni ochish',url:link}]]}
 let photo:any=null
 try{if(p.images?.[0])photo=await productTelegramPhoto(db,p.id,p.images[0])}catch{/* A safe text card is preferable to a broken or unsupported image. */}
 const result=photo?{type:'photo',id:photo.key,...Object.fromEntries(Object.entries(photo).filter(([k])=>k!=='key')),caption:text,parse_mode:'HTML',reply_markup:markup}:{type:'article',id:p.id,title,input_message_content:{message_text:text,parse_mode:'HTML'},reply_markup:markup}
 const response=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/savePreparedInlineMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:Number(userId),result,allow_user_chats:true,allow_bot_chats:true,allow_group_chats:true,allow_channel_chats:true}),signal:AbortSignal.timeout(8000)})
 const prepared=await response.json();if(!response.ok||!prepared.ok||!prepared.result?.id)throw new Error('Sharing unavailable')
 return {id:prepared.result.id,url:link}
}
