import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { HttpError } from '../server/auth.ts'
import { database, fail, limit, recordId, start, text, userFromRequest } from '../server/http.ts'
import { decodeImage } from '../server/images.ts'
import { dispatchNotification } from '../server/notifications.ts'

function uuid(value: unknown) {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new HttpError(400, 'Некорректный запрос')
  return value
}
function privatePath(value: unknown, bucket: string, userId?: string) {
  if (typeof value !== 'string' || !value.startsWith(`private:${bucket}/`)) throw new HttpError(400, 'Некорректный файл')
  const path = value.slice(`private:${bucket}/`.length)
  if (path.includes('..') || !/^[a-zA-Z0-9/_.,-]+$/.test(path) || (userId && !path.startsWith(`${userId}/`))) throw new HttpError(400, 'Некорректный файл')
  return path
}
async function signedUrl(value: string | null, bucket: string) {
  if (!value) return null
  let path: string
  if (value.startsWith('private:')) path = privatePath(value, bucket)
  else {
    // Upgrade old public URLs without fetching arbitrary external URLs.
    try {
      const url = new URL(value)
      const root = new URL(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
      const prefix = `/storage/v1/object/public/${bucket}/`
      if (url.origin !== root.origin || !url.pathname.startsWith(prefix)) return null
      path = decodeURIComponent(url.pathname.slice(prefix.length))
    } catch { return null }
  }
  const { data, error } = await database().storage.from(bucket).createSignedUrl(path, 900)
  if (error) return null
  return data.signedUrl
}
async function presentOrder(order: Record<string, any>) {
  return { ...order, payment_screenshot_url: await signedUrl(order.payment_screenshot_url, 'payment-screenshots'),
    items: await Promise.all((order.items || []).map(async (item: any) => item.isSpecialOrder ? { ...item, image: await signedUrl(item.image, 'china-requests') } : item)) }
}
function dbError(message?: string): never {
  if (message?.includes('Price changed')) throw new HttpError(409, 'Цена или доставка изменилась. Обновите корзину и оформите заказ заново.')
  if (message?.includes('stock') || message?.includes('unavailable') || message?.includes('no rows')) throw new HttpError(409, 'Товар или спецзаказ больше недоступен. Обновите корзину.')
  throw new HttpError(400, 'Не удалось сохранить заказ. Проверьте данные и повторите попытку.')
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    start(req, res)
    const user = userFromRequest(req)
    const userId = String(user.id)
    const body = req.body || {}
    const db = database()
    await limit(userId, 'requests', 90)
    switch (body.action) {
      case 'subscribe': {
        const { error } = await db.from('subscribers').upsert({ chat_id: userId, user_id: userId, first_name: user.first_name, username: user.username || null, is_subscribed: true }, { onConflict: 'chat_id' })
        if (error) throw error
        return res.json({ success: true })
      }
      case 'orders': {
        const { data, error } = await db.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
        if (error) throw error
        return res.json({ data: await Promise.all((data || []).map(presentOrder)) })
      }
      case 'requests': {
        const { data, error } = await db.from('china_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
        if (error) throw error
        return res.json({ data: await Promise.all((data || []).map(async r => ({ ...r, image_url: await signedUrl(r.image_url, 'china-requests') }))) })
      }
      case 'createOrder': {
        await limit(userId, 'create-order', 10, 600)
        const order = body.order || {}
        const name = text(order.client_name, 120, 3)
        const phone = text(order.client_phone, 13, 13)
        if (!/^\+998\d{9}$/.test(phone) || !['pickup','delivery'].includes(order.delivery_method) || !['online_card','upon_receipt'].includes(order.payment_method) || !['UZS','USD'].includes(order.order_currency)) throw new HttpError(400, 'Проверьте данные заказа')
        if (!Array.isArray(order.items) || order.items.length < 1 || order.items.length > 50 || !Number.isFinite(order.total_price_usd) || order.total_price_usd<0) throw new HttpError(400, 'Проверьте корзину')
        const items = order.items.map((item: any) => {
          if (!item || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new HttpError(400, 'Некорректное количество товара')
          return { productId: text(item.productId, 100, 1), size: text(item.size, 100, 1), colorId: item.colorId ? text(item.colorId, 36, 36) : null, quantity: item.quantity, isSpecialOrder: item.isSpecialOrder === true }
        })
        const payload = { client_name: name, client_phone: phone, delivery_method: order.delivery_method,
          delivery_address: order.delivery_method === 'delivery' ? text(order.delivery_address, 500, 5) : null,
          payment_method: order.payment_method, order_currency: order.order_currency, items,
          special_order_id: order.special_order_id ? recordId(order.special_order_id) : null, expected_total_usd: order.total_price_usd }
        const { data, error } = await db.rpc('store_create_order', { p_user: userId, p_payload: payload, p_key: uuid(body.requestKey) })
        if (error) dbError(error.message)
        await dispatchNotification(userId, 'order', data)
        return res.json({ data: [await presentOrder(data)] })
      }
      case 'cancelOrder': {
        const { data, error } = await db.rpc('store_cancel_order', { p_user: userId, p_order_id: recordId(body.orderId), p_delete: body.unpaidOnly === true })
        if (error) throw error
        if (!data) throw new HttpError(409, 'Заказ нельзя отменить')
        return res.json({ success: true })
      }
      case 'createRequest': {
        await limit(userId, 'create-request', 5, 600)
        const request = body.request || {}
        const link = text(request.link || '', 2000)
        if (link) { try { if (!['http:','https:'].includes(new URL(link).protocol)) throw new Error() } catch { throw new HttpError(400, 'Укажите правильную ссылку на товар') } }
        if (request.image_url) privatePath(request.image_url, 'china-requests', userId)
        const payload = { product_name: text(request.product_name, 200, 1), link, size_color: text(request.size_color || '', 200), comment: text(request.comment || '', 2000), image_url: request.image_url || null }
        const { data, error } = await db.rpc('store_create_request', { p_user: userId, p_payload: payload, p_key: uuid(body.requestKey) })
        if (error) throw error
        await dispatchNotification(userId, 'request', data)
        return res.json({ data })
      }
      case 'cancelRequest': {
        const { data, error } = await db.from('china_requests').update({ status: 'Отменён клиентом' }).eq('id', recordId(body.requestId)).eq('user_id', userId).in('status', ['На рассмотрении','Оценён']).is('converted_to_order_id', null).select('id')
        if (error) throw error
        if (!data?.length) throw new HttpError(409, 'Спецзаказ нельзя отменить')
        return res.json({ success: true })
      }
      case 'upload': {
        await limit(userId, 'upload', 10, 600)
        const bucket = body.bucket
        if (!['payment-screenshots','china-requests'].includes(bucket)) throw new HttpError(400, 'Некорректный файл')
        const image = decodeImage(body.base64)
        let orderId: string | undefined
        if (bucket === 'payment-screenshots') {
          orderId = recordId(body.orderId)
          const { data, error } = await db.from('orders').select('id').eq('id', orderId).eq('user_id', userId).eq('payment_status','pending').eq('payment_method','online_card').eq('status','Ожидает оплаты').maybeSingle()
          if (error || !data) throw new HttpError(403, 'Этот заказ недоступен для загрузки чека')
        }
        const path = `${userId}/${orderId ? orderId+'/' : ''}${randomUUID()}.${image.ext}`
        const { error } = await db.storage.from(bucket).upload(path, image.bytes, { contentType: image.type, upsert: false, cacheControl: '0' })
        if (error) throw error
        const storedPath = `private:${bucket}/${path}`
        if (orderId) {
          const { data, error: saveError } = await db.rpc('store_save_screenshot', { p_user: userId, p_order_id: orderId, p_path: storedPath })
          if (saveError || !data) { await db.storage.from(bucket).remove([path]); throw new HttpError(409, 'Заказ уже изменён. Обновите страницу.') }
        }
        return res.json({ path: storedPath, url: await signedUrl(storedPath, bucket) })
      }
      default: throw new HttpError(400, 'Неизвестное действие')
    }
  } catch (error) { return fail(res, error) }
}
