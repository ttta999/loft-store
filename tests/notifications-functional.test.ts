import test from 'node:test'
import assert from 'node:assert/strict'
import { dispatchNotification } from '../server/notifications.ts'
process.env.SUPABASE_URL='https://notification-fixture.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-only'
process.env.TELEGRAM_BOT_TOKEN='client-fixture'
process.env.TELEGRAM_MANAGER_BOT_TOKEN='manager-fixture'
process.env.TELEGRAM_MANAGER_CHAT_ID='900000399'
test('a client delivery failure does not duplicate the manager notification on retry',async()=>{
 const original=globalThis.fetch;const completed=new Set<number>();const deliveries:{recipient:string;text:string}[]=[];let failClient=true
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input)),body=JSON.parse(String(init?.body))
  if(url.hostname==='api.telegram.org'){
   deliveries.push({recipient:body.chat_id,text:body.text})
   return Response.json({ok:!(body.chat_id==='900000301'&&failClient)})
  }
  assert.equal(url.hostname,'notification-fixture.supabase.co')
  if(url.pathname.endsWith('/rpc/store_claim_notification')){const id=body.p_kind==='order'?1:2;return Response.json(completed.has(id)?null:{id})}
  if(url.pathname.endsWith('/rpc/store_complete_notification')){completed.add(body.p_event_id);return Response.json(true)}
  throw Error('Unexpected network')
 }
 try{
  const record={id:7001,client_name:'Persisted buyer',client_phone:'+998901234567',total_price_uzs:240000,delivery_method:'pickup',payment_method:'online_card',items:[{name:'Persisted product',size:'42',quantity:1}]} as any
  await dispatchNotification('900000301','order',record)
  assert.deepEqual([...completed],[1])
  failClient=false
  await dispatchNotification('900000301','order',record)
  await dispatchNotification('900000301','order',record)
  assert.equal(deliveries.filter(d=>d.recipient==='900000399').length,1)
  assert.equal(deliveries.filter(d=>d.recipient==='900000301').length,2)
  assert.ok(deliveries[0].text.includes('Persisted buyer'));assert.ok(deliveries[0].text.includes('Persisted product'))
  assert.deepEqual([...completed],[1,2])
 }finally{globalThis.fetch=original}
})
