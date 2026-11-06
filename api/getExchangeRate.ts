import type { VercelRequest, VercelResponse } from '../server/types.ts'
import { exchangeRate } from '../server/exchangeRate.ts'
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }) }
  try {
    const { rate, source, timestamp } = await exchangeRate()
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return res.json({ success: true, rate, source, timestamp })
  } catch {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(503).json({ success: false, error: 'Не удалось получить актуальный курс' })
  }
}
