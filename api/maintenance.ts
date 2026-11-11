import { specialNotification } from '../server/specialNotifications.ts'
import { specialOrderNotification } from '../server/specialOrderNotifications.ts'
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
    const { data: events, error } = await db.rpc('store_pending_notifications')
    if (error) throw error
    // Bounded parallel work keeps retries independent of the customer checkout response.
    await Promise.all((events || []).map(async (event: { id: number; kind: string; order_id: number; user_id: string }) => {
      if (event.kind === 'custom') {
        const { data: claimed, error } = await db.rpc('store_claim_custom_notification', { p_id: event.id })
        if (error || !claimed?.id) return
        try {
          const notice = claimed.payload?.special_order ? specialOrderNotification(claimed.payload.special_order) : claimed.payload?.special_request ? specialNotification(claimed.payload.special_request) : { message: claimed.payload.message, options: undefined }
          await send(process.env.TELEGRAM_BOT_TOKEN, claimed.user_id, notice.message, notice.options)
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
    const { data: files, error: fileError } = await db.rpc('store_orphan_files')
    if (fileError) throw fileError
    for (const bucket of ['payment-screenshots', 'china-requests']) {
      const paths = (files || []).filter((file: { bucket_id: string; name: string }) => file.bucket_id === bucket).map((file: { name: string }) => file.name)
      if (paths.length) {
        const { error } = await db.storage.from(bucket).remove(paths)
        if (error) throw error
      }
    }
    return res.json({ success: true })
  } catch (error) { return fail(res, error) }
}
