let session: Promise<{ token: string; user: NonNullable<Telegram.WebApp['initDataUnsafe']['user']> }> | null = null
export function authenticate() {
  if (!session) {
    session = (async () => {
      const initData = window.Telegram?.WebApp.initData
      if (!initData) throw new Error('Для оформления и просмотра заказов откройте магазин через Telegram')
      const response = await fetch('/api/validateTelegram', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось войти через Telegram')
      return data
    })().catch(error => { session = null; throw error })
  }
  return session
}
export async function storeApi(action: string, payload: Record<string, unknown> = {}) {
  const { token } = await authenticate()
  const response = await fetch('/api/store', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await response.json()
  if (response.status === 401) session = null
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить действие')
  return data
}
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
