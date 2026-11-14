// Shape-only temporary PostgreSQL, never connects to Supabase or Telegram.
import {readFile} from 'node:fs/promises'
import {pathToFileURL,fileURLToPath} from 'node:url'
import {existsSync} from 'node:fs'
import assert from 'node:assert/strict'
const installed=new URL('../tests/sql/node_modules/@electric-sql/pglite/dist/index.js',import.meta.url)
if(!process.env.LOFT_PGLITE_ROOT&&!existsSync(installed))throw new Error('Install isolated test dependencies: npm ci --prefix tests/sql --ignore-scripts')
const path=process.env.LOFT_PGLITE_ROOT||fileURLToPath(installed)
const {PGlite}=await import(pathToFileURL(path).href)
const pg=new PGlite()
const file=async path=>readFile(new URL('../'+path,import.meta.url),'utf8')
try{
 await pg.exec(await file('tests/sql/store2-baseline.sql'))
 for(const migration of ['20261113161430_store2_live_data.sql','20261113162424_store2_customer_preferences.sql','20261113165503_store2_catalog_growth.sql','20261113170735_store2_history_and_tasks.sql','20261113171316_store2_worker_helper_grants.sql','20261113173520_store2_campaigns.sql','20261113174041_store2_campaign_claim_cleanup.sql','20261114065022_store2_campaign_delivery_guard.sql','20261114162026_store2_reminder_intervals.sql','20261114162041_store2_telegram_photos.sql','20261114162050_store2_locales_and_restock_tick.sql']){
  if(migration.includes('history_and_tasks'))await pg.exec(`insert into public.orders(id,user_id,status,delivery_method,created_at,paid_at,receipt_submitted_at) values(9999,'123456','Готов','pickup',now()-interval '30 days',now()-interval '29 days',now()-interval '29 days')`)
  await pg.exec(await file('supabase/migrations/'+migration));console.log('Applied locally:',migration)
 }
 const query=async(sql,args=[]) => (await pg.query(sql,args)).rows
 const scalar=async(sql,args=[])=>Object.values((await query(sql,args))[0])[0]
 await pg.exec(`insert into public.categories(id,name_ru,name_uz,is_active) values('shoes','Обувь','Poyabzal',true);insert into public.subcategories(id,category_id,name_ru,name_uz,size_type,sizes,is_active) values('sneakers','shoes','Кроссовки','Krossovka','numeric','["41","42","43"]',true);insert into public.products(id,name_ru,name_uz,category,subcategory,price_usd,size_type,is_active) values('11111111-1111-4111-8111-111111111111','Кроссовки','Krossovka','shoes','sneakers',100,'numeric',true);insert into public.product_variants(id,product_id,size_value,stock) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','42',0)`)
 assert.equal(await scalar(`select has_function_privilege('anon','public.store_customer_preferences(text,jsonb,bigint)','execute')`),false)
 assert.equal(await scalar(`select has_function_privilege('authenticated','public.store_restock(text,text,uuid,uuid)','execute')`),false)
 let profile=await scalar(`select public.store_customer_preferences('123456')`);assert.equal(profile.version,0);assert.equal(profile.name,'')
 profile=await scalar(`select public.store_customer_preferences('123456',$1::jsonb,0)`,[JSON.stringify({name:'Тестовый клиент',phone:'+998901234567',addresses:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',label:'Дом',address:'Навои дом 15',comment:'',is_default:true}],sizes:[{category:'shoes',subcategory:'sneakers',system:'numeric',size:'42'}]})]);assert.equal(profile.addresses.length,1);assert.equal(profile.sizes[0].size,'42')
 await assert.rejects(()=>query(`select public.store_customer_preferences('123456','{"name":"Другой клиент"}',0)`),/Profile changed/)
 assert.equal((await scalar(`select public.store_customer_preferences('654321')`)).name,'')
 await assert.rejects(()=>query(`select public.store_customer_preferences('123456',$1::jsonb,$2)`,[JSON.stringify({sizes:[{category:'shoes',subcategory:'sneakers',system:'alphabetical',size:'42'}]}),profile.version]),/Invalid size/)
 console.log('PASS: profile permissions, isolation, optimistic versions and size validation')
 await assert.rejects(()=>query(`select public.store_admin_size_chart(null,'{}')`),/permission denied|insufficient_privilege/)
 assert.equal(await scalar(`select has_column_privilege('anon','public.size_charts','updated_by','select')`),false)
 console.log('PASS: size-chart MFA boundary and safe public projection')
 const variant='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
 let subs=await scalar(`select public.store_restock('123456','subscribe',$1)`,[variant]);assert.equal(subs.length,1)
 assert.equal((await scalar(`select public.store_restock('123456','subscribe',$1)`,[variant])).length,1)
 assert.equal((await scalar(`select public.store_restock('654321','list')`)).length,0)
 await pg.exec(`update public.product_variants set stock=2;select public.store_queue_restocks()`);assert.equal(await scalar('select count(*)::int from private.store_outbox'),0)
 await pg.exec(`update private.store_restock_candidates set available_after=clock_timestamp()-interval '1 second';select public.store_queue_restocks();select public.store_queue_restocks()`)
 assert.equal(await scalar('select count(*)::int from private.store_outbox'),1)
 const event=await scalar('select id from private.store_outbox');assert.equal(await scalar('select public.store_restock_delivery($1)',[event]),true)
 await scalar(`select public.store_restock('123456','cancel',null,$1)`,[subs[0].id]);assert.equal(await scalar('select public.store_restock_delivery($1)',[event]),false)
 console.log('PASS: variant subscriptions, ownership, deduplication, stable availability, cancel-before-send')
 await pg.exec(`insert into auth.users(id) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');select set_config('loft.test_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);select set_config('loft.test_aal','aal2',false);insert into public.products(id,name_ru,name_uz,category,subcategory,price_usd,size_type,is_active) values('22222222-2222-4222-8222-222222222222','Другие кроссовки','Krossovka','shoes','sneakers',110,'numeric',true)`)
 const product={name_ru:'Кроссовки',name_uz:'Krossovka',category:'shoes',subcategory:'sneakers',price_usd:100,images:[],size_type:'numeric'}
 const expected={version:0,variants:[{id:variant,stock:2}]}
 const save=(recommendations,stock=3)=>scalar(`select public.store_admin_save_product_recommendations('11111111-1111-4111-8111-111111111111',$1,'[]',$2,$3,$4)`,[JSON.stringify(product),JSON.stringify([{size_value:'42',stock,color_key:null}]),JSON.stringify(expected),JSON.stringify(recommendations)])
 await assert.rejects(()=>save({similar:['11111111-1111-4111-8111-111111111111'],outfit:[]},5),/Invalid recommended product/)
 assert.equal(await scalar('select stock from public.product_variants where id=$1',[variant]),2)
 assert.equal(await scalar('select catalog_version from public.products where id=$1',['11111111-1111-4111-8111-111111111111']),0)
 await save({similar:['22222222-2222-4222-8222-222222222222'],outfit:[]})
 assert.equal(await scalar('select count(*)::int from public.product_recommendations'),1)
 assert.equal(await scalar('select stock from public.product_variants where id=$1',[variant]),3)
 console.log('PASS: product + recommendations save atomically; invalid recommendation rolls stock/version back')
 const legacy=await scalar('select public.store_admin_order_history(9999)');assert.equal(legacy.length,3);assert.equal(legacy.some(e=>e.event_type==='status_changed'),false)
 assert.equal((await scalar('select public.store_admin_tasks()')).tasks.find(t=>t.order_id===9999).started_at,null)
 await pg.exec(`select set_config('loft.test_admin','',false);select set_config('loft.test_aal','',false)`)
 const order=await scalar(`insert into public.orders(user_id,client_name,delivery_method,payment_method,items,status,special_fulfillment) values('123456','Клиент','pickup','upon_receipt','[]','Активный',false) returning id`)
 await query(`update public.orders set status='В обработке' where id=$1`,[order]);const events=await scalar('select count(*)::int from private.store_order_events where order_id=$1',[order]);await query(`update public.orders set status='В обработке' where id=$1`,[order]);assert.equal(await scalar('select count(*)::int from private.store_order_events where order_id=$1',[order]),events)
 await pg.exec(`select set_config('loft.test_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);select set_config('loft.test_aal','aal2',false)`)
 const history=await scalar('select public.store_admin_order_history($1)',[order]);assert.equal(history.find(e=>e.event_type==='order_created').actor_type,'client');assert.ok(history.some(e=>e.event_type==='status_changed'))
 await pg.exec(`insert into public.orders(user_id,client_name,delivery_method,payment_method,status,special_fulfillment,receipt_submitted_at,checkout_abandoned_at) values('123456','Черновик','pickup','online_card','Ожидает оплаты',false,null,null)`)
 const review=await scalar(`insert into public.orders(user_id,client_name,delivery_method,payment_method,status,payment_status,special_fulfillment,receipt_submitted_at) values('123456','Клиент','delivery','online_card','Ожидает оплаты','pending',false,now()-interval '3 hours') returning id`)
 await pg.exec(`insert into public.orders(user_id,client_name,payment_method,status,payment_status,special_fulfillment,paid_at) values('123456','Клиент','online_card','В пути','paid',true,now()-interval '25 hours')`)
 const tasks=await scalar('select public.store_admin_tasks()');assert.equal(tasks.counts.payment_review,1);assert.equal(tasks.counts.assembly,1);assert.equal(tasks.counts.supplier_purchase||0,0)
 let config=await scalar('select public.store_admin_reminder_settings()');config.value.rules.payment_review.enabled=true;config.value.rules.payment_review.telegram=true
 const times=(await query(`select to_char((now() at time zone 'Asia/Tashkent')-interval '1 hour','HH24:MI') start,to_char((now() at time zone 'Asia/Tashkent')+interval '1 hour','HH24:MI') finish`))[0];config.value.work_start=times.start;config.value.work_end=times.finish
 await query('select public.store_admin_reminder_settings($1,$2)',[JSON.stringify(config.value),config.version])
 await pg.exec(`select public.store_queue_manager_reminders();select public.store_queue_manager_reminders()`);assert.equal(await scalar(`select count(*)::int from private.store_outbox where payload ? 'manager_reminder'`),1)
 const reminder=await scalar(`select id from private.store_outbox where payload ? 'manager_reminder'`);assert.equal(await scalar('select public.store_reminder_ready($1)',[reminder]),'ready')
 await query('update private.store_outbox set sent_at=now() where id=$1',[reminder]);await pg.exec('select public.store_queue_manager_reminders()');assert.equal(await scalar(`select count(*)::int from private.store_outbox where payload ? 'manager_reminder'`),1)
 await query(`update public.orders set payment_status='paid',paid_at=now() where id=$1`,[review]);assert.equal(await scalar('select public.store_reminder_ready($1)',[reminder]),'obsolete')
 config=await scalar('select public.store_admin_reminder_settings()')
 const closed=(await query(`select to_char((now() at time zone 'Asia/Tashkent')+interval '1 hour','HH24:MI') start,to_char((now() at time zone 'Asia/Tashkent')+interval '2 hours','HH24:MI') finish`))[0]
 config.value.work_start=closed.start;config.value.work_end=closed.finish;await query('select public.store_admin_reminder_settings($1,$2)',[JSON.stringify(config.value),config.version])
 await pg.exec(`insert into public.orders(user_id,client_name,payment_method,status,payment_status,special_fulfillment,receipt_submitted_at) values('123456','Ночная задача','online_card','Ожидает оплаты','pending',false,now()-interval '3 hours');select public.store_queue_manager_reminders()`)
 assert.equal(await scalar(`select count(*)::int from private.store_outbox where payload ? 'manager_reminder'`),1)
 console.log('PASS: no reminder is queued outside configured store hours')
 console.log('PASS: factual legacy journal, actor/source, no duplicate status events, correct tasks, reminder deduplication and stop-on-resolution')
 await pg.exec('set role service_role;select public.store_queue_restocks();select public.store_queue_manager_reminders();reset role;')
 console.log('PASS: worker helpers execute under service_role, not only the database owner')
 const {testCampaigns}=await import('../tests/sql/store2-campaigns.mjs');await testCampaigns(pg)
 const {testReminderIntervals}=await import('../tests/sql/reminder-intervals.mjs');await testReminderIntervals(pg)
 const {testLocales}=await import('../tests/sql/locales.mjs');await testLocales(pg)
 console.log('ALL LOCAL DATABASE CHECKS PASSED')
} catch(error){console.error(error.message);console.error({position:error.position,internalPosition:error.internalPosition,internalQuery:error.internalQuery});if(error.query)console.error('SQL context:',error.query.slice(0,800));process.exitCode=1}finally{await pg.close()}
