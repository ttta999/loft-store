import type { VercelRequest, VercelResponse } from '@vercel/node'
// Notifications are generated only by server-side order/request events.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(410).json({ error: 'Этот способ отправки уведомлений отключён' })
}
