import { dataCache } from './resourceCache.ts'
let session: Promise<{ token: string; user: NonNullable<Telegram.WebApp['initDataUnsafe']['user']> }> | null = null
let sessionInitData: string | null = null
let sessionUserId: number | null = null
export function authenticate() {
  const currentInitData = window.Telegram?.WebApp.initData || null
  if (currentInitData !== sessionInitData) {
    session = null; sessionUserId = null; sessionInitData = currentInitData
    dataCache.invalidate('private:')
  }
  if (!session) {
    session = (async () => {
      const initData = window.Telegram?.WebApp.initData
      if (!initData) throw new Error('Для оформления и просмотра заказов откройте магазин через Telegram')
      const response = await fetch('/api/validateTelegram', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData }),
      })
      const data = await response.json()
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
export async function storeApi(action: string, payload: Record<string, unknown> = {}) {
  const requestInitData = window.Telegram?.WebApp.initData || null
  const { token, user } = await authenticate()
  const assertCurrentSession = () => {
    if (sessionInitData !== requestInitData || window.Telegram?.WebApp.initData !== requestInitData) throw new Error('Сессия Telegram изменилась. Откройте магазин заново.')
  }
  assertCurrentSession()
  const read = action === 'orders' || action === 'requests'
  const execute = async () => {
    const response = await fetch('/api/store', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...payload }),
    })
    assertCurrentSession()
    const data = await response.json()
    assertCurrentSession()
    if (response.status === 401) { session = null; sessionUserId = null; dataCache.invalidate('private:') }
    if (!response.ok) throw new Error(data.error || 'Не удалось выполнить действие')
    if (!read) {
      dataCache.invalidate(`private:${user.id}:`)
      dataCache.invalidate('variant-sizes:')
      dataCache.invalidate('sizes:')
    }
    return data
  }
  const result = await (read ? dataCache.load(`private:${user.id}:${action}`, execute, 15_000) : execute())
  assertCurrentSession()
  return result
}
export function peekStoreData(action: 'orders' | 'requests'): any[] | null {
  if (!sessionUserId || window.Telegram?.WebApp.initData !== sessionInitData) return null
  return dataCache.get<{ data: any[] }>(`private:${sessionUserId}:${action}`)?.data || null
}
export function invalidateStoreData() { dataCache.invalidate('private:') }
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
