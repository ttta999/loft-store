import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../api/store.ts'
import notifications from '../api/sendNotification.ts'
import { issueSession } from '../server/auth.ts'

process.env.TELEGRAM_BOT_TOKEN = '12345:server-test-secret'
process.env.SUPABASE_URL = 'https://store-security-tests.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-test-key'
const bearer = issueSession({id:900000001,first_name:'Test'},process.env.TELEGRAM_BOT_TOKEN)
function request(body: unknown, authorization?: string, method = 'POST') {
  return { method,headers:{'content-type':'application/json',authorization},body } as VercelRequest
}
function response() {
  const result = {statusCode:200,body:undefined as unknown,headers:{} as Record<string,string>,
    setHeader(k:string,v:string) { this.headers[k]=v; return this },
    status(n:number) { this.statusCode=n; return this },
    json(body:unknown) { this.body=body; return this },
  }
  return result
}
test('unauthenticated store and retired notification endpoints cannot reach database/Telegram',async()=> {
  const original=globalThis.fetch
  globalThis.fetch=async()=> { throw new Error('Unexpected network call') }
  try {
    for (const action of ['createOrder','orders','upload','cancelOrder','subscribe']) {
      const res=response()
      await handler(request({action}),res as unknown as VercelResponse)
      assert.equal(res.statusCode,401)
    }
    const res=response()
    notifications(request({chatId:'123',message:'forged'}),res as unknown as VercelResponse)
    assert.equal(res.statusCode,410)
  } finally { globalThis.fetch=original }
})
test('order history is scoped to the verified identity, ignoring supplied user_id',async()=> {
  const original=globalThis.fetch
  const urls:string[]=[]
  globalThis.fetch=async(input)=> {
    const url=String(input);urls.push(url)
    if(url.includes('/rpc/store_rate_limit')) return Response.json(true)
    if(url.includes('/rest/v1/orders')) return Response.json([])
    throw new Error('Unexpected network call')
  }
  try {
    const res=response()
    await handler(request({action:'orders',user_id:'another-user'},`Bearer ${bearer}`),res as unknown as VercelResponse)
    assert.equal(res.statusCode,200)
    const query=new URL(urls.find(url=>url.includes('/rest/v1/orders'))!)
    assert.equal(query.searchParams.get('user_id'),'eq.900000001')
  } finally { globalThis.fetch=original }
})
test('checkout strips forged identity, payment status, item price and stock before calling transactional RPC',async()=> {
  const original=globalThis.fetch
  let rpc:Record<string,unknown>|undefined
  globalThis.fetch=async(input,init)=> {
    const url=String(input)
    if(url.includes('/rpc/store_rate_limit')) return Response.json(true)
    if(url.includes('/rpc/store_create_order')) {
      rpc=JSON.parse(String(init?.body))
      return Response.json({id:123,user_id:'900000001',items:[],payment_screenshot_url:null})
    }
    if(url.includes('/rpc/store_claim_notification')) return Response.json(null)
    throw new Error('Unexpected network call')
  }
  try {
    const res=response()
    await handler(request({action:'createOrder',requestKey:'5bcde2b4-b415-45e0-b179-c38a99267d09',order:{
      user_id:'victim',payment_status:'paid',status:'Доставлен',client_name:'Test buyer',client_phone:'+998901234567',
      delivery_method:'pickup',payment_method:'upon_receipt',order_currency:'UZS',total_price_usd:0.01,total_price_uzs:120,
      items:[{productId:'product-1',size:'42',quantity:1,priceUsd:0.01,stock:9999}],
    }},`Bearer ${bearer}`),res as unknown as VercelResponse)
    assert.equal(res.statusCode,200)
    assert.equal(rpc?.p_user,'900000001')
    const payload=rpc?.p_payload as Record<string,unknown>
    assert.equal(payload.user_id,undefined)
    assert.equal(payload.payment_status,undefined)
    assert.equal(payload.status,undefined)
    assert.equal(payload.expected_total_usd,0.01)
    assert.equal(payload.expected_total_uzs,120)
    const item=(payload.items as Record<string,unknown>[])[0]
    assert.equal(item.priceUsd,undefined)
    assert.equal(item.stock,undefined)
  } finally { globalThis.fetch=original }
})

test('UZS checkout requires the exact integer total reviewed by the buyer',async()=> {
  const original=globalThis.fetch
  let created=false
  globalThis.fetch=async(input)=> {
    if(String(input).includes('/rpc/store_rate_limit')) return Response.json(true)
    created=true
    throw new Error('Checkout should have been rejected before RPC')
  }
  try {
    for(const total of [undefined,120.5,-1,'120']) {
      const res=response()
      await handler(request({action:'createOrder',requestKey:'5bcde2b4-b415-45e0-b179-c38a99267d09',order:{
        client_name:'Test buyer',client_phone:'+998901234567',delivery_method:'pickup',payment_method:'online_card',
        order_currency:'UZS',total_price_usd:20,total_price_uzs:total,items:[{productId:'product-1',size:'42',quantity:1}],
      }},`Bearer ${bearer}`),res as unknown as VercelResponse)
      assert.equal(res.statusCode,400)
    }
    assert.equal(created,false)
  } finally { globalThis.fetch=original }
})
