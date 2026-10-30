import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { validateTelegram, issueSession, verifySession } from '../server/auth.ts'
import { decodeImage } from '../server/images.ts'
import { recordId } from '../server/http.ts'

const token = '12345:test-only-bot-secret'
const now = 1793358000000
function signed(values: Record<string,string> = {}) {
  const params = new URLSearchParams({ auth_date: String(Math.floor(now/1000)), user: JSON.stringify({id:123,first_name:'100% & <Name>'}), ...values })
  const check = [...params.entries()].sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v])=>`${k}=${v}`).join('\n')
  const key = createHmac('sha256','WebAppData').update(token).digest()
  params.set('hash',createHmac('sha256',key).update(check).digest('hex'))
  return params.toString()
}
test('accepts Telegram signed user without decoding user JSON twice',()=> {
  assert.equal(validateTelegram(signed(),token,now).first_name,'100% & <Name>')
})
test('rejects forged identity and malformed/duplicate hashes',()=> {
  assert.throws(()=>validateTelegram(signed().replace('123','456'),token,now))
  assert.throws(()=>validateTelegram(signed()+'&user={}',token,now))
  assert.throws(()=>validateTelegram(signed().replace(/hash=.*/, 'hash=abc'),token,now))
  assert.throws(()=>validateTelegram(signed(),token+'wrong',now))
})
test('rejects old and future Telegram data even with a valid signature',()=> {
  assert.throws(()=>validateTelegram(signed({auth_date:String(now/1000-301)}),token,now))
  assert.throws(()=>validateTelegram(signed({auth_date:String(now/1000+60)}),token,now))
  assert.throws(()=>validateTelegram(signed({user:'null'}),token,now))
})
test('session cannot be forged, reused under another key, or used after expiry',()=> {
  const user = {id:123,first_name:'Test'}
  const session = issueSession(user,token,now)
  assert.deepEqual(verifySession(session,token,now),user)
  assert.throws(()=>verifySession(session,token,now+43200001))
  assert.throws(()=>verifySession(session,token+'x',now))
  assert.throws(()=>verifySession(session+'x',token,now))
  assert.throws(()=>verifySession(session+'.extra',token,now))
})
test('file extensions/content-type cannot disguise HTML/SVG as an image',()=> {
  for (const data of ['<svg onload="alert(1)"></svg>','<html>test</html>','GIF89atest']) {
    assert.throws(()=>decodeImage(Buffer.from(data).toString('base64')))
  }
  assert.throws(()=>decodeImage('%%%'))
  assert.throws(()=>decodeImage(Buffer.alloc(2*1024*1024+1).toString('base64')))
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5V8AAAAASUVORK5CYII=','base64')
  assert.equal(decodeImage(png.toString('base64')).type,'image/png')
})
test('order IDs must be exact positive integers; no NaN, negative, or precision loss',()=> {
  assert.equal(recordId('123'),'123')
  for (const id of ['1e2','-1',0,'001','NaN','9007199254740992',{},null]) assert.throws(()=>recordId(id))
})
