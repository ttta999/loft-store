/** A readable table needs real, rectangular cells in both languages. */
export function validSizeChart(c:any){
 return Array.isArray(c?.columns_ru)&&c.columns_ru.length>0&&Array.isArray(c.columns_uz)&&c.columns_uz.length===c.columns_ru.length&&[...c.columns_ru,...c.columns_uz].every(v=>typeof v==='string'&&v.trim())&&Array.isArray(c.rows)&&c.rows.length>0&&c.rows.every((row:any)=>Array.isArray(row)&&row.length===c.columns_ru.length&&row.every((v:any)=>typeof v==='string')&&row.some((v:string)=>v.trim()))
}
export function chooseSizeChart(charts:any[], product:any, brands:any[]){
 return charts.filter(c=>validSizeChart(c)&&c.is_active&&c.category_id===product.category&&(!c.subcategory_id||c.subcategory_id===product.subcategory)&&(!c.product_id||c.product_id===product.id)&&(!c.brand_id||c.product_id===product.id||c.brand_id===product.brand_id||c.brand_id===product.brand||brands.some(b=>b.id===c.brand_id&&[b.id,b.name].includes(product.brand_id||product.brand)))).sort((a,b)=>(b.product_id?100:0)+(b.brand_id?10:0)+(b.subcategory_id?1:0)-((a.product_id?100:0)+(a.brand_id?10:0)+(a.subcategory_id?1:0))||String(b.updated_at).localeCompare(String(a.updated_at)))[0]||null
}

const exactSize=(value:unknown)=>typeof value==='string'&&/^(?:[0-9]{1,3}(?:[.,][0-9]{1,2})?|[2-6]?X{0,3}[SML]|XXL|XXXL)$/i.test(value.trim())
/** Explicit cells only. Ranges, competing rows/saved systems and unknowns give no hint. */
export function personalSizeHint(chart:any,product:any,saved:any[],actual:string[]):string|undefined{
 const candidates=new Set<string>()
 const scoped=saved.filter(s=>s.category===product.category&&s.subcategory===product.subcategory)
 const m=chart?.size_mapping
 for(const s of scoped){
  if(s.system===product.size_type&&actual.includes(s.size))candidates.add(s.size)
  if(!exactSize(s.size)||!validSizeChart(chart)||!chart.is_active||chart.category_id!==product.category||(chart.subcategory_id&&chart.subcategory_id!==product.subcategory)||(chart.product_id&&chart.product_id!==product.id)||(chart.brand_id&&product.brand_id&&chart.brand_id!==product.brand_id)||!m||s.system!==m.source_system||!Number.isInteger(m.source_column)||!Number.isInteger(m.target_column)||m.source_column===m.target_column||m.source_column<0||m.target_column<0||m.source_column>=chart.columns_ru.length||m.target_column>=chart.columns_ru.length)continue
  const matches=chart.rows.filter((r:string[])=>r[m.source_column]?.trim()===s.size)
  const targets=matches.map((r:string[])=>r[m.target_column]?.trim())
  if(targets.some((v:string)=>!exactSize(v))||new Set(targets).size>1)return undefined
  for(const target of targets)if(actual.includes(target))candidates.add(target)
 }
 return candidates.size===1?[...candidates][0]:undefined
}
