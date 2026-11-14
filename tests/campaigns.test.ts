import test from 'node:test'
import assert from 'node:assert/strict'
import {campaignMessage} from '../src/lib/campaignMessage.ts'
import {deliverCampaign,runCampaignBatch} from '../server/campaignDelivery.ts'
const content={title:'<Zegna>',message:'Коллекция & скидки',button_label:'Открыть',target_type:'home'}
test('campaign content is escaped, preserves full text, enforces photo and text limits',()=>{assert.match(campaignMessage(content).html,/&lt;Zegna&gt;/);assert.match(campaignMessage(content).html,/&amp;/);assert.throws(()=>campaignMessage({...content,image_ref:'photo',message:'x'.repeat(1024)}));assert.throws(()=>campaignMessage({...content,message:'x'.repeat(4096)}))})
test('Telegram outcomes distinguish retry_after, blocked recipient, transient and ambiguous results',async()=>{
 const original=globalThis.fetch;try{
  const prepared={token:'fixture-only',method:'sendMessage',body:{}}
  for(const [status,payload,outcome] of [[200,{ok:true,result:{message_id:12}},'sent'],[429,{error_code:429,parameters:{retry_after:75}},'retry'],[403,{error_code:403},'failed'],[500,{error_code:500},'retry'],[400,{error_code:400},'failed']] as const){globalThis.fetch=async()=>new Response(JSON.stringify(payload),{status});const result=await deliverCampaign(prepared);assert.equal(result.outcome,outcome);if(status===429)assert.equal(result.retryAfter,75);if(status===403)assert.equal(result.blocked,true)}
  globalThis.fetch=async()=>{throw new Error('synthetic lost response')};assert.equal((await deliverCampaign(prepared)).outcome,'uncertain')
 }finally{globalThis.fetch=original}
})
test('worker checks consent immediately before sending; revoked recipient sends nothing; lost finish ack never resends',async()=>{
 const original=globalThis.fetch,token=process.env.TELEGRAM_BOT_TOKEN;process.env.TELEGRAM_BOT_TOKEN='fixture-only';let sends=0
 globalThis.fetch=async(url)=>{if(String(url).endsWith('/getMe'))return new Response(JSON.stringify({ok:true,result:{is_bot:true,username:'FixtureStoreBot',has_main_web_app:true}}));sends++;return new Response(JSON.stringify({ok:true,result:{message_id:12}}))}
 try{
  const calls:any[]=[];let next=true,ready=false,failFinish=false
  const db={rpc:async(name:string,args?:any)=>{calls.push({name,args});if(name==='store_campaign_claim'){if(!next)return {data:null};next=false;return {data:{kind:'campaign',id:'fixture-job',lease:'fixture-lease',user_id:'123456',payload:content}}}if(name==='store_campaign_preflight')return {data:ready};if(name==='store_campaign_finish'&&failFinish){failFinish=false;return {error:{message:'lost ack'}}}return {data:true}}} as any
  await runCampaignBatch(db,{pause:async()=>{}});assert.equal(sends,0);assert.equal(calls.find(c=>c.name==='store_campaign_finish').args.p_outcome,'skipped')
  calls.length=0;next=true;ready=true;failFinish=true;await runCampaignBatch(db,{pause:async()=>{}});assert.equal(sends,1);assert.deepEqual(calls.filter(c=>c.name==='store_campaign_finish').map(c=>c.args.p_outcome),['sent','uncertain'])
 }finally{globalThis.fetch=original;if(token)process.env.TELEGRAM_BOT_TOKEN=token;else delete process.env.TELEGRAM_BOT_TOKEN}
})
test('campaign worker rejects public/customer credentials before claiming any job',async()=>{
 const {default:worker}=await import('../api/campaignWorker.ts'),original=globalThis.fetch
 process.env.SUPABASE_URL='https://fixture.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture'
 const paths:string[]=[];globalThis.fetch=async(url)=>{const p=new URL(String(url)).pathname;paths.push(p);assert.ok(p.endsWith('/store_worker_authorized'));return Response.json(false)}
 try{for(const auth of [undefined,'Bearer customer-session','Bearer '+'0'.repeat(64)]){const res:any={code:200,setHeader(){},status(n:number){this.code=n;return this},json(){return this}};await worker({method:'POST',headers:{'content-type':'application/json',authorization:auth},body:{}} as any,res);assert.equal(res.code,401)}assert.equal(paths.length,1)}finally{globalThis.fetch=original}
})
