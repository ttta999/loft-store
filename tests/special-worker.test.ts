import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/maintenance.ts'
process.env.SUPABASE_URL='https://special-worker.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-only'
process.env.TELEGRAM_BOT_TOKEN='fixture-bot'
test('the existing worker sends each special snapshot once, with formatting and a linked app button',async()=>{
 const original=globalThis.fetch;let sent=false;const messages:any[]=[]
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input))
  if(url.hostname==='api.telegram.org'){messages.push(JSON.parse(String(init?.body)));return Response.json({ok:true})}
  assert.equal(url.hostname,'special-worker.supabase.co')
  const name=url.pathname.split('/').at(-1)
  if(name==='store_worker_authorized')return Response.json(true)
  if(name==='store_pending_notifications')return Response.json([{id:51,kind:'custom',user_id:'900000301'}])
  if(name==='store_claim_custom_notification')return Response.json(sent?null:{id:51,user_id:'900000301',payload:{special_request:{id:17,status:'Оформлен',order_id:145}}})
  if(name==='store_complete_notification'){sent=true;return Response.json(null)}
  if(name==='store_orphan_files')return Response.json([])
  throw Error('Unexpected request')
 }
 try{
  for(let i=0;i<2;i++){
   const res={code:200,body:null as any,setHeader(){},status(n:number){this.code=n;return this},json(body:any){this.body=body;return this}}
   await handler({method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+'a'.repeat(64)},body:{}} as any,res as any)
   assert.equal(res.code,200)
  }
  assert.equal(messages.length,1);assert.equal(messages[0].parse_mode,'HTML')
  assert.ok(messages[0].text.includes('Спецзаказ №17 оформлен'));assert.ok(messages[0].text.includes('<b>№145</b>'))
  assert.ok(messages[0].reply_markup.inline_keyboard[0][0].web_app.url.endsWith('section=orders&order=145'))
 }finally{globalThis.fetch=original}
})
