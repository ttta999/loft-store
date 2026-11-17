import {useState} from 'react'
import {Bell,Info} from 'lucide-react'
import {toast} from 'sonner'
import {storeApi} from '../lib/api'
import {usePreferences} from '../lib/preferences'
import Collapse from './Collapse'
export default function MarketingConsent({language}:{language:string}){
 const {data,loading,error,retry}=usePreferences(),enabled=data?.marketing_enabled===true
 const [busy,setBusy]=useState(false),[expanded,setExpanded]=useState(false),ru=language==='ru'
 const toggle=async()=>{if(busy||loading)return;setBusy(true);try{
  const next=!enabled,tg=window.Telegram?.WebApp as any
  if(next&&typeof tg?.requestWriteAccess==='function'){const allowed=await new Promise<boolean>(resolve=>tg.requestWriteAccess(resolve));if(!allowed){toast.info(ru?'Чтобы получать новости, разрешите боту отправлять сообщения':'Yangiliklar uchun botga xabar yuborishga ruxsat bering');return}}
  await storeApi('marketingConsent',{enabled:next});toast.success(ru?'Настройка сохранена':'Sozlama saqlandi')
 }catch(e){toast.error(e instanceof Error?e.message:'Ошибка')}finally{setBusy(false)}}
 return <section className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 p-3.5 text-[#1B2A4A] dark:text-white"><div className="flex gap-3 items-center"><span className="w-9 h-9 flex items-center justify-center shrink-0 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border"><Bell size={16}/></span><div className="flex-1"><h3 className="font-medium text-sm">{ru?'Новости и предложения':'Yangiliklar va takliflar'}</h3></div><button type="button" aria-expanded={expanded} aria-label={ru?'О новости и предложениях':'Yangiliklar haqida'} onClick={()=>setExpanded(v=>!v)} className="min-h-11 min-w-11 flex items-center justify-center text-[#8A8275] dark:text-gray-300"><Info size={17}/></button><button type="button" role="switch" aria-checked={enabled} aria-label={ru?'Новости и предложения':'Yangiliklar va takliflar'} disabled={loading||busy||!!error} onClick={()=>void toggle()} className={`w-11 h-6 rounded-full p-0.5 flex items-center shrink-0 transition-colors disabled:opacity-50 ${enabled?'bg-[#1B2A4A] dark:bg-gold':'bg-[#E8E2D5] dark:bg-dark-accent'}`}><span className={`w-5 h-5 rounded-full bg-white dark:bg-dark-card block transition-transform duration-200 ${enabled?'translate-x-5':'translate-x-0'}`}/></button></div><Collapse open={expanded}><p className="text-xs leading-relaxed text-[#8A8275] dark:text-gray-300 pt-3">{ru?'Получайте новости о новых коллекциях, поступлениях и скидках LOFT Store. Уведомления о ваших заказах будут приходить независимо от этой настройки.':'LOFT Store yangi kolleksiyalari, kelgan mahsulotlar va chegirmalari haqida yangiliklar oling. Buyurtmalaringiz haqidagi xabarlar bu sozlamadan qat’i nazar yuboriladi.'}</p></Collapse>{error&&<p role="alert" className="text-xs mt-2">{error}</p>}{error&&<button type="button" disabled={loading} onClick={()=>void retry()} className="text-sm underline mt-2">{ru?'Повторить':'Qayta urinish'}</button>}</section>
}
