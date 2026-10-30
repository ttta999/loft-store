import { createHmac, timingSafeEqual } from 'node:crypto'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}
export interface TelegramUser {
  id: number; first_name: string; last_name?: string; username?: string; photo_url?: string; language_code?: string
}
function equalHex(a: string, b: string) {
  return /^[a-f0-9]{64}$/i.test(b) && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}
export function validateTelegram(initData: unknown, botToken: string, now = Date.now()): TelegramUser {
  if (typeof initData !== 'string' || initData.length > 16384) throw new HttpError(401, 'Откройте магазин заново через Telegram')
  const params = new URLSearchParams(initData)
  if ([...params.keys()].some((key, i, keys) => keys.indexOf(key) !== i)) throw new HttpError(401, 'Некорректные данные Telegram')
  const hash = params.get('hash') || ''
  params.delete('hash')
  const check = [...params.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${k}=${v}`).join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computed = createHmac('sha256', secret).update(check).digest('hex')
  if (!equalHex(computed, hash)) throw new HttpError(401, 'Не удалось подтвердить вход через Telegram')
  const date = Number(params.get('auth_date'))
  if (!Number.isSafeInteger(date) || date > now / 1000 + 30 || now / 1000 - date > 300) throw new HttpError(401, 'Откройте магазин заново через Telegram')
  let user: TelegramUser
  try { user = JSON.parse(params.get('user') || 'null') } catch { throw new HttpError(401, 'Некорректный пользователь Telegram') }
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0 || typeof user.first_name !== 'string') throw new HttpError(401, 'Некорректный пользователь Telegram')
  return user
}
function sessionKey(botToken: string) {
  return createHmac('sha256', botToken).update('loft-store/customer-session/v1').digest()
}
export function issueSession(user: TelegramUser, botToken: string, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ user, exp: Math.floor(now / 1000) + 43200 })).toString('base64url')
  return `${body}.${createHmac('sha256', sessionKey(botToken)).update(body).digest('hex')}`
}
export function verifySession(token: unknown, botToken: string, now = Date.now()): TelegramUser {
  if (typeof token !== 'string' || token.length > 16384) throw new HttpError(401, 'Войдите через Telegram')
  const [body, signature, extra] = token.split('.')
  if (!body || !signature || extra || !equalHex(createHmac('sha256', sessionKey(botToken)).update(body).digest('hex'), signature)) throw new HttpError(401, 'Войдите через Telegram')
  let session: { user: TelegramUser; exp: number }
  try { session = JSON.parse(Buffer.from(body, 'base64url').toString()) } catch { throw new HttpError(401, 'Войдите через Telegram') }
  if (!Number.isFinite(session.exp) || session.exp <= now / 1000 || !Number.isSafeInteger(session.user?.id)) throw new HttpError(401, 'Откройте магазин заново через Telegram')
  return session.user
}
