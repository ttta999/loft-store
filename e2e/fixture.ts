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
      { key: 'exchange_rate', value: { rate: 12000, version: 1 }, updated_at: now() },
      { key: 'sale_mode_enabled', value: { enabled: false }, updated_at: now() },
      { key: 'delivery_price', value: { price: 30000 }, updated_at: now() },
      { key: 'free_delivery_threshold', value: { amount: 2500000 }, updated_at: now() },
    ],
    orders: [{ id: 1001, user_id: '900000001', client_name: 'Тестовый покупатель', client_phone: '+998901234567', delivery_method: 'pickup', delivery_address: null, payment_method: 'upon_receipt', order_currency: 'UZS', total_price_usd: 100, total_price_uzs: 1200000, status: 'Активный', payment_status: 'pending', paid_at: null, payment_screenshot_url: null, created_at: now(), items: [{ productId, name: 'Тестовые кроссовки', size: '42', quantity: 1, priceUsd: 100, image }] }],
    china_requests: [{ id: 3001, user_id: '900000001', product_name: 'Тестовый спецзаказ', status: 'На рассмотрении', link: 'https://example.test/item', comment: 'Тест', image_url: null, created_at: now() }],
    category_change_logs: [], subscribers: [],
  } as Record<string, any[]>
}
const jwt = (aal: string) => [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: adminId, aud: 'authenticated', role: 'authenticated', aal, exp: Math.floor(Date.now() / 1000) + 3600, amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }] })).toString('base64url'), Buffer.from('fixture-signature').toString('base64url')].join('.')
const user = () => ({ id: adminId, email: 'admin@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {}, factors: [{ id: 'fixture-factor', factor_type: 'totp', status: 'verified', friendly_name: 'LOFT Admin' }] })
const session = (aal: string) => ({ access_token: jwt(aal), token_type: 'bearer', refresh_token: 'fixture-refresh', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: user() })
export type Harness = { db: Record<string, any[]>; calls: { method: string; path: string; body: any }[]; errors: string[]; blocked: string[]; failAction: string | null; failTable: string | null; setup: (page: Page) => Promise<void> }
export async function install(context: BrowserContext): Promise<Harness> {
  const h: Harness = { db: catalog(), calls: [], errors: [], blocked: [], failAction: null, failTable: null, setup: async page => { page.on('pageerror', error => h.errors.push(error.message)); page.on('console', msg => { if (msg.type() === 'error') console.log('BROWSER', msg.text()) }) } }
  context.on('page', page => { void h.setup(page) })
  await context.addInitScript(() => {
    const win = window as any
    win.Telegram = { WebApp: { initData: 'fixture-signed-login', initDataUnsafe: { user: { id: 900000001, first_name: 'Тестовый покупатель' } }, ready() {}, expand() {}, close() {}, onEvent() {}, offEvent() {}, setHeaderColor() {}, setBackgroundColor() {}, BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} }, HapticFeedback: { impactOccurred() {}, selectionChanged() {}, notificationOccurred() {} } } }
  })
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method()
    let body: any = null
    try { body = request.postDataJSON() } catch { body = request.postData() }
    const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data), headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...headers } })
    if (url.pathname.endsWith('/fixture-product.svg')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#c9a961"/></svg>' })
    if (url.hostname === 'telegram.org') return route.fulfill({ contentType: 'application/javascript', body: '' })
    if (['127.0.0.1'].includes(url.hostname) && ['/api/store', '/api/validateTelegram', '/api/sendNotification', '/api/getExchangeRate'].includes(url.pathname)) {
      h.calls.push({ method, path: url.pathname, body })
      if (url.pathname === '/api/validateTelegram') return json({ token: 'fixture-customer-session', user: { id: 900000001, first_name: 'Тестовый покупатель' } })
      if (url.pathname === '/api/sendNotification') return json({ success: true })
      if (url.pathname === '/api/getExchangeRate') return json({ success: true, rate: 12000, source: 'fixture' })
      if (body?.action === h.failAction) return json({ error: 'Тестовая ошибка сервера' }, 409)
      if (body?.action === 'orders') return json({ data: h.db.orders.map(o => ({ ...o, payment_screenshot_url: o.payment_screenshot_url ? image : null })) })
      if (body?.action === 'requests') return json({ data: h.db.china_requests })
      if (body?.action === 'createOrder') {
        const data = { ...h.db.orders[0], ...body.order, id: 2001, created_at: now(), user_id: '900000001', status: body.order.payment_method === 'online_card' ? 'Ожидает оплаты' : 'Активный', payment_status: 'pending', items: body.order.items }
        h.db.orders.push(data); return json({ data: [data] })
      }
      if (body?.action === 'cancelOrder') { const order = h.db.orders.find(o => String(o.id) === String(body.orderId)); if (order) order.status = 'Отменён'; return json({ success: true }) }
      if (body?.action === 'createRequest') { const data = { ...body.request, id: 3002, user_id: '900000001', status: 'На рассмотрении', created_at: now() }; h.db.china_requests.push(data); return json({ data }) }
      if (body?.action === 'cancelRequest') { const item = h.db.china_requests.find(o => String(o.id) === String(body.requestId)); if (item) item.status = 'Отменён клиентом'; return json({ success: true }) }
      if (body?.action === 'upload') {
        const path = `private:${body.bucket}/900000001/${body.orderId ? body.orderId + '/' : ''}fixture.png`
        const order = h.db.orders.find(o => String(o.id) === String(body.orderId))
        if (order) order.payment_screenshot_url = path
        return json({ path, url: image })
      }
      return json({ success: true })
    }
    if (url.hostname === 'fixture.supabase.co') {
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
        if (rpc === 'store_admin_auth_state') return json({ isAdmin: true, mfaRequired: true })
        if (rpc === 'store_is_admin') {
          const auth = request.headers().authorization || ''
          return json(auth.includes(jwt('aal2').split('.')[1]) || Buffer.from(auth.split('.')[1] || '', 'base64url').toString().includes('"aal":"aal2"'))
        }
        if (rpc === 'get_product_popularity') return json([{ product_id: productId, sold_count: 1 }])
        if (rpc === 'store_admin_confirm_payment' || rpc === 'store_admin_cancel_order') { const order = h.db.orders.find(o => String(o.id) === String(body?.p_order_id)); if (order) { if (rpc.endsWith('confirm_payment')) { order.payment_status = 'paid'; order.paid_at = now() } else order.status = 'Отменён' }; return json(true) }
        return json(true)
      }
      const table = url.pathname.split('/').pop()!
      if (table === h.failTable) return json({ message: 'Fixture database unavailable', code: 'XX000' }, 503)
      let rows = h.db[table] || []
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
  await context.addInitScript(({ seeded }) => {
    if (location.port === '4174' && !sessionStorage.getItem('fixture-initialized')) {
      sessionStorage.setItem('fixture-initialized', '1')
      if (seeded) localStorage.setItem('sb-fixture-auth-token', seeded)
    }
  }, { seeded: JSON.stringify(session('aal2')) })
  return h
}
export const test = base.extend<{ harness: Harness }>({ harness: [async ({ context }, use) => { const h = await install(context); await use(h); if (base.info().status !== base.info().expectedStatus) console.log('FIXTURE CALLS', h.calls.map(c => [c.method,c.path,c.body]), 'ERRORS',h.errors); expect(h.errors, 'Uncaught browser errors').toEqual([]); expect(h.blocked, 'Unmocked external network').toEqual([]) }, { auto: true }] })
export { expect }
