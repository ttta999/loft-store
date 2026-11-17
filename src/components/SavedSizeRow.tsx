import {useEffect,useState} from 'react'
import SizeSelector from './SizeSelector'
import {getCategoryCharts} from '../lib/productSizeChart'
import {validSizeChart} from '../lib/sizeCharts'
import type {SavedSize} from '../lib/preferences'
/** Foreign systems are offered only when an active, explicitly configured table supplies them. */
export default function SavedSizeRow({sub,category,language,saved,onSave}:{sub:any;category:string;language:'ru'|'uz';saved:SavedSize[];onSave:(system:string,size?:string)=>Promise<void|boolean>}){
 const [system,setSystem]=useState(sub.size_type),[charts,setCharts]=useState<any[]>([]),ru=language==='ru'
 useEffect(()=>{let active=true;void getCategoryCharts(category).then(rows=>{if(active)setCharts(rows)}).catch(()=>{});return()=>{active=false}},[category])
 const scoped=charts.filter(c=>validSizeChart(c)&&(!c.subcategory_id||c.subcategory_id===sub.id)&&c.size_mapping)
 const systems=[...new Set([sub.size_type,...scoped.map(c=>c.size_mapping.source_system)])]
 const sizes=system===sub.size_type?sub.sizes:[...new Set(scoped.filter(c=>c.size_mapping.source_system===system).flatMap(c=>c.rows.map((r:string[])=>r[c.size_mapping.source_column])).filter((s:unknown)=>typeof s==='string'&&s.trim()))] as string[]
 const label=ru?sub.name_ru:sub.name_uz
 return <div>{systems.length>1&&<label className="flex items-center justify-between gap-3 px-4 pt-3 text-xs text-[#8A8275] dark:text-gray-300">{ru?'Система размеров':'O‘lcham tizimi'}<select aria-label={`${label}: ${ru?'система размеров':'o‘lcham tizimi'}`} className="p-2 rounded-xl bg-[#F5F1E8] dark:bg-dark-accent text-[#1B2A4A] dark:text-white text-base" value={system} onChange={e=>setSystem(e.target.value)}>{systems.map(s=><option key={s} value={s}>{s==='numeric'?(ru?'Цифровая':'Raqamli'):s==='alphabetical'?(ru?'Буквенная':'Harfli'):s}</option>)}</select></label>}<SizeSelector label={label} sizeType={system==='alphabetical'?'alphabetical':'numeric'} allSizes={sizes} availableSizes={sizes} selectedSize={saved.find(s=>s.system===system)?.size||null} language={language} profile compact onSelect={size=>onSave(system,size)} onRemove={()=>onSave(system)}/></div>
}
