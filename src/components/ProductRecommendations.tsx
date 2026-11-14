import { useEffect, useState } from 'react'
import ProductCard from './ProductCard'
import { useStore, filterVisibleProducts } from '../store/useStore'
import { getProducts, supabase } from '../lib/supabase'
import { readAll } from '../lib/readAll'
import { dataCache } from '../lib/resourceCache'
import { storeApi } from '../lib/api'
import { recommendProducts } from '../lib/recommendations'
export default function ProductRecommendations({product}:{product:any}){
 const {language,saleModeEnabled,ensureCategories}=useStore(),ru=language==='ru',categories=ensureCategories()
 const key=`catalog:recommendations:${product.id}:${saleModeEnabled}:${window.Telegram?.WebApp.initDataUnsafe.user?.id||'guest'}`
 const [data,setData]=useState<{similar:any[];outfit:any[]}>(()=>dataCache.get(key)||{similar:[],outfit:[]})
 useEffect(()=>{let active=true;setData(dataCache.get(key)||{similar:[],outfit:[]});void Promise.all([getProducts(),supabase.from('product_recommendations').select('target_id,kind,position').eq('product_id',product.id),dataCache.load('catalog:variant-availability',async()=>{const {data,error}=await readAll(supabase.rpc('store_catalog_variants'));if(error)throw error;return data||[]},10000),window.Telegram?.WebApp.initData?storeApi('preferences').catch(()=>({data:{sizes:[]}})):Promise.resolve({data:{sizes:[]}})]).then(([products,links,variants,prefs])=>{if(links.error)throw links.error;const result=recommendProducts(product,filterVisibleProducts(products,categories),links.data||[],variants as any[],prefs.data?.sizes||[],saleModeEnabled);dataCache.set(key,result,60000);if(active)setData(result)}).catch(()=>{/* Recommendations must not block the purchase flow. */});return()=>{active=false}},[product.id,saleModeEnabled,categories,key])
 return <>{(['similar','outfit'] as const).map(kind=>data[kind].length>0&&<section key={kind} className="mt-5 px-4 pb-4"><h2 className="font-bold text-lg text-[#1B2A4A] dark:text-white mb-3">{kind==='similar'?(ru?'Вам также может понравиться':'Sizga ham yoqishi mumkin'):(ru?'Дополните образ':'Obrazni to‘ldiring')}</h2><div className="grid grid-cols-2 gap-3">{data[kind].map(p=><ProductCard key={p.id} product={p} placement={`recommendation:${product.id}:${kind}`}/>)}</div></section>)}</>
}
