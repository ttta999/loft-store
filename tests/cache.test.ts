import test from 'node:test'
import assert from 'node:assert/strict'
import { ResourceCache, dataCache } from '../src/lib/resourceCache.ts'
import { createDataFetch } from '../src/lib/dataFetch.ts'

test('cache expires from the original fetch, retains empty lists and deduplicates concurrent reads', async () => {
  let now = 100
  const cache = new ResourceCache(2, () => now)
  let calls = 0
  const read = () => { calls++; return Promise.resolve([] as string[]) }
  assert.deepEqual(await Promise.all([cache.load('items', read, 50), cache.load('items', read, 50)]), [[], []])
  assert.equal(calls, 1)
  now = 140
  await cache.load('items', read, 50)
  now = 151
  await cache.load('items', read, 50)
  assert.equal(calls, 2, 'reading the cache must not extend its lifetime')
  cache.set('two', 2); cache.set('three', 3)
  assert.equal(cache.get('items'), null, 'cache size is bounded')
})

test('a response started before invalidation cannot replace a newer cached result', async () => {
  const cache = new ResourceCache()
  let finish!: (value: number) => void
  const old = cache.load('orders', () => new Promise<number>(resolve => { finish = resolve }))
  await Promise.resolve()
  cache.clear()
  await cache.load('orders', async () => 2)
  finish(1)
  await old
  assert.equal(cache.get('orders'), 2)
  await assert.rejects(cache.load('failed', async () => { throw new Error('offline') }))
  assert.equal(await cache.load('failed', async () => 'recovered'), 'recovered')
})

test('Data API reads reuse consumable responses, while writes, inventory and failures remain live', async () => {
  const original = globalThis.fetch
  let calls = 0
  let status = 200
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ call: calls }), { status }) }
  const cachedFetch = createDataFetch(() => dataCache.clear())
  const url = 'https://example.test/rest/v1/products?select=*'
  const auth = { headers: { Authorization: 'Bearer first-user' } }
  try {
    dataCache.clear()
    const responses = await Promise.all([cachedFetch(url, auth), cachedFetch(url, auth)])
    assert.deepEqual(await Promise.all(responses.map(r => r.json())), [{ call: 1 }, { call: 1 }])
    await cachedFetch(url, { headers: { Authorization: 'Bearer second-user' } })
    assert.equal(calls, 2, 'accounts cannot share HTTP results')
    await cachedFetch(url, { ...auth, method: 'PATCH' })
    await cachedFetch(url, auth)
    assert.equal(calls, 4, 'successful writes invalidate read results')
    await cachedFetch('https://example.test/rest/v1/product_variants?select=stock', auth)
    await cachedFetch('https://example.test/rest/v1/product_variants?select=stock', auth)
    assert.equal(calls, 6, 'checkout inventory checks never use the read cache')
    await cachedFetch('https://example.test/rest/v1/rpc/store_admin_cancel_order', { ...auth, method: 'POST' })
    await cachedFetch(url, auth)
    assert.equal(calls, 8, 'transactional writes also invalidate reads')
    await cachedFetch('https://example.test/rest/v1/rpc/store_is_admin', { ...auth, method: 'POST' })
    await cachedFetch(url, auth)
    assert.equal(calls, 9, 'authorization RPC stays live without erasing page caches')
    status = 503; dataCache.clear()
    assert.equal((await cachedFetch(url, auth)).status, 503)
    assert.equal((await cachedFetch(url, auth)).status, 503)
    assert.equal(calls, 11, 'failed responses are not cached')
    status = 200
    const abortable = { ...auth, signal: new AbortController().signal }
    await cachedFetch(url, abortable); await cachedFetch(url, abortable)
    assert.equal(calls, 13, 'independently cancellable requests are not shared')
  } finally { globalThis.fetch = original; dataCache.clear() }
})
