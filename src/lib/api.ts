import { readWithDeadline } from './readDeadline.ts'
import { dataCache } from './resourceCache.ts'
let session: Promise<{ token: string; user: NonNullable<Telegram.WebApp['initDataUnsafe']['user']> }> | null = null
let sessionInitData: string | null = null
let sessionUserId: number | null = null
let scopeIdentity:string|null=null,scopeVersion=0
/** Ephemeral cache partition; deliberately independent of unverified Telegram user IDs. */
export function customerCacheScope(){const identity=window.Telegram?.WebApp.initData||null;if(identity!==scopeIdentity){scopeIdentity=identity;scopeVersion++}return scopeVersion}
export function verifiedCustomerId(){return window.Telegram?.WebApp.initData===sessionInitData?sessionUserId:null}
const resourceListeners=new Set<()=>void>()
export const subscribePrivateResources=(listener:()=>void)=>{resourceListeners.add(listener);return()=>{resourceListeners.delete(listener)}}
const publishPrivateResources=()=>{for(const listener of resourceListeners)listener()}
export function authenticate() {
  const currentInitData = window.Telegram?.WebApp.initData || null
  if (currentInitData !== sessionInitData) {
    session = null; sessionUserId = null; sessionInitData = currentInitData
    dataCache.invalidate('private:');publishPrivateResources()
  }
  if (!session) {
    session = (async () => {
      const initData = window.Telegram?.WebApp.initData
      if (!initData) throw new Error('Для оформления и просмотра заказов откройте магазин через Telegram')
      const { response, data } = await readWithDeadline(async signal => {
        const response = await fetch('/api/validateTelegram', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }), signal,
        })
        return { response, data: await response.json() }
      })
      if (!response.ok) throw new Error(data.error || 'Не удалось войти через Telegram')
      if (sessionInitData !== initData || window.Telegram?.WebApp.initData !== initData) throw new Error('Сессия Telegram изменилась. Откройте магазин заново.')
      sessionUserId = data.user.id
      return data
    })().catch(error => {
      if (sessionInitData === currentInitData) { session = null; sessionUserId = null }
      throw error
    })
  }
  return session
}
export async function storeApi(action: string, payload: Record<string, unknown> = {}, options:{force?:boolean}={}) {
  const requestInitData = window.Telegram?.WebApp.initData || null
  const { token, user } = await authenticate()
  const assertCurrentSession = () => {
    if (sessionInitData !== requestInitData || window.Telegram?.WebApp.initData !== requestInitData) throw new Error('Сессия Telegram изменилась. Откройте магазин заново.')
  }
  assertCurrentSession()
  const read = action === 'orders' || action === 'requests'
  const execute = async () => {
    const pages: any[] = []
    let cursor: string | null = null
    while (true) {
      const request = async (signal?: AbortSignal) => {
        const response = await fetch('/api/store', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, ...payload, ...(read && cursor ? { cursor } : {}) }),
          signal,
        })
        return { response, data: await response.json() }
      }
      const { response, data } = read || ['preferences', 'restocks'].includes(action)
        ? await readWithDeadline(request) : await request()
      assertCurrentSession()
      if (response.status === 401) { session = null; sessionUserId = null; dataCache.invalidate('private:');publishPrivateResources() }
      if (!response.ok) throw new Error(data.error || 'Не удалось выполнить действие')
      if (['restocks','subscribeRestock','cancelRestock'].includes(action) && !Array.isArray(data.data)) throw new Error('Не удалось загрузить подписки. Повторите попытку.')
      if (['preferences','savePreferences','marketingConsent','completeOnboarding'].includes(action) && (!data.data || !Array.isArray(data.data.addresses) || !Array.isArray(data.data.sizes))) throw new Error('Не удалось загрузить личные данные. Повторите попытку.')
      const privateKey=`private:${user.id}:`
      if(['savePreferences','marketingConsent','completeOnboarding'].includes(action)){
        dataCache.set(privateKey+'preferences',data,15_000)
        if(action==='savePreferences')dataCache.invalidate('catalog:recommendations:')
      }else if(action==='language'){
        const previous=dataCache.get<{data:Record<string,unknown>}>(privateKey+'preferences',60_000)
        if(previous)dataCache.set(privateKey+'preferences',{...previous,data:{...previous.data,language:payload.language,language_source:'explicit'}},15_000)
        else dataCache.invalidate(privateKey+'preferences')
      }else if(['subscribeRestock','cancelRestock'].includes(action))dataCache.set(privateKey+'restocks',data,15_000)
      else if(['createOrder','cancelOrder','createRequest','cancelRequest','upload'].includes(action)){
        for(const resource of ['orders','requests'])dataCache.invalidate(privateKey+resource)
        dataCache.invalidate('variant-sizes:');dataCache.invalidate('sizes:')
      }
      if(!read&&!['preferences','restocks','prepareShare','subscribe'].includes(action))publishPrivateResources()
      if (!read) return data
      pages.push(...(data.data || []))
      if (!data.hasMore) return { data: pages }
      const nextCursor = String(data.nextCursor || '')
      if (!nextCursor || nextCursor === cursor) throw new Error('Не удалось загрузить историю целиком. Повторите попытку.')
      cursor = nextCursor
    }
  }
  const result = await (read || ['preferences','restocks'].includes(action) ? dataCache.load(`private:${user.id}:${action}`, execute, 15_000,options.force===true) : execute())
  assertCurrentSession()
  publishPrivateResources()
  return result
}
export function peekStoreResponse<T = any>(action: 'orders' | 'requests' | 'preferences' | 'restocks'): {data:T} | null {
  if (!sessionUserId || window.Telegram?.WebApp.initData !== sessionInitData) return null
  return dataCache.get<{data:T}>(`private:${sessionUserId}:${action}`,60_000)
}
export function peekStoreData(action: 'orders' | 'requests'): any[] | null {
  if (!sessionUserId || window.Telegram?.WebApp.initData !== sessionInitData) return null
  return peekStoreResponse<any[]>(action)?.data || null
}
export function invalidateStoreData() { dataCache.invalidate('private:');publishPrivateResources() }
export async function uploadPrivateImage(bucket: 'payment-screenshots' | 'china-requests', file: File, orderId?: string) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024 || file.size === 0) {
    throw new Error('Выберите JPG, PNG или WebP размером до 2 МБ')
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
  return storeApi('upload', { bucket, orderId, base64 })
}

/** Profile entry warms the existing per-account cache; failures stay local to the destination. */
export function prefetchPersonalPages(){return Promise.allSettled([storeApi('preferences'),storeApi('restocks')])}
