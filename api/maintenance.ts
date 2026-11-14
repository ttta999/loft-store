import {managerReminder} from '../server/managerReminders.ts'
import {restockNotification} from '../server/restockNotifications.ts'
import { specialNotification } from '../server/specialNotifications.ts'
import { specialOrderNotification } from '../server/specialOrderNotifications.ts'
import { ordinaryOrderNotification, cancellationNotification, refundNotification } from '../server/orderNotifications.ts'
import type { VercelRequest, VercelResponse } from '../server/types.ts'
import { database, fail, start } from '../server/http.ts'
import { HttpError } from '../server/auth.ts'
import { dispatchNotification, send } from '../server/notifications.ts'

/** Called by pg_cron/pg_net using a random bearer kept exclusively in Supabase Vault. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    start(req, res)
    const authorization = req.headers.authorization
    if (typeof authorization !== 'string' || !/^Bearer [a-f0-9]{64}$/.test(authorization)) throw new HttpError(401, 'Unauthorized')
    const db = database()
    const { data: allowed, error: authError } = await db.rpc('store_worker_authorized', { p_token: authorization.slice(7) })
    if (authError || allowed !== true) throw new HttpError(401, 'Unauthorized')
    const {error:reminderError}=await db.rpc('store_queue_manager_reminders')
    if(reminderError)console.error('Manager reminder queue pending')
    const {error:restockError}=await db.rpc('store_queue_restocks')
    if(restockError)console.error('Restock queue pending')
    const { data: files, error: fileError } = await db.rpc('store_orphan_files')
    if (fileError) throw fileError
    for (const bucket of ['payment-screenshots', 'china-requests']) {
      const paths = (files || []).filter((file: { bucket_id: string; name: string }) => file.bucket_id === bucket).map((file: { name: string }) => file.name)
      if (paths.length) {
        const { error } = await db.storage.from(bucket).remove(paths)
        if (error) throw error
      }
    }
    const { data: events, error } = await db.rpc('store_pending_notifications')
    if (error) throw error
    // Bounded parallel work keeps retries independent of the customer checkout response.
    await Promise.all((events || []).map(async (event: { id: number; kind: string; order_id: number; user_id: string }) => {
      if (event.kind === 'custom') {
        const { data: claimed, error } = await db.rpc('store_claim_custom_notification', { p_id: event.id })
        if (error || !claimed?.id) return
        try {
          const p = claimed.payload
          if(p?.manager_reminder){const {data:state,error}=await db.rpc('store_reminder_ready',{p_event:claimed.id});if(error)throw error;if(state==='defer')return;if(state!=='ready'){await db.rpc('store_complete_notification',{p_event_id:claimed.id});return}}
          if(p?.restock){const {data:ready,error}=await db.rpc('store_restock_delivery',{p_event:claimed.id});if(error)throw error;if(ready!==true){await db.rpc('store_complete_notification',{p_event_id:claimed.id});return}}

          // Legacy queued quotes predate the UZS snapshot. Resolve only quotes,
          // never an issued order or refund, against the active store rate.
          if(p?.special_request?.status==='Оценён' && p.special_request.amount_uzs==null && !(Number(p.special_request.exchange_rate)>0)) {
            const {data:setting,error:rateError}=await db.from('settings').select('value').eq('key','exchange_rate').single()
            const rate=Number(setting?.value?.rate)
            if(rateError || !Number.isFinite(rate) || rate<=0)throw new Error('Store exchange rate unavailable')
            p.special_request.exchange_rate=rate
          }
          if(p?.restock){const {data:language,error}=await db.rpc('store_customer_language',{p_user:claimed.user_id});if(error)throw error;p.restock.language=language||'ru'}
          const manager = !!p?.manager_reminder || p?.recipient === 'manager'
          const notice = p?.manager_reminder ? managerReminder(p.manager_reminder) : p?.restock ? restockNotification(p.restock) : p?.ordinary_order ? ordinaryOrderNotification(p.ordinary_order) : p?.cancellation ? cancellationNotification(p.cancellation,manager) : p?.refund ? refundNotification(p.refund) : p?.special_order ? specialOrderNotification(p.special_order) : p?.special_request ? specialNotification(p.special_request) : { message: p.message, options: undefined }
          let chat = claimed.user_id
          if (manager) {
            chat = process.env.TELEGRAM_MANAGER_CHAT_ID
            if (!chat) { const result = await db.rpc('store_manager_chat'); if (result.error) throw result.error; chat = result.data }
          }
          await send(manager ? process.env.TELEGRAM_MANAGER_BOT_TOKEN : process.env.TELEGRAM_BOT_TOKEN, chat, notice.message, notice.options)
          if(p?.manager_reminder){const {error}=await db.rpc('store_reminder_delivered',{p_event:claimed.id});if(error)throw error}
          if(p?.restock){const result=await db.rpc('store_restock_delivery',{p_event:claimed.id,p_finish:true});if(result.error)throw result.error}
          const { error } = await db.rpc('store_complete_notification', { p_event_id: claimed.id })
          if (error) throw error
        } catch { console.error('Queued notification delivery pending') }
        return
      }
      const kind = event.kind === 'request' ? 'request' : 'order'
      const { data: record, error } = await db.from(kind === 'order' ? 'orders' : 'china_requests')
        .select('*').eq('id', event.order_id).eq('user_id', event.user_id).maybeSingle()
      if (error) return
      if (!record || ['Отменён', 'Отклонён'].includes(record.status)) {
        await db.rpc('store_complete_notification', { p_event_id: event.id })
        return
      }
      await dispatchNotification(event.user_id, kind, record)
    }))
    return res.json({ success: true })
  } catch (error) { return fail(res, error) }
}
