import assert from 'node:assert/strict'
export async function testLocales(pg){
 const scalar=async(s,a=[])=>Object.values((await pg.query(s,a)).rows[0])[0]
 assert.equal(await scalar(`select has_function_privilege('authenticated','public.store_customer_language(text,text)','execute')`),false)
 assert.equal(await scalar(`select has_function_privilege('authenticated','private.store_admin_campaign_action_base(text,uuid,jsonb,bigint,text,uuid)','execute')`),false)
 await scalar(`select public.store_customer_language('888888','uz')`);assert.equal((await scalar(`select public.store_customer_preferences('888888')`)).version,0)
 await scalar(`select public.store_customer_preferences('888888','{"name":"Yangi mijoz"}',0)`);assert.equal(await scalar(`select public.store_customer_language('888888')`),'uz')
 const base={name:'Bilingual',title:'Русский',message:'Русское сообщение',button_label:'Открыть',target_type:'home',audience_type:'all',content_language:'ru',translations:{uz:{title:'O‘zbekcha',message:'Yangi kolleksiya',button_label:'Ochish'}}}
 const act=(a,c,v=null,key=null)=>scalar('select public.store_admin_campaign_action($1,$2,$3,$4,null,$5)',[a,c?.id||null,v?JSON.stringify(v):null,c?.version||null,key])
 const c=await act('save',null,base);assert.equal(c.translations.uz.title,'O‘zbekcha');assert.equal(c.content_language,'ru')
 const copy=await act('copy',c);assert.deepEqual(copy.translations,c.translations);assert.equal(copy.content_language,'ru')
 const key='ffffffff-ffff-4fff-8fff-ffffffffffff';const t=await act('test',c,{test_language:'uz'},key);assert.equal(await scalar('select snapshot->>\'test_language\' from private.store_campaign_tests where id=$1',[t.id]),'uz');await assert.rejects(()=>act('test',c,{test_language:'ru'},key),/другого языка/)
 await assert.rejects(()=>act('save',c,{...base,translations:{uz:{title:'Faqat sarlavha'}}}),/дополнительной версии/)
 console.log('PASS: verified per-customer language, independent contact version, bilingual campaign save/copy/immutable test snapshot, no private base RPC bypass')
}
