import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { X, Ruler } from 'lucide-react'
import SurfaceDialog from './SurfaceDialog'
import { useScrollLock } from '../lib/useScrollLock'
import { getBrands, supabase } from '../lib/supabase'
import { dataCache } from '../lib/resourceCache'
export const sizeChartColumns='id,title_ru,title_uz,category_id,subcategory_id,brand_id,product_id,columns_ru,columns_uz,rows,is_active,updated_at'
import {chooseSizeChart} from '../lib/sizeCharts'
export default function ProductSizeChart({product,language}:{product:any;language:string}){
 const [chart,setChart]=useState<any>(null),[open,setOpen]=useState(false),[locked,setLocked]=useState(false),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false)
 useScrollLock(locked)
 useEffect(()=>{let active=true;setLoading(true);setChart(null);setFailed(false);void Promise.all([dataCache.load(`catalog:charts:${product.category}`,async()=>{const {data,error}=await supabase.from('size_charts').select(sizeChartColumns).eq('category_id',product.category).eq('is_active',true);if(error)throw error;return data||[]},60_000),getBrands()]).then(([rows,brands])=>{if(active)setChart(chooseSizeChart(rows,product,brands))}).catch(()=>{if(active)setFailed(true)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[product.id,product.category,product.subcategory,product.brand])
 const ru=language==='ru'
 return <>
  <button data-dialog-origin="size-chart" className="text-sm font-medium flex items-center gap-2 mt-3 text-[#8A8275] dark:text-gray-300" onClick={()=>{setLocked(true);setOpen(true)}}><Ruler size={16}/>{ru?'Таблица размеров':'O‘lchamlar jadvali'}</button>
  <AnimatePresence onExitComplete={()=>setLocked(false)}>{open&&<SurfaceDialog origin="size-chart" role="dialog" label={ru?'Таблица размеров':'O‘lchamlar jadvali'} className="loft-modal fixed inset-0 z-[90] bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={()=>setOpen(false)}>
   <section className="w-full max-w-lg max-h-[75dvh] overflow-y-auto bg-[#FBF9F4] dark:bg-dark-card text-[#1B2A4A] dark:text-white rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-4" onClick={e=>e.stopPropagation()}>
    <header className="flex justify-between items-center gap-3 mb-4"><h2 className="font-bold text-lg">{chart?chart[ru?'title_ru':'title_uz']:(ru?'Таблица размеров':'O‘lchamlar jadvali')}</h2><button data-loft-dismiss aria-label={ru?'Закрыть':'Yopish'} onClick={()=>setOpen(false)}><X size={22}/></button></header>
    {loading?<p>{ru?'Загрузка...':'Yuklanmoqda...'}</p>:chart?<div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{chart[ru?'columns_ru':'columns_uz'].map((v:string,i:number)=><th key={i} className="p-2 border-b border-[#E8E2D5] dark:border-dark-border whitespace-nowrap">{v}</th>)}</tr></thead><tbody>{chart.rows.map((row:string[],i:number)=><tr key={i}>{row.map((v,j)=><td key={j} className="p-2 border-b border-[#E8E2D5] dark:border-dark-border whitespace-nowrap">{v}</td>)}</tr>)}</tbody></table></div>:<p className="text-sm text-[#8A8275] dark:text-gray-300">{failed?(ru?'Не удалось загрузить таблицу. Уточните размер у менеджера.':'Jadval yuklanmadi. O‘lchamni menejerdan aniqlang.'):(ru?'Для этого товара таблица не добавлена. Уточните размер у менеджера.':'Bu mahsulot uchun jadval qo‘shilmagan. O‘lchamni menejerdan aniqlang.')}</p>}
   </section>
  </SurfaceDialog>}</AnimatePresence>
 </>
}
