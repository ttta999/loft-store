import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/store.ts'
import {issueSession} from '../server/auth.ts'
process.env.TELEGRAM_BOT_TOKEN='fixture-profile';process.env.SUPABASE_URL='https://fixture.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture'
const token=issueSession({id:900000701,first_name:'Fixture'},process.env.TELEGRAM_BOT_TOKEN)
test('customer preferences always use verified Telegram identity and versioned writes; no public table reads',async()=>{
 const original=fetch,calls:any[]=[]
 globalThis.fetch=async(input,init)=>{const path=new URL(String(input)).pathname,body=JSON.parse(String(init?.body||'{}'));calls.push({path,body});if(path.endsWith('store_validate_session')||path.endsWith('store_rate_limit'))return Response.json(true);assert.ok(path.endsWith('/rpc/store_customer_preferences')||path.endsWith('/rpc/store_marketing_consent'));assert.equal(body.p_user,'900000701');return Response.json({name:'Fixture',version:2})}
 try{for(const action of ['preferences','savePreferences','marketingConsent']){const res:any={code:200,setHeader(){},status(c:number){this.code=c;return this},json(body:any){this.body=body;return this}};await handler({method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:{action,enabled:true,user_id:'999999999',patch:{name:'Fixture'},version:1}} as any,res);assert.equal(res.code,200);assert.equal(res.body.data.version,2)}assert.equal(calls.filter(c=>c.path.endsWith('store_customer_preferences')).length,2)}finally{globalThis.fetch=original}
})
