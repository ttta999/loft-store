import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/store.ts'
import maintenance from '../api/maintenance.ts'
import { issueSession } from '../server/auth.ts'
import { readAll } from '../src/lib/readAll.ts'

process.env.TELEGRAM_BOT_TOKEN = '12345:architecture-fixture'
process.env.SUPABASE_URL = 'https://architecture-fixture.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-only'
const token = issueSession({ id: 900000701, first_name: 'Fixture' }, process.env.TELEGRAM_BOT_TOKEN)
const response = () => ({ statusCode: 200, body: null as any, setHeader() { return this }, status(code: number) { this.statusCode = code; return this }, json(body: any) { this.body = body; return this } })
const request = (body: any, authorization = `Bearer ${token}`) => ({ method: 'POST', headers: { 'content-type': 'application/json', authorization }, body }) as any
test('revoked and unverifiable customer sessions cannot read orders or perform mutations', async () => {
  const original = globalThis.fetch
  try {
    for (const unavailable of [false, true]) {
      const calls: string[] = []
      globalThis.fetch = async input => {
        calls.push(String(input))
        assert.ok(String(input).includes('/rpc/store_validate_session'))
        return unavailable ? Response.json({ message: 'Database unavailable' }, { status: 503 }) : Response.json(false)
      }
      for (const action of ['orders', 'createOrder', 'upload', 'cancelOrder']) {
        const res = response(); await handler(request({ action }), res as any)
        assert.equal(res.statusCode, unavailable ? 503 : 401)
      }
      assert.equal(calls.length, 4)
    }
  } finally { globalThis.fetch = original }
})
test('maintenance rejects public/customer tokens before any queue, file or Telegram operation', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async input => {
    calls++; assert.ok(String(input).endsWith('/rpc/store_worker_authorized')); return Response.json(false)
  }
  try {
    for (const authorization of ['', `Bearer ${token}`, 'Bearer '+ 'a'.repeat(64)]) {
      const res = response(); await maintenance(request({}, authorization), res as any); assert.equal(res.statusCode, 401)
    }
    assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})
test('upload quota denial occurs before any file is written to storage', async () => {
  const original = globalThis.fetch; let stored = false
  globalThis.fetch = async input => {
    const path = new URL(String(input)).pathname
    if (path.endsWith('store_validate_session') || path.endsWith('store_rate_limit')) return Response.json(true)
    if (path.endsWith('store_reserve_upload')) return Response.json(false)
    stored = true; throw new Error('Unexpected storage request')
  }
  try {
    const res = response()
    await handler(request({ action: 'upload', bucket: 'china-requests', base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5V8AAAAASUVORK5CYII=' }), res as any)
    assert.equal(res.statusCode, 429); assert.equal(stored, false)
  } finally { globalThis.fetch = original }
})
test('bounded pagination reads all rows and never presents a partial result as complete after failure', async () => {
  const rows = Array.from({ length: 601 }, (_, id) => ({ id })); const ranges: number[] = []
  const result = await readAll({ range: async (from, to) => { ranges.push(from); return { data: rows.slice(from, to + 1), error: null } } })
  assert.deepEqual(result.data, rows); assert.deepEqual(ranges, [0, 200, 400, 600])
  const failed = await readAll({ range: async from => from ? { data: null, error: new Error('Offline') } : { data: rows.slice(0,200), error: null } })
  assert.equal(failed.data, null); assert.ok(failed.error)
})
test('currency lookup never treats another currency as USD and deduplicates cached provider requests', async () => {
  const original = globalThis.fetch; const calls: string[] = []
  globalThis.fetch = async input => {
    calls.push(String(input))
    if (String(input).includes('cbu.uz')) return Response.json([{ Ccy: 'EUR', Rate: '999999' }])
    return Response.json({ base: 'USD', rates: { UZS: 12000 } })
  }
  try {
    const { exchangeRate } = await import('../server/exchangeRate.ts')
    const rates = await Promise.all([exchangeRate(), exchangeRate()])
    assert.equal(rates[0].rate, 12000); assert.equal(rates[1].rate,12000)
    assert.equal((await exchangeRate()).source, 'exchangerate-api.com'); assert.equal(calls.length, 2)
  } finally { globalThis.fetch = original }
})
