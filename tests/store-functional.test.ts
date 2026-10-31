import { test } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/store.ts'
import { issueSession } from '../server/auth.ts'

process.env.TELEGRAM_BOT_TOKEN = '12345:functional-fixture'
process.env.SUPABASE_URL = 'https://functional-fixture.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-only-key'
const token = issueSession({ id: 900000301, first_name: 'Fixture' }, process.env.TELEGRAM_BOT_TOKEN)
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhKkAAAAASUVORK5CYII='
function response() { return { statusCode: 200, body: null as any, headers: {} as Record<string,string>, setHeader(k:string,v:string) { this.headers[k]=v; return this }, status(code:number) { this.statusCode=code;return this }, json(body:any) { this.body=body;return this } } }
async function call(body:any, options:any = {}) { const res=response();await handler({ method:'POST',headers:{'content-type':'application/json', authorization:`Bearer ${token}`},body,...options } as any,res as any);return res }
async function mock(run:(calls:any[])=>Promise<void>, resolve:(url:URL,init:RequestInit|undefined)=>Response) {
 const original=globalThis.fetch;const calls:any[]=[]
 globalThis.fetch=async(input,init)=> { const url=new URL(String(input)); assert.ok(['functional-fixture.supabase.co'].includes(url.hostname),'External network forbidden');calls.push({url,method:init?.method||'GET',body:init?.body});if(url.pathname.endsWith('/rpc/store_rate_limit'))return Response.json(true);return resolve(url,init) }
 try { await run(calls) } finally { globalThis.fetch=original }
}
test('API request validation rejects wrong method/content-type and excessive body size before database access',async()=> {
 await mock(async calls=> {
  for(const [options,expected] of [[{method:'GET'},405],[{headers:{'content-type':'text/plain'}},415],[{headers:{'content-type':'application/json','content-length':'3000001'}},413]] as const) assert.equal((await call({action:'orders'},options)).statusCode,expected)
  assert.equal(calls.length,0)
 },()=>{throw Error('Unexpected database call')})
})
test('special requests validate URL and image ownership, and strip forged manager fields',async()=> {
 await mock(async calls=> {
  for(const request of [{product_name:'Test',link:'javascript:alert(1)'},{product_name:'Test',image_url:'private:china-requests/another-user/file.png'}]) assert.equal((await call({action:'createRequest',request,requestKey:'11111111-1111-4111-8111-111111111111'})).statusCode,400)
  const result=await call({action:'createRequest',requestKey:'11111111-1111-4111-8111-111111111111',request:{product_name:'Fixture',link:'https://example.test/product',image_url:'private:china-requests/900000301/file.png',manager_price:1,status:'Оплачен',user_id:'victim'}})
  assert.equal(result.statusCode,200)
  const payload=JSON.parse(String(calls.find(c=>c.url.pathname.endsWith('/rpc/store_create_request')).body))
  assert.equal(payload.p_user,'900000301');assert.equal(payload.p_payload.manager_price,undefined);assert.equal(payload.p_payload.status,undefined);assert.equal(payload.p_payload.user_id,undefined)
 },url=> { if(url.pathname.endsWith('/rpc/store_create_request'))return Response.json({id:3001});if(url.pathname.endsWith('/rpc/store_claim_notification'))return Response.json(null);throw Error('Unexpected '+url.pathname) })
})
test('cancellation is ownership-scoped and refuses already converted special requests',async()=> {
 await mock(async calls=> {
  assert.equal((await call({action:'cancelRequest',requestId:'3001',user_id:'victim'})).statusCode,409)
  const query=calls.find(c=>c.url.pathname.endsWith('/china_requests')).url
  assert.equal(query.searchParams.get('user_id'),'eq.900000301');assert.equal(query.searchParams.get('converted_to_order_id'),'is.null');assert.equal(query.searchParams.get('status'),'in.(На рассмотрении,Оценён)')
  assert.equal((await call({action:'cancelOrder',orderId:'1001'})).statusCode,409)
  const cancel=JSON.parse(String(calls.find(c=>c.url.pathname.endsWith('/rpc/store_cancel_order')).body));assert.equal(cancel.p_user,'900000301');assert.equal(cancel.p_order_id,'1001')
 },url=> url.pathname.endsWith('/china_requests') ? Response.json([]) : url.pathname.endsWith('/rpc/store_cancel_order') ? Response.json(false) : (()=>{throw Error('Unexpected '+url.pathname)})())
})
test('receipt upload requires an owned pending online order and does not write storage on rejection',async()=> {
 await mock(async calls=> {
  assert.equal((await call({action:'upload',bucket:'payment-screenshots',orderId:'1001',base64:png})).statusCode,403)
  const query=calls.find(c=>c.url.pathname.endsWith('/orders')).url
  for(const [key,value]of Object.entries({user_id:'eq.900000301',payment_status:'eq.pending',payment_method:'eq.online_card',status:'eq.Ожидает оплаты'}))assert.equal(query.searchParams.get(key),value)
  assert.equal(calls.some(c=>c.url.pathname.includes('/storage/')),false)
 },url=> { if(url.pathname.endsWith('/orders'))return Response.json(null);throw Error('Unexpected '+url.pathname) })
})
test('a race during receipt upload removes the orphaned file instead of accepting a stale receipt',async()=> {
 await mock(async calls=> {
  const result=await call({action:'upload',bucket:'payment-screenshots',orderId:'1001',base64:png})
  assert.equal(result.statusCode,409)
  const upload=calls.find(c=>c.url.pathname.includes('/storage/v1/object/payment-screenshots/'))
  assert.ok(upload.url.pathname.includes('/900000301/1001/'))
  const cleanup=calls.find(c=>c.method==='DELETE'&&c.url.pathname.includes('/storage/'))
  assert.ok(cleanup,'orphaned file must be deleted')
 },(url,init)=> {if(url.pathname.endsWith('/orders'))return Response.json({id:1001});if(url.pathname.endsWith('/rpc/store_save_screenshot'))return Response.json(false);if(url.pathname.includes('/storage/'))return Response.json({Key:'fixture'});throw Error('Unexpected '+url.pathname)})
})
test('customer history signs private receipt URLs and never fetches arbitrary external image URLs',async()=> {
 await mock(async calls=> {
  const result=await call({action:'orders'})
  assert.equal(result.statusCode,200);assert.ok(result.body.data[0].payment_screenshot_url.includes('signed-fixture'))
  assert.equal(result.body.data[1].payment_screenshot_url,null)
  assert.equal(calls.filter(c=>c.url.pathname.includes('/storage/')).length,1)
 },url=> {if(url.pathname.endsWith('/orders'))return Response.json([{id:1,items:[],payment_screenshot_url:'private:payment-screenshots/900000301/receipt.png'},{id:2,items:[],payment_screenshot_url:'https://untrusted.example/secret'}]);if(url.pathname.includes('/storage/'))return Response.json({signedURL:'/object/sign/signed-fixture'});throw Error('Unexpected '+url.pathname)})
})
test('price changes and sold-out stock are conflicts, not successful orders',async()=> {
 for(const message of ['Price changed','Not enough stock']) await mock(async()=> {
  const result=await call({action:'createOrder',requestKey:'11111111-1111-4111-8111-111111111111',order:{client_name:'Fixture buyer',client_phone:'+998901234567',delivery_method:'pickup',payment_method:'online_card',order_currency:'UZS',total_price_usd:20,total_price_uzs:240000,items:[{productId:'fixture-product',quantity:1,size:'42'}]}})
  assert.equal(result.statusCode,409)
 },url=> {if(url.pathname.endsWith('/rpc/store_create_order'))return Response.json({message,code:'P0001'},{status:400});throw Error('Unexpected '+url.pathname)})
})
