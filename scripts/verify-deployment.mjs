// Smoke checks use a synthetic, signed customer and never create orders or send messages.
import { readFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'
const site = process.argv[2]
const admin = process.argv[3]
if (!site || !admin) throw new Error('Usage: node scripts/verify-deployment.mjs <store-origin> <admin-origin>')
for (const origin of [site,admin]) {
  const parsed=new URL(origin)
  if(parsed.protocol!=='https:' || parsed.pathname!=='/') throw new Error('Use HTTPS origins only')
}
async function call(origin,path,body,bearer) {
  return fetch(new URL(path,origin),{
    method:'POST',headers:{'Content-Type':'application/json',...(bearer?{Authorization:`Bearer ${bearer}`}:{})},
    body:JSON.stringify(body),signal:AbortSignal.timeout(15000),redirect:'error',
  })
}
async function expect(label,response,status) {
  if(response.status!==status) { const detail=(await response.text()).slice(0,800); throw new Error(`${label}: expected ${status}, got ${response.status}; ${detail}`) }
  console.log(`PASS ${label}: ${status}`)
}
if (process.argv[4] === '--diagnostic') {
  for (const [origin,path,body] of [[site,'/api/store',{action:'orders'}],[site,'/api/validateTelegram',{initData:'invalid'}],[site,'/api/sendNotification',{}],[admin,'/api/sendNotification',{}]]) {
    const response=await call(origin,path,body)
    console.log(path,origin,response.status,(await response.text()).slice(0,250))
  }
  process.exit(0)
}
await expect('customer API rejects anonymous requests',await call(site,'/api/store',{action:'orders'}),401)
await expect('legacy notification sender disabled',await call(site,'/api/sendNotification',{chatId:'900000001',message:'test'}),410)
await expect('manager notification sender requires login',await call(admin,'/api/sendNotification',{chatId:'900000001',message:'test',botType:'client'}),401)
await expect('invalid Telegram signature rejected',await call(site,'/api/validateTelegram',{initData:'auth_date=1&hash=bad'}),401)
const env=readFileSync(new URL('../.env',import.meta.url),'utf8')
const token=env.match(/^TELEGRAM_BOT_TOKEN=(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g,'')
if(!token) throw new Error('Local main bot token is needed for the synthetic login check')
const params=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:900000001,first_name:'Security smoke fixture'})})
const data=[...params.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n')
const secret=createHmac('sha256','WebAppData').update(token).digest()
params.set('hash',createHmac('sha256',secret).update(data).digest('hex'))
const login=await call(site,'/api/validateTelegram',{initData:params.toString()})
await expect('signed login and server database configuration work',login,200)
const session=await login.json()
if(typeof session.token!=='string') throw new Error('Session token missing')
for(const action of ['orders','requests']) {
  const response=await call(site,'/api/store',{action,user_id:'victim'},session.token)
  await expect(`customer ${action} are scoped to the synthetic user`,response,200)
  const result=await response.json()
  if(!Array.isArray(result.data)||result.data.length!==0) throw new Error('Unexpected synthetic-user history')
}
console.log('All deployment smoke checks passed; no orders or messages were created.')
