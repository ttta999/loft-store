import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { X, Ruler, ChevronRight } from 'lucide-react'
import SurfaceDialog from './SurfaceDialog'
import { useScrollLock } from '../lib/useScrollLock'
import {useProductSizeChart} from '../lib/productSizeChart'
export default function ProductSizeChart({language,resource}:{product:any;language:string;resource:ReturnType<typeof useProductSizeChart>}){
 const {chart,error,retry}=resource
 const [open,setOpen]=useState(false),[locked,setLocked]=useState(false)
 useScrollLock(locked)
 useEffect(()=>{if(!chart){setOpen(false);setLocked(false)}},[chart])
 const ru=language==='ru'
 if(!chart)return error?<div role="status" className="text-xs text-[#8A8275] dark:text-gray-300 mt-3"><button className="min-h-11 underline" onClick={retry}>{ru?'Не удалось проверить таблицу размеров. Повторить':'O‘lchamlar jadvali tekshirilmadi. Qayta urinish'}</button></div>:null
 return <>
  <button data-dialog-origin="size-chart" className="w-full min-h-11 px-3.5 py-2 text-sm font-medium flex items-center gap-3 mt-3 mb-3 rounded-xl text-[#1B2A4A] dark:text-white hover:bg-[#E8E2D5]/50 dark:hover:bg-dark-accent transition-colors" onClick={()=>{setLocked(true);setOpen(true)}}><Ruler size={18}/><span className="flex-1 text-left">{ru?'Таблица размеров':'O‘lchamlar jadvali'}</span><ChevronRight size={16}/></button>
  <AnimatePresence onExitComplete={()=>setLocked(false)}>{open&&<SurfaceDialog origin="size-chart" role="dialog" label={ru?'Таблица размеров':'O‘lchamlar jadvali'} className="loft-modal fixed inset-0 z-[90] bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={()=>setOpen(false)}>
   <section className="w-full max-w-lg max-h-[75dvh] overflow-y-auto bg-[#FBF9F4] dark:bg-dark-card text-[#1B2A4A] dark:text-white rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-4" onClick={e=>e.stopPropagation()}>
    <header className="flex justify-between items-center gap-3 mb-4"><h2 className="font-bold text-lg">{chart?chart[ru?'title_ru':'title_uz']:(ru?'Таблица размеров':'O‘lchamlar jadvali')}</h2><button data-loft-dismiss aria-label={ru?'Закрыть':'Yopish'} onClick={()=>setOpen(false)}><X size={22}/></button></header>
    {<div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{chart[ru?'columns_ru':'columns_uz'].map((v:string,i:number)=><th key={i} className="p-2 border-b border-[#E8E2D5] dark:border-dark-border whitespace-nowrap">{v}</th>)}</tr></thead><tbody>{chart.rows.map((row:string[],i:number)=><tr key={i}>{row.map((v,j)=><td key={j} className="p-2 border-b border-[#E8E2D5] dark:border-dark-border whitespace-nowrap">{v}</td>)}</tr>)}</tbody></table></div>}
   </section>
  </SurfaceDialog>}</AnimatePresence>
 </>
}
