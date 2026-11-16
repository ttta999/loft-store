import {test,expect,STORE,ADMIN,install} from './fixture'
const instant='2027-01-15T23:30:00.000Z'
for(const [zone,time,day] of [['Asia/Tashkent','04:30','16.01'],['Europe/Riga','01:30','16.01'],['America/New_York','18:30','15.01']]){
 test.describe(zone,()=>{
  test.use({timezoneId:zone})
  test('all timestamp surfaces use device time; reminders keep Uzbekistan hours and no location access',async({page,harness})=>{
   test.setTimeout(60000)
   await page.addInitScript(()=>{(window as any).locationReads=0;navigator.geolocation.getCurrentPosition=()=>{(window as any).locationReads++;throw Error('Location must not be requested')}})
   const o=harness.db.orders[0];Object.assign(o,{created_at:instant,paid_at:instant.slice(0,-1),payment_status:'paid'})
   harness.db.china_requests[0].created_at=instant
   harness.db.order_events=[{id:'local-time-event',order_id:o.id,event_type:'payment_confirmed',created_at:instant,actor_type:'manager',metadata:{}}]
   harness.db.refunds=[{id:1,order_id:o.id,user_id:o.user_id,status:'Возврат выполнен',currency:'UZS',amount:100,created_at:instant,completed_at:instant}]
   harness.db.campaigns=[{id:'local-campaign',name:'Existing campaign',title:'Saved',message:'Saved',button_label:'Open',target_type:'home',status:'scheduled',created_at:instant,scheduled_at:instant,sent_count:0,failed_count:0,translations:{}}]
   await page.goto(STORE+'/profile?section=orders&order=1001');await expect(page.locator('.loft-detail')).toContainText(time);await expect(page.locator('[data-refund-summary]')).toContainText(time)
   await page.goto(STORE+'/profile?section=china&request=3001');await expect(page.locator('.loft-detail')).toContainText(time)
   await page.goto(ADMIN+'/orders?order=1001');await expect(page.getByRole('button',{name:/Заказ №1001/})).toContainText(time);await expect(page.getByRole('button',{name:/Заказ №1001/})).toContainText(day);await expect(page.getByRole('heading',{name:'История',exact:true}).locator('..')).toContainText(time)
   await page.goto(ADMIN+'/china');await expect(page.getByRole('button',{name:/Спецзаказ №3001/})).toContainText(time)
   await page.goto(ADMIN+'/refunds');await expect(page.getByRole('button',{name:/Возврат №1/})).toContainText(time)
   await page.goto(ADMIN+'/campaigns');await expect(page.getByRole('button',{name:/Existing campaign/})).toContainText(time)
   await page.goto(ADMIN+'/settings?section=reminders');await expect(page.getByText('По времени Узбекистана',{exact:true})).toBeVisible();await expect(page.getByLabel('Часовой пояс магазина',{exact:true})).toHaveCount(0);await page.getByLabel('Начало рабочего дня',{exact:true}).fill('09:00');await page.getByRole('button',{name:'Сохранить рабочее время',exact:true}).click();await expect.poll(()=>harness.db.reminders[0].value.work_start).toBe('09:00');expect(harness.db.reminders[0].value.timezone).toBe('Asia/Tashkent');expect(harness.calls.filter(c=>c.body?.p_value?.timezone)).toHaveLength(0)
   expect(await page.evaluate(()=>(window as any).locationReads||0)).toBe(0);expect(harness.errors).toEqual([])
  })
  test('new campaign sends UTC and remains at the same instant on another device timezone',async({page,harness,browser})=>{
   await page.goto(ADMIN+'/campaigns');await page.getByRole('button',{name:'Новая рассылка',exact:true}).click();const editor=page.getByRole('dialog',{name:'Редактор рассылки'});await editor.getByRole('textbox',{name:'Заголовок',exact:true}).fill('Local schedule');await editor.getByRole('textbox',{name:'Текст сообщения',exact:true}).fill('One exact UTC instant');await editor.getByRole('button',{name:'Отправить рассылку',exact:true}).click();const preview=page.getByRole('dialog',{name:'Предпросмотр рассылки'});await preview.getByRole('button',{name:'Дополнительные настройки',exact:true}).click();await expect(preview.getByText('По вашему местному времени',{exact:true})).toBeVisible();await preview.getByRole('textbox',{name:'Дата и время',exact:true}).fill('2027-07-01T15:00');const expected=zone==='Asia/Tashkent'?'2027-07-01T10:00:00.000Z':zone==='Europe/Riga'?'2027-07-01T12:00:00.000Z':'2027-07-01T19:00:00.000Z';page.once('dialog',d=>d.accept());await preview.getByRole('button',{name:'Запланировать',exact:true}).click();await expect.poll(()=>harness.db.campaigns[0].scheduled_at).toBe(expected);expect(harness.calls.find(c=>c.body?.p_action==='schedule')!.body.p_when).toBe(expected)
   const other=await browser.newContext({timezoneId:'Pacific/Honolulu'});try{const second=await install(other);second.db=structuredClone(harness.db);const p=await other.newPage();await p.goto(ADMIN+'/campaigns');const localHour=String((Number(expected.slice(11,13))+14)%24).padStart(2,'0')+':00';await expect(p.getByRole('button',{name:/Local schedule/})).toContainText(localHour);expect(second.db.campaigns[0].scheduled_at).toBe(expected);expect(second.calls.some(c=>c.body?.p_action==='schedule')).toBe(false)}finally{await other.close()}
   expect(harness.errors).toEqual([])
  })
 })
}
test('an open page and an unsaved selected instant follow a device timezone change without a write',async({page,harness,browser})=>{
 test.skip(browser.browserType().name()!=='chromium','Live timezone override uses Chrome DevTools; cross-device timezone coverage also runs in WebKit')
 const client=await page.context().newCDPSession(page);await client.send('Emulation.setTimezoneOverride',{timezoneId:'America/New_York'})
 harness.db.campaigns=[{id:'same-device',name:'Same device',title:'Saved',message:'Saved',button_label:'Open',target_type:'home',status:'draft',created_at:instant,version:1,translations:{},content_language:'ru',sent_count:0,failed_count:0}]
 await page.goto(ADMIN+'/campaigns');await page.getByRole('button',{name:/Same device/}).click();await page.getByRole('button',{name:'Предпросмотр',exact:true}).click();const preview=page.getByRole('dialog',{name:'Предпросмотр рассылки'});await preview.getByRole('button',{name:'Дополнительные настройки',exact:true}).click();const input=preview.getByRole('textbox',{name:'Дата и время',exact:true});await input.fill('2027-07-01T15:00')
 await client.send('Emulation.setTimezoneOverride',{timezoneId:'Asia/Tashkent'});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(input).toHaveValue('2027-07-02T00:00');await expect(page.getByRole('button',{name:/Same device/})).toContainText('04:30');expect(harness.calls.some(c=>c.body?.p_action==='schedule')).toBe(false)
 page.once('dialog',d=>d.accept());await preview.getByRole('button',{name:'Запланировать',exact:true}).click();await expect.poll(()=>harness.db.campaigns[0].scheduled_at).toBe('2027-07-01T19:00:00.000Z')
})
