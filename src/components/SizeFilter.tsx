import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { usePageState } from '../lib/usePageState'
import { storeApi } from '../lib/api'
import { supabase } from '../lib/supabase'
import { readAll } from '../lib/readAll'
import type { SavedSize } from '../lib/preferences'
export type { PublicVariant } from '../lib/sizeAvailability'
import { matchesSize, type PublicVariant } from '../lib/sizeAvailability'
export function useSizeFilter(){
 const {language,ensureCategories}=useStore(),ru=language==='ru',categories=ensureCategories()||[]
 const [selection,setSelection]=usePageState('sizeSelection',''),[mine,setMine]=usePageState<SavedSize[]>('mySizes',[]),[variants,setVariants]=useState<PublicVariant[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('')
 const active=!!selection
 useEffect(()=>{if(!active)return;let alive=true,running=false;const load=async()=>{if(running||document.hidden)return;running=true;setLoading(true);try{const {data,error}=await readAll(supabase.rpc('store_catalog_variants'));if(error)throw error;if(alive){setVariants((data||[]) as PublicVariant[]);setError('')}}catch{if(alive)setError(ru?'Не удалось проверить наличие':'Mavjudlik tekshirilmadi')}finally{running=false;if(alive)setLoading(false)}};void load();const timer=setInterval(()=>void load(),15000);window.addEventListener('focus',load);window.addEventListener('online',load);return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',load);window.removeEventListener('online',load)}},[active,ru])
 const options=categories.flatMap(c=>c.subcategories.filter(s=>s.id!=='all').flatMap(s=>s.sizes.map(size=>({value:JSON.stringify({category:c.id,subcategory:s.id,system:s.size_type,size}),label:`${s[ru?'name_ru':'name_uz']}: ${size}`}))))
 const sizes:SavedSize[]=selection==='mine'?mine:selection?(()=>{try{return [JSON.parse(selection)]}catch{return []}})():[]
 const chooseMine=async()=>{setError('');try{const {data}=await storeApi('preferences');setMine(data.sizes||[]);setSelection('mine');if(!data.sizes?.length)setError(ru?'Сначала сохраните размеры в профиле':'Avval profilda o‘lchamlarni saqlang')}catch(e){setError(e instanceof Error?e.message:'Ошибка')}}
 const control=<div className="p-3.5 text-[#1B2A4A] dark:text-white"><label className="block text-xs font-bold mb-2">{ru?'Доступный размер':'Mavjud o‘lcham'}<select className="w-full mt-2 p-2.5 rounded-xl bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border text-base font-normal" value={selection} onChange={e=>setSelection(e.target.value)}><option value="">{ru?'Все размеры':'Barcha o‘lchamlar'}</option>{selection==='mine'&&<option value="mine">{ru?'Мой размер':'Mening o‘lchamim'}</option>}{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label><button type="button" className="text-sm underline" onClick={()=>void chooseMine()}>{ru?'Мой размер':'Mening o‘lchamim'}</button>{loading&&<p role="status" className="text-xs mt-2">{ru?'Проверяем наличие...':'Mavjudlik tekshirilmoqda...'}</p>}{error&&<p role="alert" className="text-xs mt-2">{error}</p>}</div>
 return {control,active,clear:()=>setSelection(''),matches:(product:any,colorId?:string|null)=>!active||matchesSize(product,variants,sizes,colorId),selection,variants,mine}
}
