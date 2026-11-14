import { test as base, expect, type BrowserContext, type Page } from '@playwright/test'
export const STORE = 'http://127.0.0.1:4173'
export const ADMIN = 'http://127.0.0.1:4174'
const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
export const productId = '11111111-1111-4111-8111-111111111111'
const image = STORE + '/fixture-product.svg'
const now = () => new Date().toISOString()
export function catalog() {
  return {
    products: [{ id: productId, name_ru: 'Тестовые кроссовки', name_uz: 'Sinov krossovka', description_ru: 'Тестовое описание', description_uz: 'Sinov tavsif', category: 'shoes', subcategory: 'sneakers', brand: 'Тестовый бренд', price_usd: 100, sale_price: 80, images: [image], size_type: 'numeric', is_active: true, created_at: now() }],
    categories: [{ id: 'shoes', name_ru: 'Обувь', name_uz: 'Poyabzal', icon: 'shoes', sort_order: 1, is_active: true }],
    subcategories: [{ id: 'sneakers', category_id: 'shoes', name_ru: 'Кроссовки', name_uz: 'Krossovka', icon: 'shoes', size_type: 'numeric', sizes: ['41', '42', '43'], sort_order: 1, is_active: true }],
    brands: [{ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Тестовый бренд', logo_url: image, is_active: true, created_at: now() }],
    product_variants: [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', product_id: productId, size_value: '42', color_id: null, stock: 5 }],
    product_colors: [],
    settings: [
      { key: 'payment_cards', value: { UZS: { number: '5614382959503289', holder: 'Fixture UZS' }, USD: { number: '4023057010852969', holder: 'Fixture USD' } }, updated_at: now() },
      { key: 'exchange_rate', value: { rate: 12000, version: 1 }, updated_at: now() },
      { key: 'sale_mode_enabled', value: { enabled: false }, updated_at: now() },
      { key: 'delivery_price', value: { price: 30000 }, updated_at: now() },
      { key: 'free_delivery_threshold', value: { amount: 2500000 }, updated_at: now() },
    ],
    orders: [{ id: 1001, user_id: '900000001', client_name: 'Тестовый покупатель', client_phone: '+998901234567', delivery_method: 'pickup', delivery_address: null, payment_method: 'upon_receipt', order_currency: 'UZS', total_price_usd: 100, total_price_uzs: 1200000, status: 'Активный', payment_status: 'pending', paid_at: null, payment_screenshot_url: null, created_at: now(), items: [{ productId, name: 'Тестовые кроссовки', size: '42', quantity: 1, priceUsd: 100, image }] }],
    china_requests: [{ id: 3001, user_id: '900000001', product_name: 'Тестовый спецзаказ', status: 'На оценке', link: 'https://example.test/item', comment: 'Тест', image_url: null, created_at: now() }],
    category_change_logs: [], subscribers: [],
  } as Record<string, any[]>
}
const jwt = (aal: string) => [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: adminId, aud: 'authenticated', role: 'authenticated', aal, exp: Math.floor(Date.now() / 1000) + 3600, amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }] })).toString('base64url'), Buffer.from('fixture-signature').toString('base64url')].join('.')
const user = () => ({ id: adminId, email: 'admin@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {}, factors: [{ id: 'fixture-factor', factor_type: 'totp', status: 'verified', friendly_name: 'LOFT Admin' }] })
const session = (aal: string) => ({ access_token: jwt(aal), token_type: 'bearer', refresh_token: 'fixture-refresh', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: user() })
export type Harness = { db: Record<string, any[]>; calls: { method: string; path: string; body: any }[]; errors: string[]; blocked: string[]; failAction: string | null; failTable: string | null; setup: (page: Page) => Promise<void> }
export async function install(context: BrowserContext, supabaseHost = 'fixture.supabase.co'): Promise<Harness> {
  const h: Harness = { db: catalog(), calls: [], errors: [], blocked: [], failAction: null, failTable: null, setup: async page => { page.on('pageerror', error => h.errors.push(error.message)); page.on('console', msg => { if (msg.type() === 'error') console.log('BROWSER', msg.text()) }) } }
  context.on('page', page => { void h.setup(page) })
  await context.addInitScript(() => {
    const win = window as any
    win.Telegram = { WebApp: { initData: 'fixture-signed-login', initDataUnsafe: { user: { id: 900000001, first_name: 'Тестовый покупатель' } }, ready() {}, expand() {}, close() {}, onEvent() {}, offEvent() {}, setHeaderColor() {}, setBackgroundColor() {}, BackButton: { show() {}, hide() {}, onClick(callback: any) { win.telegramBack = callback }, offClick(callback: any) { if (win.telegramBack === callback) win.telegramBack = null } }, HapticFeedback: { impactOccurred() {}, selectionChanged() {}, notificationOccurred() {} } } }
  })
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method()
    let body: any = null
    try { body = request.postDataJSON() } catch { body = request.postData() }
    const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data), headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...headers } })
    if (url.pathname.endsWith('/fixture-product.svg')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#c9a961"/></svg>' })
    if (url.hostname === 'telegram.org') return route.fulfill({ contentType: 'application/javascript', body: '' })
    if (['127.0.0.1'].includes(url.hostname) && ['/api/store', '/api/publicConfig', '/api/validateTelegram', '/api/sendNotification', '/api/getExchangeRate'].includes(url.pathname)) {
      h.calls.push({ method, path: url.pathname, body })
      if (url.pathname === '/api/validateTelegram') return json({ token: 'fixture-customer-session', user: { id: 900000001, first_name: 'Тестовый покупатель' } })
      if (url.pathname === '/api/sendNotification') return json({ success: true })
      if(url.pathname==='/api/publicConfig')return json({miniAppBase:'https://t.me/FixtureStoreBot'})
      if (url.pathname === '/api/getExchangeRate') return json({ success: true, rate: 12000, source: 'fixture' })
      if (body?.action === h.failAction) return json({ error: 'Тестовая ошибка сервера' }, 409)
      if (body?.action === 'orders') return json({ data: h.db.orders.filter(o => !o.checkout_abandoned_at && !(o.payment_method==='online_card'&&o.status==='Ожидает оплаты'&&!o.receipt_submitted_at&&!o.paid_at)).map(o => ({ ...o, refund:(h.db.refunds||[]).find(r=>r.order_id===o.id), payment_screenshot_url: o.payment_screenshot_url ? image : null })) })
      if (body?.action === 'requests') return json({ data: h.db.china_requests })
      if (body?.action === 'createOrder') {
        const data = { ...h.db.orders[0], ...body.order, special_fulfillment: body.order.items.some((i:any)=>i.isSpecialOrder), id: Math.max(2000,...h.db.orders.map(o=>Number(o.id)))+1, created_at: now(), user_id: '900000001', status: body.order.payment_method === 'online_card' ? 'Ожидает оплаты' : 'Активный', payment_status: 'pending', items: body.order.items }
        h.db.orders.push(data)
        for (const item of data.items || []) if (item.isSpecialOrder) {
          const request = h.db.china_requests.find(r => String(r.id) === String(item.specialRequestId))
          if (request) Object.assign(request, data.payment_method === 'upon_receipt' ? { status: 'Оформлен', converted_to_order_id: String(data.id), reserved_order_id: null } : { reserved_order_id: data.id })
        }
        return json({ data: [data] })
      }
      if (body?.action === 'cancelOrder') { const order = h.db.orders.find(o => String(o.id) === String(body.orderId)); if (order) { order.status = 'Отменён'; if (body.unpaidOnly) order.checkout_abandoned_at = now(); for (const r of h.db.china_requests) if (r.reserved_order_id === order.id) r.reserved_order_id = null }; return json({ success: true }) }
      if (body?.action === 'createRequest') { const data = { ...body.request, id: 3002, user_id: '900000001', status: 'На оценке', created_at: now() }; h.db.china_requests.push(data); return json({ data }) }
      if (body?.action === 'cancelRequest') { const item = h.db.china_requests.find(o => String(o.id) === String(body.requestId)); if (item) item.status = 'Отменён'; return json({ success: true }) }
      if(body?.action==='prepareShare')return json({id:'fixture-prepared-message',url:'https://t.me/FixtureStoreBot?startapp=fixture'})
      if(body?.action==='restocks')return json({data:h.db.restocks||[]})
      if(body?.action==='subscribeRestock'){const v=h.db.product_variants.find(v=>v.id===body.variantId);if(!v||v.stock>0)return json({error:'Вариант недоступен для подписки'},409);if(!h.db.restocks)h.db.restocks=[];if(!h.db.restocks.some(s=>s.variant_id===v.id))h.db.restocks.push({id:crypto.randomUUID(),variant_id:v.id,product_id:v.product_id,size:v.size_value,name_ru:h.db.products.find(p=>p.id===v.product_id)?.name_ru});return json({data:h.db.restocks})}
      if(body?.action==='cancelRestock'){h.db.restocks=(h.db.restocks||[]).filter(s=>s.id!==body.id);return json({data:h.db.restocks})}
      if(body?.action==='language'){if(!h.db.preferences)h.db.preferences=[{name:'',phone:'',delivery_method:'pickup',addresses:[],sizes:[],version:0}];h.db.preferences[0].language=body.language;return json({data:body.language})}
      if(body?.action==='marketingConsent'){const old=h.db.preferences?.[0]||{name:'',phone:'',addresses:[],sizes:[],version:0};const data={...old,marketing_enabled:body.enabled,version:old.version+1};h.db.preferences=[data];return json({data})}
      if(body?.action==='preferences')return json({data:h.db.preferences?.[0]||{name:'',phone:'',delivery_method:'pickup',addresses:[],sizes:[],version:0}})
      if(body?.action==='savePreferences'){const old=h.db.preferences?.[0]||{name:'',phone:'',delivery_method:'pickup',addresses:[],sizes:[],version:0};if(old.version!==body.version)return json({error:'Данные изменились'},409);const data={...old,...body.patch,version:old.version+1};h.db.preferences=[data];return json({data})}
      if (body?.action === 'upload') {
        const path = `private:${body.bucket}/900000001/${body.orderId ? body.orderId + '/' : ''}fixture.png`
        const order = h.db.orders.find(o => String(o.id) === String(body.orderId))
        if (order) { order.payment_screenshot_url = path; order.receipt_submitted_at = now(); for (const r of h.db.china_requests) if (r.reserved_order_id === order.id && !order.special_fulfillment) Object.assign(r, { status: 'Оформлен', converted_to_order_id: String(order.id), reserved_order_id: null }) }
        return json({ path, url: image })
      }
      return json({ success: true })
    }
    if (url.hostname === supabaseHost) {
      h.calls.push({ method, path: url.pathname, body })
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' } })
      if (url.pathname.includes('/auth/v1/token')) return json(session('aal1'))
      if (url.pathname.endsWith('/auth/v1/user')) return json(user())
      if (url.pathname.endsWith('/auth/v1/logout')) return json({})
      if (url.pathname.endsWith('/challenge')) return json({ id: 'fixture-challenge', expires_at: Math.floor(Date.now() / 1000) + 60 })
      if (url.pathname.endsWith('/verify')) return body?.code === '123456' ? json(session('aal2')) : json({ msg: 'Invalid code', error_code: 'mfa_verification_failed' }, 422)
      if (url.pathname.includes('/storage/')) return json({ signedURL: '/fixture-product.svg' })
      if (url.pathname.includes('/rest/v1/rpc/')) {
        const rpc = url.pathname.split('/').pop()
        if(rpc==='store_admin_order_history')return json((h.db.order_events||[]).filter(e=>e.order_id===body.p_id))
        if(rpc==='store_admin_campaign_tests')return json((h.db.campaign_tests||[]).filter(t=>t.campaign_id===body.p_id))
        if(rpc==='store_admin_campaign_audience')return json({matched:2,available:1,version:h.db.campaigns?.find(c=>c.id===body.p_id)?.version||1})
        if(rpc==='store_admin_campaign_action'){
          if(!h.db.campaigns)h.db.campaigns=[]
          let c=h.db.campaigns.find(c=>c.id===body.p_id)
          if(body.p_action==='save'){if(c){Object.assign(c,body.p_value,{version:c.version+1})}else{c={...body.p_value,id:crypto.randomUUID(),version:1,status:'draft',created_at:now(),recipient_count:0,sent_count:0,failed_count:0,skipped_count:0,uncertain_count:0};h.db.campaigns.push(c)}}
          if(body.p_action==='copy'&&c){c={...c,id:crypto.randomUUID(),name:c.name+' — копия',status:'draft',version:1,recipient_count:0,sent_count:0,failed_count:0,skipped_count:0,uncertain_count:0};h.db.campaigns.push(c)}
          if(body.p_action==='test'){if(!h.db.campaign_tests)h.db.campaign_tests=[];const t={id:crypto.randomUUID(),campaign_id:c.id,language:body.p_value?.test_language||c.content_language||'ru',status:'sent',created_at:now(),sent_at:now()};h.db.campaign_tests.push(t);return json(t)}
          if(body.p_action==='start'||body.p_action==='schedule')Object.assign(c,{status:body.p_action==='start'?'sending':'scheduled',recipient_count:2,version:c.version+1,scheduled_at:body.p_when?new Date(body.p_when+'+05:00').toISOString():null})
          if(body.p_action==='cancel')Object.assign(c,{status:'cancelled',version:c.version+1})
          return json(c)
        }
        if(rpc==='store_admin_tasks'){const review=h.db.orders.filter(o=>!o.checkout_abandoned_at&&o.receipt_submitted_at&&o.payment_status==='pending'&&o.status!=='Отменён');return json({counts:{payment_review:review.length,special_assessment:h.db.china_requests.filter(r=>r.status==='На оценке').length,supplier_purchase:h.db.orders.filter(o=>o.special_fulfillment&&o.status==='Принят'&&o.paid_at).length,assembly:h.db.orders.filter(o=>!o.special_fulfillment&&['Активный','В обработке'].includes(o.status)).length,refund:(h.db.refunds||[]).filter(r=>['Проверка платежа','Ожидает возврата'].includes(r.status)).length},tasks:[],timezone:'Asia/Tashkent'})}
        if(rpc==='store_admin_reminder_settings'){if(!h.db.reminders)h.db.reminders=[{version:1,value:{timezone:'Asia/Tashkent',work_start:'10:00',work_end:'20:00',repeat_hours:24,rules:Object.fromEntries(['payment_review','special_assessment','supplier_purchase','assembly','pickup_ready','refund'].map(key=>[key,{hours:key==='payment_review'?2:key==='pickup_ready'?72:24,enabled:false,telegram:false}]))}}];if(body?.p_value){const old=h.db.reminders[0];h.db.reminders[0]={value:{...old.value,...body.p_value,rules:{...old.value.rules,...body.p_value.rules}},version:old.version+1}};return json(h.db.reminders[0])}
        if(rpc==='store_catalog_variants')return json(h.db.product_variants.map(v=>({id:v.id,product_id:v.product_id,size_value:v.size_value,color_id:v.color_id,available:v.stock>0})))
        if(rpc==='store_admin_size_chart'){if(!h.db.size_charts)h.db.size_charts=[];let c=h.db.size_charts.find(c=>c.id===body.p_id);if(body.p_value){if(c)Object.assign(c,body.p_value);else{c={...body.p_value,id:'99999999-9999-4999-8999-999999999999',is_active:true};h.db.size_charts.push(c)}}else if(c)c.is_active=false;return json(c?.id)}
        if (rpc === 'store_admin_refunds') return json((h.db.refunds||[]).filter(r=>!body.p_before||r.id<body.p_before).sort((a,b)=>b.id-a.id).slice(0,100).map(r=>({...r,orders:h.db.orders.find(o=>o.id===r.order_id)})))
        if (rpc === 'store_admin_refund_action') {
          const r=(h.db.refunds||[]).find(r=>r.id===body.p_id);if(!r)return json({message:'Возврат недоступен'},400)
          if(body.p_action==='claim'){if(r.assigned_to&&r.assigned_to!==adminId)return json({message:'Другой менеджер'},400);r.assigned_to=adminId}
          else if(r.assigned_to!==adminId)return json({message:'Сначала возьмите возврат в работу'},400)
          else if(body.p_action==='payment_received'){r.status='Ожидает возврата';r.amount=body.p_amount;r.currency=body.p_currency;r.manager_comment=body.p_comment}
          else if(body.p_action==='no_payment'){r.status='Возврат не требуется';r.assigned_to=null}
          else if(body.p_action==='proof')r.proof_url=body.p_proof
          else if(body.p_action==='complete'){if(!r.proof_url)return json({message:'Загрузите квитанцию'},400);r.status='Возврат выполнен';r.completed_at=now()}
          r.updated_at=now();return json(r)
        }
        if (rpc === 'store_admin_cancel_order_reason') {
          const order=h.db.orders.find(o=>String(o.id)===String(body.p_order_id));if(!body.p_reason?.trim())return json({message:'Укажите причину'},400)
          Object.assign(order,{status:'Отменён',cancelled_by:'store',cancellation_reason:body.p_reason});return json(order)
        }
        if (rpc === 'store_admin_refund_history') return json((h.db.refund_history||[]).filter(r=>r.refund_id===body.p_id))
        if (rpc === 'store_admin_save_delivery') {
          const rate = h.db.settings.find(s => s.key === 'exchange_rate')!.value.rate
          h.db.settings.find(s => s.key === 'delivery_price')!.value = { price_usd: body.p_price_usd, price: Math.round(body.p_price_usd * rate) }
          h.db.settings.find(s => s.key === 'free_delivery_threshold')!.value = { amount_usd: body.p_threshold_usd, amount: Math.round(body.p_threshold_usd * rate) }
          return json(null)
        }
        if (rpc === 'store_admin_auth_state') return json({ isAdmin: true, mfaRequired: true })
        if (rpc === 'store_is_admin') {
          const auth = request.headers().authorization || ''
          return json(auth.includes(jwt('aal2').split('.')[1]) || Buffer.from(auth.split('.')[1] || '', 'base64url').toString().includes('"aal":"aal2"'))
        }
        if (rpc === 'store_available_sizes') return json(h.db.product_variants.filter(v => v.product_id === body.p_product && (v.color_id || null) === (body.p_color || null) && v.stock > 0).map(v => ({ size_value: v.size_value, color_id: v.color_id })))
        if (rpc === 'store_product_available') return json(h.db.product_variants.some(v => v.product_id === body.p_product && v.size_value === body.p_size && (v.color_id || null) === (body.p_color || null) && v.stock >= body.p_quantity))
        if (rpc === 'store_admin_variants') return json(h.db.product_variants.slice(Number(url.searchParams.get('offset') || 0), Number(url.searchParams.get('offset') || 0) + Number(url.searchParams.get('limit') || 200)))
        if (rpc === 'store_admin_save_product' || rpc === 'store_admin_save_product_recommendations') {
          let product = h.db.products.find(p => p.id === body.p_id)
          if (!product) { product = { id: crypto.randomUUID(), is_active: true, created_at: now(), catalog_version: 0 }; h.db.products.push(product) }
          Object.assign(product, body.p_product, { catalog_version: (product.catalog_version || 0) + 1 })
          const colorIds = new Map<string, string>()
          for (const color of body.p_colors) {
            let saved = h.db.product_colors.find(c => c.product_id === product.id && c.id === color.key)
            if (!saved) { saved = { id: crypto.randomUUID(), product_id: product.id }; h.db.product_colors.push(saved) }
            Object.assign(saved, color); colorIds.set(color.key, saved.id)
          }
          for (const variant of body.p_variants) {
            const color_id = colorIds.get(variant.color_key) || null
            let saved = h.db.product_variants.find(v => v.product_id === product.id && v.size_value === variant.size_value && (v.color_id || null) === color_id)
            if (!saved) { saved = { id: crypto.randomUUID(), product_id: product.id }; h.db.product_variants.push(saved) }
            Object.assign(saved, variant, { color_id })
          }
          if(body.p_recommendations){h.db.product_recommendations=(h.db.product_recommendations||[]).filter(r=>r.product_id!==product.id);for(const kind of ['similar','outfit'])body.p_recommendations[kind].forEach((target_id:string,position:number)=>h.db.product_recommendations.push({product_id:product.id,target_id,kind,position}))}
          return json(product.id)
        }
        if (rpc === 'store_admin_product_visibility') { const p = h.db.products.find(p => p.id === body.p_id); if (p) p.is_active = body.p_active; return json(!!p) }
        if (rpc === 'store_admin_delete_product') { h.db.products = h.db.products.filter(p => p.id !== body.p_id); return json(true) }
        if (rpc === 'store_admin_order_status') { const o = h.db.orders.find(o => String(o.id) === String(body.p_id)); if (o) { o.status = body.p_status; if (body.p_courier) o.courier_link = body.p_courier; if (body.p_status === 'Выдан' && o.payment_method === 'upon_receipt') { o.payment_status = 'paid'; o.paid_at = now() } }; return json(o) }
        if (rpc === 'store_admin_request_status') { const r = h.db.china_requests.find(r => String(r.id) === String(body.p_id)); if (r) Object.assign(r, body.p_extra, { status: body.p_status }); return json(r) }
        if (rpc === 'get_product_popularity') return json([{ product_id: productId, sold_count: 1 }])
        if (rpc === 'store_admin_confirm_payment' || rpc === 'store_admin_confirm_payment_with_notice' || rpc === 'store_admin_cancel_order') { const order = h.db.orders.find(o => String(o.id) === String(body?.p_order_id)); if (order) { if (rpc.includes('confirm_payment')) { order.payment_status = 'paid'; order.paid_at = now(); order.status = order.special_fulfillment ? 'Принят' : 'Активный'; for (const r of h.db.china_requests) if (r.reserved_order_id === order.id) Object.assign(r,{status:'Оформлен',converted_to_order_id:String(order.id),reserved_order_id:null}) } else order.status = 'Отменён' }; return json(true) }
        return json(true)
      }
      const table = url.pathname.split('/').pop()!
      if (table === h.failTable) return json({ message: 'Fixture database unavailable', code: 'XX000' }, 503)
      let rows = h.db[table] || []
      if (table === 'orders' && method === 'GET') rows = rows.filter(row => !row.checkout_abandoned_at && !(row.payment_method==='online_card'&&row.status==='Ожидает оплаты'&&!row.receipt_submitted_at&&!row.paid_at))
      const matches = (row: any) => [...url.searchParams.entries()].every(([key, value]) => {
        if (value.startsWith('eq.')) return String(row[key]) === value.slice(3)
        if (value === 'is.null') return row[key] == null
        if (value.startsWith('gt.')) return typeof row[key] === 'number' ? row[key] > Number(value.slice(3)) : row[key] > value.slice(3)
        if (value.startsWith('gte.')) return row[key] >= value.slice(4)
        if (value.startsWith('in.(')) return value.slice(4, -1).split(',').includes(String(row[key]))
        return true
      })
      if (method === 'PATCH') { rows.filter(matches).forEach(row => Object.assign(row, body)); rows = rows.filter(matches) }
      else if (method === 'DELETE') { const removed = rows.filter(matches); h.db[table] = rows.filter(row => !removed.includes(row)); rows = removed }
      else if (method === 'POST') {
        const entries = Array.isArray(body) ? body : [body]
        for (const entry of entries) { const key = url.searchParams.get('on_conflict') || 'id'; const old = rows.find(r => entry[key] != null && r[key] === entry[key]); if (old) Object.assign(old, entry); else rows.push({ id: entry.id || `fixture-${rows.length + 1}`, created_at: now(), ...entry }) }
        h.db[table] = rows
      } else rows = rows.filter(matches)
      if (method === 'GET' && url.searchParams.has('limit')) rows = rows.slice(Number(url.searchParams.get('offset') || 0), Number(url.searchParams.get('offset') || 0) + Number(url.searchParams.get('limit')))
      const headers = { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` }
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: { ...headers, 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' } })
      const columns = url.searchParams.get('select')
      if (columns && columns !== '*' && !columns.includes('(')) rows = rows.map(row => Object.fromEntries(columns.split(',').map(key => [key, row[key]])))
      const single = request.headers().accept?.includes('application/vnd.pgrst.object+json')
      if (single && rows.length !== 1) return json({ code: 'PGRST116', message: '0 rows' }, 406)
      return json(single ? rows[0] : rows, 200, headers)
    }
    if (url.hostname === '127.0.0.1' && ['4173', '4174'].includes(url.port)) return route.continue()
    h.blocked.push(url.origin + url.pathname)
    return route.abort('blockedbyclient')
  })
  await context.addInitScript(({ seeded, authKey }) => {
    if (location.port === '4174' && !sessionStorage.getItem('fixture-initialized')) {
      sessionStorage.setItem('fixture-initialized', '1')
      if (seeded) localStorage.setItem(authKey, seeded)
    }
  }, { seeded: JSON.stringify(session('aal2')), authKey: 'sb-'+supabaseHost.split('.')[0]+'-auth-token' })
  return h
}
export const test = base.extend<{ harness: Harness }>({ harness: [async ({ context }, use) => { const h = await install(context); await use(h); if (base.info().status !== base.info().expectedStatus) console.log('FIXTURE CALLS', h.calls.map(c => [c.method,c.path,c.body]), 'ERRORS',h.errors); expect(h.errors, 'Uncaught browser errors').toEqual([]); expect(h.blocked, 'Unmocked external network').toEqual([]) }, { auto: true }] })
export { expect }
