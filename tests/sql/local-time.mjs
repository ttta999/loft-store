import assert from 'node:assert/strict'
export async function testLocalTime(pg){
 const scalar=async(s,a=[])=>Object.values((await pg.query(s,a)).rows[0])[0]
 await pg.exec(`select set_config('loft.test_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);select set_config('loft.test_aal','aal2',false);insert into public.subscribers(user_id,chat_id,is_subscribed) values('555555','555555',true);select public.store_marketing_consent('555555',true)`)
 const settings=await scalar('select public.store_admin_reminder_settings()')
 await assert.rejects(()=>scalar('select public.store_admin_reminder_settings($1,$2)',[JSON.stringify({timezone:'Europe/Riga'}),settings.version]),/по времени Узбекистана/)
 assert.equal((await scalar('select public.store_admin_reminder_settings()')).value.timezone,'Asia/Tashkent')
 const times=(await pg.query(`select to_char((now() at time zone 'Asia/Tashkent')-interval '1 hour','HH24:MI') start,to_char((now() at time zone 'Asia/Tashkent')+interval '1 hour','HH24:MI') finish`)).rows[0]
 await scalar('select public.store_admin_reminder_settings($1,$2)',[JSON.stringify({work_start:times.start,work_end:times.finish}),settings.version])
 const value={name:'UTC schedule',title:'UTC',message:'One exact instant',button_label:'Open',target_type:'home',audience_type:'all'}
 const act=(a,c=null,v=null,w=null)=>scalar('select public.store_admin_campaign_action($1,$2,$3,$4,$5,null)',[a,c?.id||null,v?JSON.stringify(v):null,c?.version||null,w])
 const when=await scalar(`select to_char((now()+interval '2 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`)
 for(const zone of ['America/New_York','Europe/Riga','Asia/Tashkent']){
  await pg.exec(`set time zone '${zone}'`);assert.equal(await scalar('select private.store_within_work_hours()'),true)
  const c=await act('save',null,value),audience=await scalar('select public.store_admin_campaign_audience($1)',[c.id])
  const scheduled=await act('schedule',c,{confirmed_count:audience.matched,confirmed_available:audience.available},when)
  assert.equal(scheduled.status,'scheduled');assert.equal(await scalar('select scheduled_at=$2::timestamptz from public.campaigns where id=$1',[c.id,when]),true)
  await pg.exec("set time zone 'Pacific/Honolulu'");assert.equal(await scalar('select scheduled_at=$2::timestamptz from public.campaigns where id=$1',[c.id,when]),true)
 }
 assert.equal(await scalar("select scheduled_at='2099-01-15T15:00:00Z'::timestamptz from public.campaigns where name='Existing scheduled'"),true)
 await pg.exec("set time zone 'UTC'")
 const c=await act('save',null,value),audience=await scalar('select public.store_admin_campaign_audience($1)',[c.id])
 await assert.rejects(()=>act('schedule',c,{confirmed_count:audience.matched,confirmed_available:audience.available},'2027-01-01T12:00:00'),/Укажите дату и время/)
 assert.equal(await scalar("select has_function_privilege('authenticated','private.store_admin_campaign_action_base(text,uuid,jsonb,bigint,text,uuid)','execute')"),false)
 console.log('PASS: UTC schedules are session-timezone independent, existing schedules unchanged, working hours fixed to Uzbekistan, manager cannot change timezone')
}
