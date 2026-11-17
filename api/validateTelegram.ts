import type { VercelRequest, VercelResponse } from '../server/types.ts'
import { issueSession, validateTelegram, sessionHash } from '../server/auth.ts'
import { botToken, database, fail, limit, start } from '../server/http.ts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    start(req, res)
    const token = botToken()
    const user = validateTelegram(req.body?.initData, token)
    await limit(String(user.id), 'login', 20)
    const session = issueSession(user, token)
    const { error } = await database().rpc('store_register_session', { p_hash: sessionHash(session), p_user: String(user.id) })
    if (error) throw error
    const language=typeof user.language_code==='string'?user.language_code.toLowerCase().split(/[-_]/)[0]:null
    if(language==='ru'||language==='uz')await database().rpc('store_customer_telegram_language',{p_user:String(user.id),p_language:language})
    return res.json({ success: true, user, token: session })
  } catch (error) { return fail(res, error) }
}
