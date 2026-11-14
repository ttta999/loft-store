import assert from 'node:assert/strict'
export async function testReminderIntervals(pg){
 const scalar=async(s,a=[])=>Object.values((await pg.query(s,a)).rows[0])[0]
 let config=await scalar('select public.store_admin_reminder_settings()')
 const times=(await pg.query(`select to_char((now() at time zone 'Asia/Tashkent')-interval '1 hour','HH24:MI') start,to_char((now() at time zone 'Asia/Tashkent')+interval '1 hour','HH24:MI') finish`)).rows[0]
 const patch=async value=>{const r=await scalar('select public.store_admin_reminder_settings($1,$2)',[JSON.stringify(value),config.version]);config=r;return r}
 await assert.rejects(()=>patch({repeat_hours:0}),/Интервал повторения/)
 await assert.rejects(()=>patch({timezone:'Invalid/Zone'}),/действительный часовой пояс/)
 await assert.rejects(()=>patch({work_start:'10:00',work_end:'10:00'}),/не должно совпадать/)
 await assert.rejects(()=>patch({repeat_hours:1.5}),/корректное количество часов/)
 await patch({work_start:times.start,work_end:times.finish,rules:Object.fromEntries(Object.keys(config.value.rules).map(k=>[k,{hours:2,enabled:k==='payment_review',telegram:k==='payment_review'}]))})
 for(const hours of [1,5,24]){
  await patch({repeat_hours:hours});assert.equal(config.value.repeat_hours,hours);assert.equal(config.value.timezone,'Asia/Tashkent')
  const id=await scalar(`insert into public.orders(user_id,payment_method,status,payment_status,receipt_submitted_at) values('123456','online_card','Ожидает оплаты','pending',now()-interval '3 hours') returning id`)
  const count=()=>scalar(`select count(*)::int from private.store_outbox where payload#>>'{manager_reminder,entity_id}'=$1`,[String(id)])
  await pg.exec('select public.store_queue_manager_reminders();select public.store_queue_manager_reminders()');assert.equal(await count(),1)
  const event=await scalar(`select max(id) from private.store_outbox where payload#>>'{manager_reminder,entity_id}'=$1`,[String(id)])
  await scalar('select public.store_reminder_delivered($1)',[event]);await scalar('select public.store_reminder_delivered($1)',[event]);assert.equal(await scalar('select public.store_reminder_ready($1)',[event]),'obsolete')
  await pg.query('update private.store_outbox set sent_at=now() where id=$1',[event]);await pg.query(`update private.store_reminder_deliveries set sent_at=now()-make_interval(secs=>$2) where event_id=$1`,[event,hours*3600-60]);await pg.exec('select public.store_queue_manager_reminders()');assert.equal(await count(),1)
  await pg.query(`update private.store_reminder_deliveries set sent_at=now()-make_interval(secs=>$2) where event_id=$1`,[event,hours*3600+60]);await pg.exec('select public.store_queue_manager_reminders();select public.store_queue_manager_reminders()');assert.equal(await count(),2)
  await pg.query(`update public.orders set payment_status='paid',paid_at=now() where id=$1`,[id]);const next=await scalar(`select max(id) from private.store_outbox where payload#>>'{manager_reminder,entity_id}'=$1`,[String(id)]);assert.equal(await scalar('select public.store_reminder_ready($1)',[next]),'obsolete')
 }
 const before=config.value.rules.refund.hours;await patch({rules:{payment_review:{hours:3,enabled:true,telegram:true}}});assert.equal(config.value.rules.refund.hours,before)
 await assert.rejects(()=>scalar('select public.store_admin_reminder_settings($1,$2)',[JSON.stringify({repeat_hours:5}),config.version-1]),/другим менеджером/)
 await pg.exec('set role service_role;select public.store_queue_manager_reminders();reset role')
 console.log('PASS: repeat intervals 1/5/24h use actual delivery time, stage identity and independent partial settings; errors are specific; no duplicate or completed-task reminders')
}
