import type {SupabaseClient} from '@supabase/supabase-js'
import {customerTexts} from './customerTexts.ts'
export type CustomerLanguage='ru'|'uz'
/** Read after claim and before formatting. No language-specific event or persistent language cache. */
export async function customerLanguage(db:SupabaseClient,userId:string):Promise<CustomerLanguage>{
 const {data,error}=await db.rpc('store_customer_language',{p_user:userId});if(error)throw new Error('Customer language unavailable')
 return data==='uz'?'uz':'ru'
}
export function customerTranslator(language:CustomerLanguage){
 return (source:TemplateStringsArray|string,...values:unknown[])=>{
  const key=typeof source==='string'?source:source.reduce((result,part,index)=>result+(index?`{${index-1}}`:'')+part,'')
  const template=language==='uz'?(customerTexts[key]??key):key
  // Replace placeholders once; dynamic addresses, comments and URLs are never translated.
  return template.replace(/\{(\d+)\}/g,(_,index)=>String(values[Number(index)]??''))
 }
}
