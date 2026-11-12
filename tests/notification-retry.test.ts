import test from 'node:test'
import assert from 'node:assert/strict'
import { dispatchNotification } from '../server/notifications.ts'
process.env.SUPABASE_URL='https://notification-fixture.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-only'
process.env.TELEGRAM_BOT_TOKEN='client-fixture'
process.env.TELEGRAM_MANAGER_BOT_TOKEN='manager-fixture'
process.env.TELEGRAM_MANAGER_CHAT_ID='900000399'
const record={id:7001,status:'Активный',order_currency:'UZS',client_name:'Fixture',client_phone:'+998901234567',total_price_uzs:240000,delivery_method:'pickup',payment_method:'online_card',items:[]} as any

test('an empty composite claim never authorizes sending to either recipient',async()=>{
 const original=globalThis.fetch;let telegramCalls=0
 globalThis.fetch=async(input)=>{
  const url=new URL(String(input))
  if(url.hostname==='api.telegram.org'){telegramCalls++;return Response.json({ok:true})}
  assert.ok(url.pathname.endsWith('/rpc/store_claim_notification'))
  return Response.json({id:null,user_id:null,kind:null,sent_at:null})
 }
 try{await dispatchNotification('900000301','order',record);assert.equal(telegramCalls,0)}finally{globalThis.fetch=original}
})

test('concurrent checkout and worker retries send each order notification only once',async()=>{
 const original=globalThis.fetch;const claimed=new Set<number>();const completed=new Set<number>();let sends=0
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input)),body=JSON.parse(String(init?.body))
  if(url.hostname==='api.telegram.org'){sends++;await new Promise(resolve=>setTimeout(resolve,5));return Response.json({ok:true})}
  if(url.pathname.endsWith('/rpc/store_claim_notification')){
   const id=body.p_kind==='order'?1:2
   if(claimed.has(id)||completed.has(id))return Response.json({id:null})
   claimed.add(id);return Response.json({id})
  }
  assert.ok(url.pathname.endsWith('/rpc/store_complete_notification'))
  completed.add(body.p_event_id);return Response.json(null)
 }
 try{
  await Promise.all(Array.from({length:8},()=>dispatchNotification('900000301','order',record)))
  await dispatchNotification('900000301','order',record)
  assert.equal(sends,2);assert.deepEqual([...completed].sort(),[1,2])
 }finally{globalThis.fetch=original}
})
