import test from 'node:test'
import assert from 'node:assert/strict'
import { storeApi, peekStoreData } from '../src/lib/api.ts'
import { dataCache } from '../src/lib/resourceCache.ts'

test('customer history is memory-only, deduplicated, invalidated after writes and isolated across Telegram sessions', async () => {
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  let identity = 101
  let authCalls = 0
  let historyCalls = 0
  let unauthorized = false
  const telegram = { WebApp: { initData: 'signed-first-user', initDataUnsafe: { user: { id: 999 } } } }
  Object.assign(globalThis, { window: { Telegram: telegram } })
  globalThis.fetch = async (input, init) => {
    if (input === '/api/validateTelegram') { authCalls++; return Response.json({ token: `token-${identity}`, user: { id: identity } }) }
    const body = JSON.parse(String(init?.body))
    if (unauthorized) return Response.json({ error: 'expired' }, { status: 401 })
    if (body.action === 'orders') { historyCalls++; return Response.json({ data: [{ user_id: identity, version: historyCalls }] }) }
    return Response.json({ data: { ok: true } })
  }
  try {
    await Promise.all([storeApi('orders'), storeApi('orders')])
    assert.equal(authCalls, 1); assert.equal(historyCalls, 1)
    assert.equal(peekStoreData('orders')?.[0].user_id, 101, 'cache scope uses the verified user, not initDataUnsafe')
    await storeApi('cancelOrder', { orderId: '1' })
    assert.equal(peekStoreData('orders'), null)
    await storeApi('orders')
    assert.equal(historyCalls, 2)
    identity = 202; telegram.WebApp.initData = 'signed-second-user'
    assert.equal(peekStoreData('orders'), null, 'a changed Telegram login cannot prefill another user history')
    const result = await storeApi('orders')
    assert.equal(result.data[0].user_id, 202); assert.equal(authCalls, 2)
    unauthorized = true
    await assert.rejects(storeApi('cancelOrder', { orderId: '1' }), /expired/)
    assert.equal(peekStoreData('orders'), null, 'an expired session clears its private history')
  } finally { globalThis.fetch = originalFetch; Object.assign(globalThis, { window: originalWindow }); dataCache.clear() }
})

test('a delayed login from a previous Telegram account cannot overwrite the current identity', async () => {
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  let finishOld!: (response: Response) => void
  const telegram = { WebApp: { initData: 'delayed-old-user' } }
  Object.assign(globalThis, { window: { Telegram: telegram } })
  globalThis.fetch = async (input, init) => {
    if (input === '/api/validateTelegram') {
      const { initData } = JSON.parse(String(init?.body))
      if (initData === 'delayed-old-user') return new Promise<Response>(resolve => { finishOld = resolve })
      return Response.json({ token: 'new', user: { id: 404 } })
    }
    return Response.json({ data: [{ user_id: 404 }] })
  }
  try {
    const old = storeApi('orders')
    telegram.WebApp.initData = 'new-current-user'
    await storeApi('orders')
    finishOld(Response.json({ token: 'old', user: { id: 303 } }))
    await assert.rejects(old, /Сессия Telegram изменилась/)
    assert.equal(peekStoreData('orders')?.[0].user_id, 404)
  } finally { globalThis.fetch = originalFetch; Object.assign(globalThis, { window: originalWindow }); dataCache.clear() }
})
