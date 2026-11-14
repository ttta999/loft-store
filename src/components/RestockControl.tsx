import {useEffect,useState} from 'react'
import {Bell,Check,X} from 'lucide-react'
import {toast} from 'sonner'
import {storeApi} from '../lib/api'
import {dataCache} from '../lib/resourceCache'
import {readAll} from '../lib/readAll'
import {supabase} from '../lib/supabase'
import type {PublicVariant} from './SizeFilter'
export function useProductVariants(productId?:string){
 const [variants,setVariants]=useState<PublicVariant[]>(()=>dataCache.get<PublicVariant[]>('catalog:variant-availability')||[])
 useEffect(()=>{if(!productId)return;let active=true,running=false;const load=async()=>{if(running||document.hidden)return;running=true;try{const rows=await dataCache.load('catalog:variant-availability',async()=>{const {data,error}=await readAll(supabase.rpc('store_catalog_variants'));if(error)throw error;return (data||[]) as PublicVariant[]},10000);if(active)setVariants(rows)}catch{/* Stock is revalidated before adding to cart. */}finally{running=false}};void load();const timer=setInterval(()=>void load(),15000);return()=>{active=false;clearInterval(timer)}},[productId])
 return variants.filter(v=>v.product_id===productId)
}
export function RestockControl({variant,product,color,language}:{variant:PublicVariant;product:any;color?:string;language:string}){
 const [subscription,setSubscription]=useState<any>(null),[busy,setBusy]=useState(false),[checking,setChecking]=useState(true),ru=language==='ru'
 useEffect(()=>{let active=true;setSubscription(null);setChecking(true);if(window.Telegram?.WebApp.initData)void storeApi('restocks').then(r=>{if(active)setSubscription((r.data||[]).find((s:any)=>s.variant_id===variant.id)||null)}).catch(()=>{}).finally(()=>{if(active)setChecking(false)});else setChecking(false);return()=>{active=false}},[variant.id])
 const toggle=async()=>{if(busy||checking)return;setBusy(true);try{const r=await storeApi(subscription?'cancelRestock':'subscribeRestock',subscription?{id:subscription.id}:{variantId:variant.id});setSubscription((r.data||[]).find((s:any)=>s.variant_id===variant.id)||null);toast.success(subscription?(ru?'Подписка отменена':'Obuna bekor qilindi'):(ru?'Сообщим вам, когда этот размер снова появится в наличии':'Bu o‘lcham yana mavjud bo‘lganda xabar beramiz'))}catch(e){toast.error(e instanceof Error?e.message:'Ошибка')}finally{setBusy(false)}}
 return <div className="mt-4"><p className="text-sm mb-3 text-[#8A8275] dark:text-gray-300">{language==='ru'?product.name_ru:product.name_uz||product.name_ru} · {variant.size_value}{color?` · ${color}`:''}</p><button disabled={busy||checking} className="w-full min-h-[60px] p-4 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] font-bold flex items-center justify-center gap-2 disabled:opacity-50" onClick={()=>void toggle()}>{subscription?<Check size={20}/>:<Bell size={20}/>}{busy?(ru?'Сохраняем...':'Saqlanmoqda...'):subscription?(ru?'Вы подписаны — отменить':'Obuna mavjud — bekor qilish'):(ru?'Сообщить о поступлении':'Kelganda xabar berish')}</button></div>
}
export function RestockSubscriptions({language}:{language:string}){
 const [rows,setRows]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),ru=language==='ru'
 useEffect(()=>{let active=true;void storeApi('restocks').then(r=>{if(active)setRows(r.data||[])}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
 return <div data-loft-content className="p-4 pb-24 text-[#1B2A4A] dark:text-white"><div className="bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border rounded-2xl p-4 mb-3"><h1 className="text-xl font-bold">{ru?'Уведомления о поступлении':'Kelishi haqida xabarlar'}</h1></div>{loading||error||!rows.length?<p role={error?'alert':'status'} className="p-4 text-sm">{error|| (loading?(ru?'Загрузка...':'Yuklanmoqda...'):(ru?'Активных подписок пока нет':'Faol obunalar yo‘q'))}</p>:rows.map(s=><article key={s.id} className="bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border rounded-2xl p-4 mb-3 flex items-center gap-3">{s.image&&<img src={s.image} alt="" className="w-14 h-14 rounded-xl object-cover"/>}<div className="flex-1 min-w-0"><h2 className="font-bold text-sm">{ru?s.name_ru:s.name_uz||s.name_ru}</h2><p className="text-xs text-[#8A8275] dark:text-gray-300 mt-1">{s.size}{s.color_ru?` · ${ru?s.color_ru:s.color_uz||s.color_ru}`:''}</p></div><button disabled={!!busy} aria-label={ru?'Отменить подписку':'Obunani bekor qilish'} onClick={async()=>{setBusy(s.id);try{const r=await storeApi('cancelRestock',{id:s.id});setRows(r.data||[])}catch(e:any){toast.error(e.message)}finally{setBusy('')}}}><X size={18}/></button></article>)}</div>
}
