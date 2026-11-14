export const STORE_ORIGIN='https://loft-store-24bz.vercel.app'
export type StoreTarget={type:'product'|'brand'|'category'|'new'|'sale'|'home';id?:string;variant?:string}
let configuration: {base:string|null;expires:number}|null=null
let pending:Promise<string|null>|null=null
/** Discover only public bot identity. Never expose token or assume an app short name. */
export async function miniAppBase():Promise<string|null>{
 if(configuration&&configuration.expires>Date.now())return configuration.base
 if(pending)return pending
 pending=(async()=>{
  const token=process.env.TELEGRAM_BOT_TOKEN
  if(!token)throw new Error('Bot unavailable')
  const response=await fetch(`https://api.telegram.org/bot${token}/getMe`,{signal:AbortSignal.timeout(4000)})
  const r=await response.json(),bot=r.result
  if(!response.ok||!r.ok||!bot?.is_bot||!/^[a-zA-Z0-9_]{5,32}$/.test(bot.username||''))throw new Error('Bot unavailable')
  const short=process.env.TELEGRAM_MINI_APP_SHORT_NAME
  const base=short&&/^[a-zA-Z0-9_]{1,64}$/.test(short)?`https://t.me/${bot.username}/${short}`:bot.has_main_web_app===true?`https://t.me/${bot.username}`:null
  configuration={base,expires:Date.now()+600000};return base
 })().finally(()=>{pending=null})
 return pending
}
export function launchParameter(target:StoreTarget){return Buffer.from(JSON.stringify(target)).toString('base64url')}
export function webTarget(target:StoreTarget){
 if(target.type==='product')return `${STORE_ORIGIN}/product/${encodeURIComponent(target.id||'')}${target.variant?`?variant=${encodeURIComponent(target.variant)}`:''}`
 if(target.type==='brand')return `${STORE_ORIGIN}/brands?brand=${encodeURIComponent(target.id||'')}`
 if(target.type==='category')return `${STORE_ORIGIN}/?launch=${launchParameter(target)}`
 if(target.type==='new'||target.type==='sale')return `${STORE_ORIGIN}/?launch=${launchParameter(target)}`
 return STORE_ORIGIN
}
export async function targetLink(target:StoreTarget){const base=await miniAppBase();return base?`${base}?startapp=${launchParameter(target)}`:webTarget(target)}
