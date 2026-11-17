import {useEffect,useState} from 'react'
import {getBrands,supabase} from './supabase'
import {dataCache} from './resourceCache'
import {chooseSizeChart} from './sizeCharts'
export const sizeChartColumns='id,title_ru,title_uz,category_id,subcategory_id,brand_id,product_id,columns_ru,columns_uz,rows,is_active,updated_at,size_mapping'
export const chartKey=(p:any)=>`catalog:product-chart:${JSON.stringify([p.id,p.category,p.subcategory,p.brand_id,p.brand])}`
type Result={chart:any|null}
type State={key:string;result:Result|null;error:boolean;loading:boolean}
export async function getCategoryCharts(category:string):Promise<any[]>{
 return dataCache.load(`catalog:chart-rows:${category}`,async()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined
  try{return await Promise.race([Promise.resolve().then(async()=>{
   const {data,error}=await supabase.from('size_charts').select(sizeChartColumns).eq('category_id',category).eq('is_active',true).abortSignal(controller.signal)
   if(error)throw error;return data||[]
  }),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Size chart request timed out'))},8000)})])}finally{clearTimeout(timer)}
 },30_000)
}
export async function loadProductChart(product:any):Promise<Result>{
 return dataCache.load(chartKey(product),async()=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  try{return await Promise.race([Promise.resolve().then(async()=>{
   const rows=await getCategoryCharts(product.category)
   // Brand names need resolution only if a relevant brand chart exists.
   const brands=rows.some(c=>c.brand_id&&!c.product_id)&&!product.brand_id?await getBrands():[]
   return {chart:chooseSizeChart(rows,product,brands)}
  }),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new Error('Size chart request timed out'))},8000)})])}
  finally{clearTimeout(timer)}
 },30_000)
}
export function useProductSizeChart(product:any){
 const key=chartKey(product)
 const [state,setState]=useState<State>(()=>({key,result:dataCache.get(key,60000),error:false,loading:!dataCache.get(key,60000)}))
 const [attempt,setAttempt]=useState(0)
 useEffect(()=>{
  let active=true,running=false
  const load=async()=>{if(running||document.hidden)return;running=true
   const cached=dataCache.get<Result>(key,60000)
   setState({key,result:cached,error:false,loading:!cached})
   try{const result=await loadProductChart(product);if(active)setState({key,result,error:false,loading:false})}
   catch{if(active)setState(old=>({...old,key,error:true,loading:false}))}finally{running=false}
  }
  if(!product.category)return;void load();const timer=setInterval(()=>void load(),30_000)
  const focus=()=>void load();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus)
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus)}
 },[key,attempt])
 const current=state.key===key?state:{key,result:null,error:false,loading:true}
 return {...current,chart:current.result?.chart||null,retry:()=>setAttempt(n=>n+1)}
}
