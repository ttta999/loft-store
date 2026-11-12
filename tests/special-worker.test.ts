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

test('fulfillment snapshots use the existing queue and never fall back to ordinary order text',async()=>{
 const original=globalThis.fetch;const completed=new Set<number>();const messages:any[]=[]
 const events=[{id:61,status:'Принят'},{id:62,status:'Передан курьеру'}]
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input)),body=JSON.parse(String(init?.body||'{}'))
  if(url.hostname==='api.telegram.org'){messages.push(body);return Response.json({ok:true})}
  const name=url.pathname.split('/').at(-1)
  if(name==='store_worker_authorized')return Response.json(true)
  if(name==='store_pending_notifications')return Response.json(events.map(e=>({id:e.id,kind:'custom',user_id:'900000301'})))
  if(name==='store_claim_custom_notification')return Response.json(completed.has(body.p_id)?null:{id:body.p_id,user_id:'900000301',payload:{special_order:{id:147,status:events.find(e=>e.id===body.p_id)!.status,delivery_method:'delivery',courier_link:'https://example.com/track'}}})
  if(name==='store_complete_notification'){completed.add(body.p_event_id);return Response.json(null)}
  if(name==='store_orphan_files')return Response.json([])
  throw Error('Unexpected request')
 }
 try{
  for(let i=0;i<2;i++){
   const res={setHeader(){},status(){return this},json(){return this}}
   await handler({method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+'a'.repeat(64)},body:{}} as any,res as any)
  }
  assert.equal(messages.length,2)
  assert.ok(messages.some(m=>m.text.includes('Полная оплата вашего спецзаказа подтверждена.')))
  assert.ok(messages.some(m=>m.text.includes('https://example.com/track')))
  assert.ok(messages.every(m=>m.parse_mode==='HTML' && m.reply_markup.inline_keyboard[0][0].web_app.url.endsWith('order=147')))
 }finally{globalThis.fetch=original}
})

test('ordinary/cancellation/refund snapshots retry independently and route only persisted manager events',async()=>{
 const original=globalThis.fetch;const done=new Set<number>();const messages:any[]=[];let failed=true
 const events=[{id:71,payload:{ordinary_order:{id:41,stage:'На обработке',amount:100,currency:'USD',delivery_method:'pickup',payment_method:'online_card'}}},
 {id:72,payload:{cancellation:{id:41,source:'client',refund_status:'Проверка платежа'}}},
 {id:73,payload:{cancellation:{id:41,source:'client',refund_status:'Проверка платежа'},recipient:'manager'}},
 {id:74,payload:{refund:{order_id:41,status:'Возврат выполнен',amount:100,currency:'USD'}}}]
 process.env.TELEGRAM_MANAGER_BOT_TOKEN='manager-fixture';process.env.TELEGRAM_MANAGER_CHAT_ID='900000399'
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input)),body=JSON.parse(String(init?.body||'{}'))
  if(url.hostname==='api.telegram.org'){messages.push(body);if(body.text.includes('оформлен')&&failed)return Response.json({ok:false});return Response.json({ok:true})}
  const rpc=url.pathname.split('/').at(-1)
  if(rpc==='store_worker_authorized')return Response.json(true)
  if(rpc==='store_pending_notifications')return Response.json(events.map(e=>({id:e.id,kind:'custom',user_id:'900000301'})))
  if(rpc==='store_claim_custom_notification')return Response.json(done.has(body.p_id)?null:{...events.find(e=>e.id===body.p_id),user_id:'900000301'})
  if(rpc==='store_complete_notification'){done.add(body.p_event_id);return Response.json(null)}
  if(rpc==='store_orphan_files')return Response.json([])
  throw Error('Unexpected network')
 }
 try{for(let i=0;i<3;i++){const res={setHeader(){},status(){return this},json(){return this}};await handler({method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+'a'.repeat(64)},body:{}} as any,res as any);failed=false}
 assert.equal(messages.filter(m=>m.chat_id==='900000399').length,1)
 assert.equal(messages.filter(m=>m.text.includes('выполнен')).length,1)
 assert.equal(messages.filter(m=>m.text.includes('оформлен')).length,2)
 assert.deepEqual([...done].sort(),[71,72,73,74])
 }finally{globalThis.fetch=original}
})

test('legacy queued quote resolves UZS from store settings; unavailable rate never sends USD',async()=>{
 const original=globalThis.fetch;let rate:number|null=null,done=false;const messages:any[]=[]
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input)),body=JSON.parse(String(init?.body||'{}'))
  if(url.hostname==='api.telegram.org'){messages.push(body);return Response.json({ok:true})}
  const rpc=url.pathname.split('/').at(-1)
  if(rpc==='store_worker_authorized')return Response.json(true)
  if(rpc==='store_pending_notifications')return Response.json([{id:81,kind:'custom',user_id:'900000301'}])
  if(rpc==='store_claim_custom_notification')return Response.json(done?null:{id:81,user_id:'900000301',payload:{special_request:{id:17,status:'Оценён',manager_price:270,currency:'USD'}}})
  if(rpc==='store_complete_notification'){done=true;return Response.json(null)}
  if(rpc==='store_orphan_files')return Response.json([])
  if(rpc==='settings')return Response.json({value:{rate}})
  throw Error('Unexpected network '+url.pathname)
 }
 try{
  const request={method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+'a'.repeat(64)},body:{}} as any
  const response={setHeader(){},status(){return this},json(){return this}}
  await handler(request,response as any);assert.equal(messages.length,0);assert.equal(done,false)
  rate=11963.85;await handler(request,response as any);await handler(request,response as any)
  assert.equal(messages.length,1);assert.match(messages[0].text,/3 230 240 сум/);assert.doesNotMatch(messages[0].text,/270 USD/);assert.ok(done)
 }finally{globalThis.fetch=original}
})
