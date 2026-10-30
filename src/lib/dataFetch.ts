import { dataCache } from './resourceCache.ts'

/** Cache only successful Data API reads; auth, signed URLs and stock checks stay live. */
export function createDataFetch(onMutation: () => void) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const liveInit: RequestInit = { ...init, cache: 'no-store' }
    const table = url.pathname.startsWith('/rest/v1/') ? url.pathname.slice('/rest/v1/'.length).split('/')[0] : null
    if (!table) return fetch(input, liveInit)
    if (table === 'rpc') {
      const response = await fetch(input, liveInit)
      const readOnly = ['get_product_popularity', 'store_is_admin', 'store_admin_auth_state'].includes(url.pathname.split('/').pop() || '')
      if (response.ok && !readOnly && method !== 'GET' && method !== 'HEAD') onMutation()
      return response
    }
    if (method !== 'GET' && method !== 'HEAD') {
      const response = await fetch(input, liveInit)
      if (response.ok) onMutation()
      return response
    }
    // Inventory can change between viewing an item and checkout; never cache its HTTP response.
    if (table === 'product_variants' || init?.signal || (input instanceof Request && input.signal.aborted)) return fetch(input, liveInit)
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
    const key = `http:${method}:${url.href}:${headers.get('authorization')}:${headers.get('accept')}:${headers.get('range')}:${headers.get('prefer')}`
    const response = await dataCache.load(key, async () => {
      const response = await fetch(input, liveInit)
      if (!response.ok) throw Object.assign(new Error('Uncached response'), { response })
      return response
    }, ['orders', 'china_requests', 'subscribers'].includes(table) ? 10_000 : 60_000).catch((error: unknown) => {
      if (error && typeof error === 'object' && 'response' in error && error.response instanceof Response) return error.response
      throw error
    })
    return response.clone()
  }
}
