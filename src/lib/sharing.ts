import {productParameter} from './launchTarget'
import { dataCache } from './resourceCache'
import { storeApi } from './api'
export function shareConfig(){return dataCache.load('catalog:share-config',async()=>{const response=await fetch('/api/publicConfig');if(!response.ok)throw new Error('Sharing configuration unavailable');return response.json() as Promise<{miniAppBase:string|null}>},600000)}
export async function productLink(id:string){const config=await shareConfig().catch(()=>null);return config?.miniAppBase?`${config.miniAppBase}?startapp=${productParameter(id)}`:`${location.origin}/product/${encodeURIComponent(id)}`}
export async function shareProduct(product:any,title:string,price:string,currency:string,language:string){
 const tg=window.Telegram?.WebApp as any
 if(tg?.initData&&typeof tg.shareMessage==='function'){
  try{const prepared=await storeApi('prepareShare',{productId:product.id,currency,language});const sent=await new Promise<boolean>(resolve=>tg.shareMessage(prepared.id,resolve));return sent}catch{/* Older clients and unsupported prepared messages use the standard link picker. */}
 }
 const url=await productLink(product.id),text=`${title}\n\n${language==='ru'?'Цена':'Narx'}: ${price}\n\n${language==='ru'?'LOFT Store — брендовая мужская одежда.':'LOFT Store — brend erkaklar kiyimi.'}`
 if(tg?.initData&&typeof tg.openTelegramLink==='function'){tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);return true}
 if(navigator.share){try{await navigator.share({title,text,url});return true}catch(e){if(e instanceof Error&&e.name==='AbortError')return false}}
 await navigator.clipboard.writeText(url);return 'copied' as const
}
