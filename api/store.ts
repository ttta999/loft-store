import { prepareProductShare } from '../server/productSharing.ts'
import type { VercelRequest, VercelResponse } from '../server/types.ts'
import { randomUUID } from 'node:crypto'
import { HttpError } from '../server/auth.ts'
import { database, fail, limit, recordId, start, text, userFromRequest } from '../server/http.ts'
import { decodeImage } from '../server/images.ts'
import type { StoredRecord } from '../server/models.ts'

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
async function signedUrl(value: string | null | undefined, bucket: string) {
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
async function presentOrder(order: StoredRecord) {
  return { ...order, payment_screenshot_url: await signedUrl(order.payment_screenshot_url, 'payment-screenshots'),
    items: await Promise.all((order.items || []).map(async (item) => item.isSpecialOrder ? { ...item, image: await signedUrl(item.image, 'china-requests') } : item)) }
}
function dbError(message?: string): never {
  if (message?.includes('Special checkout must')) throw new HttpError(409, 'Каждый спецзаказ оформляется отдельно, без других товаров.')
  if (message?.includes('Special checkout requires')) throw new HttpError(409, 'Для спецзаказа необходима полная предоплата переводом.')
  if (message?.includes('Reservation limit')) throw new HttpError(409, 'Достигнут лимит незавершённых заказов. Завершите оплату или отмените предыдущий заказ в разделе «Профиль → Заказы». Если чек уже загружен, дождитесь подтверждения магазина.')
  if (message?.includes('Price changed')) throw new HttpError(409, 'Цена или доставка изменилась. Обновите корзину и оформите заказ заново.')
  if (message?.includes('stock') || message?.includes('unavailable') || message?.includes('no rows')) throw new HttpError(409, 'Товар или спецзаказ больше недоступен. Обновите корзину.')
  throw new HttpError(400, 'Не удалось сохранить заказ. Проверьте данные и повторите попытку.')
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    start(req, res)
    const user = await userFromRequest(req)
    const userId = String(user.id)
    const body = req.body || {}
    const db = database()
    await limit(userId, 'requests', 90)
    switch (body.action) {
      case 'prepareShare': {
        await limit(userId,'prepare-share',10)
        const id=uuid(body.productId)
        if(!['USD','UZS'].includes(body.currency)||!['ru','uz'].includes(body.language))throw new HttpError(400,'Проверьте параметры товара')
        return res.json(await prepareProductShare(userId,id,body.currency,body.language))
      }
      case 'restocks':
      case 'subscribeRestock':
      case 'cancelRestock': {
        await limit(userId,'restock',20)
        const {data,error}=await db.rpc('store_restock',{p_user:userId,p_action:body.action==='restocks'?'list':body.action==='subscribeRestock'?'subscribe':'cancel',p_variant:body.action==='subscribeRestock'?uuid(body.variantId):null,p_id:body.action==='cancelRestock'?uuid(body.id):null})
        if(error)throw new HttpError(409,'Не удалось изменить подписку. Проверьте наличие варианта товара.')
        return res.json({data})
      }
      case 'language': {
        if(!['ru','uz'].includes(body.language))throw new HttpError(400,'Выберите язык')
        await limit(userId,'language',20)
        const {data,error}=await db.rpc('store_customer_language',{p_user:userId,p_language:body.language});if(error)throw error
        return res.json({data})
      }
      case 'marketingConsent': {
        if(typeof body.enabled!=='boolean')throw new HttpError(400,'Проверьте настройку уведомлений')
        await limit(userId,'marketing-consent',10)
        const {data,error}=await db.rpc('store_marketing_consent',{p_user:userId,p_enabled:body.enabled})
        if(error)throw new HttpError(503,'Не удалось сохранить согласие')
        return res.json({data})
      }
      case 'preferences':
      case 'savePreferences': {
        const saving=body.action==='savePreferences'
        if(saving)await limit(userId,'preferences-write',20)
        const patch=saving ? body.patch : null
        if(saving&&(!patch||typeof patch!=='object'||Array.isArray(patch)||JSON.stringify(patch).length>20000||!Number.isSafeInteger(body.version)||body.version<0))throw new HttpError(400,'Проверьте личные данные')
        const {data,error}=await db.rpc('store_customer_preferences',{p_user:userId,p_patch:patch,p_version:saving?body.version:null})
        if(error){if(error.message?.includes('Profile changed'))throw new HttpError(409,'Данные изменились на другом устройстве. Откройте страницу повторно.');throw new HttpError(400,'Проверьте личные данные и адреса')}
        return res.json({data})
      }
      case 'subscribe': {
        const { error } = await db.from('subscribers').upsert({ chat_id: userId, user_id: userId, first_name: user.first_name, username: user.username || null, is_subscribed: true }, { onConflict: 'chat_id' })
        if (error) throw error
        return res.json({ success: true })
      }
      case 'orders': {
        let query = db.from('orders').select('*').eq('user_id', userId).is('checkout_abandoned_at', null)
          .or('payment_method.neq.online_card,receipt_submitted_at.not.is.null,paid_at.not.is.null,status.neq.Ожидает оплаты').order('id', { ascending: false }).limit(100)
        if (body.cursor != null) query = query.lt('id', recordId(body.cursor))
        const { data, error } = await query
        if (error) throw error
        const refundResult = data?.length ? await db.from('refunds').select('id,order_id,status,amount,currency,completed_at').eq('user_id', userId).in('order_id',data.map(o=>o.id)) : {data:[],error:null}
        if (refundResult.error) throw refundResult.error
        const refunds = new Map((refundResult.data || []).map(r=>[String(r.order_id),{id:r.id,order_id:r.order_id,status:r.status,amount:['Ожидает возврата','Возврат выполнен'].includes(r.status)?r.amount:null,currency:['Ожидает возврата','Возврат выполнен'].includes(r.status)?r.currency:null,completed_at:r.completed_at}]))
        return res.json({ data: await Promise.all((data || []).map(async o => ({...await presentOrder(o),refund:refunds.get(String(o.id)) || null}))), hasMore: data?.length === 100, nextCursor: data?.at(-1)?.id || null })
      }
      case 'requests': {
        let query = db.from('china_requests').select('*').eq('user_id', userId).order('id', { ascending: false }).limit(100)
        if (body.cursor != null) query = query.lt('id', recordId(body.cursor))
        const { data, error } = await query
        if (error) throw error
        return res.json({ data: await Promise.all((data || []).map(async r => ({ ...r, image_url: await signedUrl(r.image_url, 'china-requests') }))), hasMore: data?.length === 100, nextCursor: data?.at(-1)?.id || null })
      }
      case 'createOrder': {
        await limit(userId, 'create-order', 10, 600)
        const order = body.order || {}
        const name = text(order.client_name, 120, 3)
        const phone = text(order.client_phone, 13, 13)
        if (!/^\+998\d{9}$/.test(phone) || !['pickup','delivery'].includes(order.delivery_method) || !['online_card','upon_receipt'].includes(order.payment_method) || !['UZS','USD'].includes(order.order_currency)) throw new HttpError(400, 'Проверьте данные заказа')
        if (!Array.isArray(order.items) || order.items.length < 1 || order.items.length > 50 || !Number.isFinite(order.total_price_usd) || order.total_price_usd<0) throw new HttpError(400, 'Проверьте корзину')
        if (order.order_currency === 'UZS' && (!Number.isSafeInteger(order.total_price_uzs) || order.total_price_uzs < 0)) throw new HttpError(400, 'Проверьте корзину')
        const items = order.items.map((item: { quantity: number; productId: unknown; size: unknown; colorId?: unknown; isSpecialOrder?: unknown; specialRequestId?: unknown }) => {
          if (!item || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new HttpError(400, 'Некорректное количество товара')
          return { productId: text(item.productId, 100, 1), size: text(item.size, 100, 1), colorId: item.colorId ? text(item.colorId, 36, 36) : null, quantity: item.quantity, isSpecialOrder: item.isSpecialOrder === true, specialRequestId: item.isSpecialOrder === true ? recordId(item.specialRequestId || order.special_order_id) : null }
        })
        if (order.special_order_id || items.some((item: { isSpecialOrder: boolean }) => item.isSpecialOrder)) {
          if (items.length !== 1 || !items[0].isSpecialOrder || items[0].quantity !== 1) throw new HttpError(409, 'Каждый спецзаказ оформляется отдельно, без других товаров.')
          if (order.payment_method !== 'online_card') throw new HttpError(409, 'Для спецзаказа необходима полная предоплата переводом.')
        }
        const payload = { client_name: name, client_phone: phone, delivery_method: order.delivery_method,
          delivery_address: order.delivery_method === 'delivery' ? text(order.delivery_address, 500, 5) : null,
          payment_method: order.payment_method, order_currency: order.order_currency, items,
          special_order_id: order.special_order_id ? recordId(order.special_order_id) : null, expected_total_usd: order.total_price_usd, expected_total_uzs: order.total_price_uzs }
        const { data, error } = await db.rpc('store_create_order', { p_user: userId, p_payload: payload, p_key: uuid(body.requestKey) })
        if (error) dbError(error.message)
        if (!data || data.checkout_abandoned_at || data.status === 'Отменён') throw new HttpError(409, 'Это оформление уже отменено. Оформите заказ заново.')
        await db.rpc('store_wake_worker')
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
        await db.rpc('store_wake_worker')
        return res.json({ data })
      }
      case 'cancelRequest': {
        const { data, error } = await db.rpc('store_cancel_request', { p_user: userId, p_id: recordId(body.requestId) })
        if (error) throw error
        if (!data) throw new HttpError(409, 'Спецзаказ нельзя отменить')
        await db.rpc('store_wake_worker')
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
        const { data: reserved, error: quotaError } = await db.rpc('store_reserve_upload', { p_user: userId, p_bucket: bucket, p_path: path, p_bytes: image.bytes.length })
        if (quotaError) throw new HttpError(503, 'Загрузка временно недоступна')
        if (!reserved) throw new HttpError(429, 'Лимит загрузок исчерпан. Повторите позже.')
        const { error } = await db.storage.from(bucket).upload(path, image.bytes, { contentType: image.type, upsert: false, cacheControl: '0' })
        if (error) { await db.rpc('store_finish_upload', { p_user: userId, p_path: path, p_success: false }); throw error }
        const { error: finishError } = await db.rpc('store_finish_upload', { p_user: userId, p_path: path, p_success: true })
        if (finishError) { await db.storage.from(bucket).remove([path]); throw new HttpError(503, 'Загрузка временно недоступна') }
        const storedPath = `private:${bucket}/${path}`
        if (orderId) {
          const { data, error: saveError } = await db.rpc('store_save_screenshot', { p_user: userId, p_order_id: orderId, p_path: storedPath })
          if (saveError || !data) { await db.storage.from(bucket).remove([path]); throw new HttpError(409, 'Заказ уже изменён. Обновите страницу.') }
          await db.rpc('store_wake_worker')
        }
        return res.json({ path: storedPath, url: await signedUrl(storedPath, bucket) })
      }
      default: throw new HttpError(400, 'Неизвестное действие')
    }
  } catch (error) { return fail(res, error) }
}
