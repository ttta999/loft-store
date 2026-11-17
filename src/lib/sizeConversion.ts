import type {SavedSize} from './preferences'
import {personalSizeHint,validSizeChart} from './sizeCharts.ts'
export type SizeConfidence='exact'|'approximate'|'ambiguous'|'unknown'
export type SizeFamily='footwear'|'trousers'|'clothing'
type Row={systems:Record<string,string>;fit:'regular';measurement?:{kind:string;value:string}}
export const sizeSources={
 footwear:'https://www.hugoboss.com/in/en/size-charts/menswear-shoes/size-chart_BOSS_m4.html',
 trousers:'https://www.hugoboss.com/size-charts/menswear-trousers/size-chart_BOSS_btptm8.html',
 clothing:'https://www.hugoboss.com/size-charts/menswear-clothing/size-chart_BOSS_btptm1.html',
} as const
// Published men's regular-fit rows, not an assertion of any other brand's fit.
const alpha=['XS','S','M','L','XL','XXL','XXXL','XXXL']
export const universalSizes:Record<SizeFamily,Row[]>={
 footwear:Array.from({length:15},(_,i)=>({fit:'regular',systems:{EU:String(39+i*.5),IT:String(39+i*.5),RU:String(39+i*.5),UK:String(5+i*.5),US:String(6+i*.5)}})),
 clothing:alpha.map((a,i)=>({fit:'regular',systems:{alphabetical:a,EU:String(44+i*2),IT:String(44+i*2),RU:String(44+i*2),UK:`${34+i*2}R`,US:`${34+i*2}R`}})),
 trousers:alpha.map((a,i)=>({fit:'regular',systems:{alphabetical:a,EU:String(44+i*2),IT:String(44+i*2),RU:`${28+i*2}R`,UK:`${28+i*2}R`,US:`${28+i*2}R`},measurement:{kind:'jeans/chino width (inches); not dress-trouser size',value:['29/30','31/32','33','34/35','36','38','40','40'][i]}})),
}
export function sizeFamily(category:string,subcategory:string):SizeFamily|undefined{
 if(category==='shoes')return 'footwear'
 if(category!=='clothes')return
 if(subcategory==='trousers')return 'trousers'
 if(['outerwear','sweaters','tshirts','hoodies','sweatshirts','jackets'].includes(subcategory))return 'clothing'
 // Jeans waist/inseam, collars, children's and one-size accessories need their own rules.
}
export function universalOptions(category:string,subcategory:string){
 const family=sizeFamily(category,subcategory),result:Record<string,string[]>={}
 if(family)for(const row of universalSizes[family])for(const [system,size] of Object.entries(row.systems))result[system]=[...new Set([...(result[system]||[]),size])]
 return result
}
export function convertSize({category,subcategory,sourceSize,sourceSystem,targetSystem,actual}:{category:string;subcategory:string;sourceSize:string;sourceSystem:string;targetSystem:string;actual:string[]}):{confidence:SizeConfidence;candidates:string[];sources:string[];reason?:string}{
 const unknown={confidence:'unknown' as const,candidates:[],sources:[]}
 const family=sizeFamily(category,subcategory);if(!family||!sourceSize||sourceSystem==='numeric')return unknown
 const rows=universalSizes[family].filter(row=>row.systems[sourceSystem]===sourceSize)
 if(!rows.length)return unknown
 const unspecified=targetSystem==='numeric'
 const candidates=[...new Set(rows.flatMap(row=>unspecified?Object.entries(row.systems).filter(([key])=>key!=='alphabetical').map(([,value])=>value):[row.systems[targetSystem]]).filter(value=>value&&actual.includes(value)))]
 return candidates.length?{confidence:unspecified||candidates.length>1?'ambiguous':'approximate',candidates,sources:[sizeSources[family]],reason:unspecified?'unspecified-system':'brand-fit'}:unknown
}
export function productSizeSuggestion(chart:{is_active?:boolean;size_mapping?:{source_system:string}}|null,product:{id?:string;category:string;subcategory:string;size_type:string},saved:SavedSize[],actual:string[]){
 const exact=personalSizeHint(chart,product,saved,actual)
 if(exact)return {confidence:'exact' as SizeConfidence,candidates:[exact],sources:[] as string[]}
 const scoped=saved.filter(s=>s.category===product.category&&s.subcategory===product.subcategory)
 // Never replace a contradictory or unmatched confirmed correspondence with a generic guess.
 const mapping=chart?.size_mapping
 if(chart&&validSizeChart(chart)&&chart.is_active&&mapping&&scoped.some(s=>s.system===mapping.source_system))return {confidence:'ambiguous' as SizeConfidence,candidates:[],sources:[] as string[]}
 const results=scoped.map(s=>convertSize({category:product.category,subcategory:product.subcategory,sourceSize:s.size,sourceSystem:s.system,targetSystem:product.size_type,actual}))
 const candidates=[...new Set(results.flatMap(r=>r.candidates))],sources=[...new Set(results.flatMap(r=>r.sources))]
 return {confidence:(candidates.length>1||results.some(r=>r.confidence==='ambiguous')?'ambiguous':candidates.length?'approximate':'unknown') as SizeConfidence,candidates,sources}
}
