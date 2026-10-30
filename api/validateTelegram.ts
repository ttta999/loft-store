import type { VercelRequest, VercelResponse } from '@vercel/node'
import { issueSession, validateTelegram } from '../server/auth.ts'
import { botToken, fail, limit, start } from '../server/http.ts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    start(req, res)
    const token = botToken()
    const user = validateTelegram(req.body?.initData, token)
    await limit(String(user.id), 'login', 20)
    return res.json({ success: true, user, token: issueSession(user, token) })
  } catch (error) { return fail(res, error) }
}
