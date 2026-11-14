import {createHash} from 'node:crypto'
import sharp from 'sharp'
import type {SupabaseClient} from '@supabase/supabase-js'
const pending=new Map<string,Promise<any>>()
export function approvedProductImage(value:string,root:string){try{const u=new URL(value),base=new URL(root);return u.protocol==='https:'&&u.origin===base.origin&&u.pathname.startsWith('/storage/v1/object/public/product-images/')&&!u.username&&!u.password&&!u.search&&!u.hash?u.href:null}catch{return null}}
export async function compatiblePhoto(bytes:Buffer){
 if(bytes.length>15*1024*1024)throw new Error('Image too large')
 const {data,info}=await sharp(bytes,{limitInputPixels:16000000,failOn:'warning'}).autoOrient().resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).toColourspace('srgb').jpeg({quality:88,progressive:false}).toBuffer({resolveWithObject:true})
 if(data.length>5*1024*1024||info.width/info.height>20||info.height/info.width>20)throw new Error('Unsupported photo proportions')
 const thumb=await sharp(data).resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).jpeg({quality:75}).toBuffer()
 return {data,thumb,width:info.width,height:info.height}
}
/** No redirects, arbitrary URLs or unbounded copies. The source is already a validated catalogue URL. */
export async function productTelegramPhoto(db:SupabaseClient,productId:string,source:string){
 const root=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'',url=approvedProductImage(source,root);if(!url)return null
 const key=createHash('sha256').update('telegram-photo-v1:'+productId+':'+url).digest('hex')
 if(pending.has(key))return pending.get(key)
 if(pending.size>=3)return null
 const task=(async()=>{
  const {data:cached,error}=await db.rpc('store_telegram_photo',{p_key:key,p_product:productId});if(error)throw new Error('Photo cache unavailable')
  let value=cached
  if(!value){
   const r=await fetch(url,{signal:AbortSignal.timeout(7000),redirect:'error'});if(!r.ok||!r.body||Number(r.headers.get('content-length')||0)>15*1024*1024)throw new Error('Photo unavailable')
   const chunks:Uint8Array[]=[];let count=0;const reader=r.body.getReader();try{while(true){const {value,done}=await reader.read();if(done)break;count+=value.length;if(count>15*1024*1024)throw new Error('Image too large');chunks.push(value)}}finally{await reader.cancel()}
   const ready=await compatiblePhoto(Buffer.concat(chunks)),bucket=db.storage.from('telegram-products')
   value={photo_path:key+'/photo.jpg',thumb_path:key+'/thumb.jpg',width:ready.width,height:ready.height}
   for(const [path,bytes] of [[value.photo_path,ready.data],[value.thumb_path,ready.thumb]] as const){const r=await bucket.upload(path,bytes,{contentType:'image/jpeg',upsert:false,cacheControl:'31536000'});if(r.error&&String(r.error.statusCode)!=='409'&&r.error.message!=='The resource already exists')throw new Error('Photo upload unavailable')}
   const saved=await db.rpc('store_telegram_photo',{p_key:key,p_product:productId,p_value:value});if(saved.error)throw new Error('Photo cache unavailable')
  }
  return {photo_url:db.storage.from('telegram-products').getPublicUrl(value.photo_path).data.publicUrl,thumbnail_url:db.storage.from('telegram-products').getPublicUrl(value.thumb_path).data.publicUrl,photo_width:value.width,photo_height:value.height,key}
 })().finally(()=>pending.delete(key))
 pending.set(key,task);return task
}
