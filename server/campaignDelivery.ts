import type {SupabaseClient} from '@supabase/supabase-js'
import {campaignMessage,campaignVersion,type CampaignContent} from '../src/lib/campaignMessage.ts'
import {targetLink,type StoreTarget} from './links.ts'
export type CampaignJob={kind:'campaign'|'test';id:string;lease:string;user_id?:string;language?:string;payload:CampaignContent}
class PreparationError extends Error { permanent=true }
export type DeliveryResult={outcome:'sent'|'failed'|'skipped'|'uncertain'|'retry';error?:string;retryAfter?:number;messageId?:number;blocked?:boolean}
export async function prepareCampaignDelivery(db:SupabaseClient,job:CampaignJob){
 const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)throw new PreparationError('Bot unavailable')
 let chat=job.user_id
 if(job.kind==='test'){
  chat=process.env.TELEGRAM_CAMPAIGN_TEST_CHAT_ID||process.env.TELEGRAM_MANAGER_CHAT_ID
  if(!chat){const {data,error}=await db.rpc('store_manager_chat');if(error)throw new Error('Test recipient unavailable');chat=String(data||'')}
 }
 if(!/^-?[1-9][0-9]{0,15}$/.test(chat||''))throw new PreparationError('Recipient unavailable')
 const c=campaignVersion(job.payload,job.language)
 let text:ReturnType<typeof campaignMessage>
 try{text=campaignMessage(c)}catch{throw new PreparationError('Invalid message')}
 const url=await targetLink({type:c.target_type as StoreTarget['type'],id:c.target_id||undefined})
 const body:Record<string,unknown>={chat_id:chat,parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:c.button_label,url}]]}}
 let method='sendMessage'
 if(c.image_ref){
  const path=c.image_ref.startsWith('private:campaign-media/')?c.image_ref.slice('private:campaign-media/'.length):''
  if(!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path))throw new PreparationError('Campaign image unavailable')
  const {data,error}=await db.storage.from('campaign-media').createSignedUrl(path,900)
  if(error){if(Number((error as any).statusCode)===404)throw new PreparationError('Campaign image unavailable');throw new Error('Campaign image temporarily unavailable')}
  if(!data?.signedUrl)throw new PreparationError('Campaign image unavailable')
  method='sendPhoto';body.photo=data.signedUrl;body.caption=text.html
 }else{body.text=text.html;body.link_preview_options={is_disabled:true}}
 return {token,method,body}
}
/** Never include Telegram URL/token or raw network errors in logs or persisted diagnostics. */
export async function deliverCampaign(prepared:Awaited<ReturnType<typeof prepareCampaignDelivery>>):Promise<DeliveryResult>{
 try{
  const response=await fetch(`https://api.telegram.org/bot${prepared.token}/${prepared.method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(prepared.body),signal:AbortSignal.timeout(8000)})
  const result=await response.json()
  if(response.ok&&result.ok===true)return {outcome:'sent',messageId:Number.isSafeInteger(result.result?.message_id)?result.result.message_id:undefined}
  const code=Number(result.error_code||response.status)
  if(code===429)return {outcome:'retry',error:'Ограничение Telegram: отправка отложена',retryAfter:Math.min(86400,Math.max(1,Math.ceil(Number(result.parameters?.retry_after)||60)))}
  if(code===403)return {outcome:'failed',error:'Бот заблокирован или отправка недоступна',blocked:true}
  if(code>=500)return {outcome:'retry',error:'Временная ошибка Telegram'}
  return {outcome:'failed',error:code===400?'Telegram отклонил содержимое или получателя':'Telegram отклонил отправку'}
 }catch{return {outcome:'uncertain',error:'Ответ Telegram не получен. Автоматический повтор отключён во избежание дубля'}}
}
export async function runCampaignBatch(db:SupabaseClient,options:{max?:number;pause?:()=>Promise<void>;now?:()=>number}={}){
 const now=options.now||Date.now,started=now();let processed=0
 for(let i=0;i<(options.max||20)&&now()-started<35000;i++){
  const {data:job,error}=await db.rpc('store_campaign_claim');if(error)throw new Error('Campaign claim unavailable');if(!job?.id)break
  let result:DeliveryResult
  try{
   const prepared=await prepareCampaignDelivery(db,job)
   // Recheck after preparing image/link, immediately before the external send.
   const {data:ready,error}=await db.rpc('store_campaign_preflight',{p_kind:job.kind,p_id:job.id,p_lease:job.lease})
   if(error)result={outcome:'retry',error:'Не удалось проверить согласие перед отправкой'}
   else if(ready!==true)result={outcome:'skipped',error:'Рассылка остановлена, согласие отозвано или цель недоступна'}
   else result=await deliverCampaign(prepared)
  }catch(error){result={outcome:error instanceof PreparationError?'failed':'retry',error:'Не удалось подготовить сообщение: проверьте фотографию и настройки бота'}}
  if(job.kind==='test'&&result.outcome==='retry')result.error='Тест не отправлен: временная ошибка или ограничение Telegram. Повторите позже.'
  const args={p_kind:job.kind,p_id:job.id,p_lease:job.lease,p_outcome:result.outcome,p_error:result.error||null,p_retry_after:result.retryAfter||null,p_message_id:result.messageId||null,p_blocked:job.kind==='campaign'&&result.blocked===true}
  const {error:finishError}=await db.rpc('store_campaign_finish',args)
  if(finishError){await db.rpc('store_campaign_finish',{...args,p_outcome:'uncertain',p_error:'Результат отправки не удалось подтвердить',p_blocked:false});break}
  processed++
  if(result.retryAfter)break
  await (options.pause?options.pause():new Promise<void>(resolve=>setTimeout(resolve,450)))
 }
 // A zero-work call never recursively wakes itself (e.g. service priority or cooldown).
 if(processed>0)await db.rpc('store_wake_campaigns')
 return processed
}
