import type {SupabaseClient} from '@supabase/supabase-js'
import type {CampaignJob} from '../server/campaignDelivery.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import {ordinaryOrderNotification,cancellationNotification,refundNotification} from '../server/orderNotifications.ts'
import {specialNotification} from '../server/specialNotifications.ts'
import {specialOrderNotification} from '../server/specialOrderNotifications.ts'
import {customerTranslator,customerLanguage} from '../server/customerLanguage.ts'
import {customerTexts} from '../server/customerTexts.ts'
import {prepareCampaignDelivery} from '../server/campaignDelivery.ts'
test('all client stages and buttons translate without changing amounts, links or free text',()=>{
 const base={id:335,order_id:335,amount:123456,currency:'UZS',delivery_method:'delivery',payment_method:'online_card',courier_link:'https://example.test/a?x=1&y=2',source:'store',reason:'Причина <test>',manager_comment:'Сумма: <user text>',rejection_reason:'Поставщик <unavailable>'}
 const notices=[]
 for(const stage of ['На обработке','Принят','Собирается','Готов к выдаче','Получен','Упакован','Передан курьеру','Доставлен'])for(const delivery_method of ['pickup','delivery'])for(const payment_method of ['upon_receipt','online_card'])notices.push([ordinaryOrderNotification({...base,stage,delivery_method,payment_method}),ordinaryOrderNotification({...base,stage,delivery_method,payment_method},'uz')])
 for(const refund_status of ['Проверка платежа','Ожидает возврата','Возврат не требуется'])for(const source of ['client','store'])notices.push([cancellationNotification({...base,source,refund_status}),cancellationNotification({...base,source,refund_status},false,'uz')])
 for(const status of ['Ожидает возврата','Возврат выполнен','Возврат не требуется'])notices.push([refundNotification({...base,status}),refundNotification({...base,status},'uz')])
 for(const status of ['На оценке','Оценён','Оформлен','Отменён','Отклонён'])notices.push([specialNotification({...base,status,amount_uzs:123456}),specialNotification({...base,status,amount_uzs:123456},'uz')])
 for(const status of ['Ожидает оплаты','Принят','Заказан у поставщика','В пути','Прибыл в страну','Собирается','Готов к выдаче','Получен','Упакован','Передан курьеру','Доставлен','Отменён'])notices.push([specialOrderNotification({...base,status}),specialOrderNotification({...base,status},'uz')])
 for(const [ru,uz] of notices){assert.notEqual(uz.message,ru.message);assert.equal(uz.options.reply_markup?.inline_keyboard[0][0].web_app.url,ru.options.reply_markup?.inline_keyboard[0][0].web_app.url);assert.ok(!/[А-Яа-яЁё]/.test(uz.options.reply_markup!.inline_keyboard[0][0].text));assert.equal(uz.message.includes('<test>'),false);assert.deepEqual(uz.message.match(/\d+/g),ru.message.match(/\d+/g))}
 const quote=specialNotification({...base,status:'Оценён',amount_uzs:123456},'uz');assert.ok(quote.message.includes('Сумма: &lt;user text&gt;'))
 assert.ok(cancellationNotification({...base,refund_status:'Ожидает возврата'},false,'uz').message.includes('Причина &lt;test&gt;'))
})
test('template substitutions are opaque, placeholder sets match and language is read at send time',async()=>{
 for(const [ru,uz] of Object.entries(customerTexts))assert.deepEqual(uz.match(/\{\d+\}/g)?.sort(),ru.match(/\{\d+\}/g)?.sort(),ru)
 const t=customerTranslator('uz');assert.equal(t`Причина: ${'{0} Ваш заказ отменён'}`,'Sabab: {0} Ваш заказ отменён')
 let locale='ru',lookups=0
 const db={rpc:async()=>{lookups++;return {data:locale}}} as unknown as SupabaseClient
 assert.equal(await customerLanguage(db,'123456'),'ru');locale='uz';assert.equal(await customerLanguage(db,'123456'),'uz');assert.equal(lookups,2)
 await assert.rejects(()=>customerLanguage({rpc:async()=>({error:new Error('offline')})} as unknown as SupabaseClient,'123456'))
})
test('campaign language uses the same live preference without changing its job or snapshot',async()=>{
 process.env.TELEGRAM_BOT_TOKEN='fixture-only'
 const payload={title:'Русский',message:'Текст',button_label:'Открыть',target_type:'home',content_language:'ru',translations:{uz:{title:'O‘zbekcha',message:'Matn',button_label:'Ochish'}}}
 const job={kind:'campaign' as const,id:'same-event',lease:'same-lease',user_id:'123456',language:'ru',payload},before=structuredClone(job)
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({ok:true,result:{is_bot:true,username:'loft_fixture_bot',has_main_web_app:true}})
 let prepared
 try{prepared=await prepareCampaignDelivery({rpc:async()=>({data:'uz'})} as unknown as SupabaseClient,job as CampaignJob)}finally{globalThis.fetch=original}
 assert.ok(String(prepared.body.text).includes('O‘zbekcha'));assert.deepEqual(job,before)
})
