import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { HttpError, verifySession } from './auth.ts'

export function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new HttpError(503, 'Вход временно недоступен')
  return token
}
export function database() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new HttpError(503, 'Магазин временно недоступен')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
export function userFromRequest(req: VercelRequest) {
  const auth = req.headers.authorization
  return verifySession(typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null, botToken())
}
export function start(req: VercelRequest, res: VercelResponse, method = 'POST') {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== method) { res.setHeader('Allow', method); throw new HttpError(405, 'Метод не поддерживается') }
  if (method === 'POST' && !req.headers['content-type']?.includes('application/json')) throw new HttpError(415, 'Ожидается JSON')
  if (Number(req.headers['content-length'] || 0) > 3_000_000) throw new HttpError(413, 'Слишком большой запрос')
}
export function fail(res: VercelResponse, error: unknown) {
  const known = error instanceof HttpError
  if (!known) console.error('Store request failed')
  return res.status(known ? error.status : 500).json({ error: known ? error.message : 'Не удалось выполнить действие. Попробуйте ещё раз.' })
}
export async function limit(userId: string, action: string, maximum: number, seconds = 60) {
  const { data, error } = await database().rpc('store_rate_limit', { p_user: userId, p_action: action, p_limit: maximum, p_seconds: seconds })
  if (error) throw new HttpError(503, 'Магазин временно недоступен')
  if (!data) throw new HttpError(429, 'Слишком много запросов. Подождите немного.')
}
export function recordId(value: unknown): string {
  const result = String(value ?? '')
  if (!/^[1-9]\d{0,15}$/.test(result) || !Number.isSafeInteger(Number(result))) throw new HttpError(400, 'Некорректный номер заказа')
  return result
}
export function text(value: unknown, max: number, min = 0): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new HttpError(400, 'Проверьте заполненные поля')
  return value.trim()
}
