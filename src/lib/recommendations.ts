import { getEffectivePriceUsd } from './pricing.ts'
import type { SavedSize } from './preferences'
import type { PublicVariant } from './sizeAvailability.ts'
export function recommendProducts(product:any, products:any[], links:any[], variants:PublicVariant[], sizes:SavedSize[], sale=false){
 const available=new Set(variants.filter(v=>v.available).map(v=>v.product_id))
 const pool=products.filter(p=>p.id!==product.id&&p.is_active!==false&&available.has(p.id))
 const manual=(kind:string)=>links.filter(l=>l.kind===kind).sort((a,b)=>a.position-b.position).map(l=>pool.find(p=>p.id===l.target_id)).filter(Boolean).filter((p,i,all)=>all.findIndex(v=>v.id===p.id)===i).slice(0,6)
 const score=(p:any)=> (p.subcategory===product.subcategory?8:0)+(p.brand&&p.brand===product.brand?4:0)+(sizes.some(s=>s.category===p.category&&s.subcategory===p.subcategory&&s.system===p.size_type&&variants.some(v=>v.product_id===p.id&&v.available&&v.size_value===s.size))?2:0)
 const price=getEffectivePriceUsd(product,sale)
 const auto=pool.filter(p=>p.category===product.category&&getEffectivePriceUsd(p,sale)>=price*.5&&getEffectivePriceUsd(p,sale)<=price*2).sort((a,b)=>score(b)-score(a)||Math.abs(getEffectivePriceUsd(a,sale)-price)-Math.abs(getEffectivePriceUsd(b,sale)-price)||String(a.id).localeCompare(String(b.id))).slice(0,6)
 const similar=manual('similar');return {similar:similar.length?similar:auto,outfit:manual('outfit')}
}
