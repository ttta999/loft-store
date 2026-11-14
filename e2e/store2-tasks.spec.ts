import {test,expect,ADMIN} from './fixture'
test('task center links to payment review and shows transactional order history',async({page,harness})=>{
 const o=harness.db.orders[0];Object.assign(o,{payment_method:'online_card',status:'Ожидает оплаты',receipt_submitted_at:new Date().toISOString()})
 harness.db.order_events=[{id:'event-1',order_id:o.id,event_type:'order_created',actor_type:'client',created_at:new Date().toISOString(),metadata:{}}]
 await page.goto(ADMIN);await expect(page.getByRole('heading',{name:'Требует внимания',exact:true})).toBeVisible();await page.getByRole('button',{name:/Проверить оплату/}).click();await expect(page).toHaveURL(ADMIN+'/orders?task=payment');await expect(page.getByText('Тестовый покупатель',{exact:true}).first()).toBeVisible()
 Object.assign(o,{status:'Активный',payment_status:'paid',paid_at:new Date().toISOString()});await page.goto(ADMIN+'/orders?order=1001');await expect(page.getByRole('heading',{name:'История',exact:true})).toBeVisible();await expect(page.getByText('Заказ оформлен',{exact:true})).toBeVisible();await expect(page.getByText(/Клиент/).last()).toBeVisible()
})
test('manager configures explicit reminder activation and store working hours',async({page,harness})=>{
 await page.goto(ADMIN+'/settings');await expect(page.getByRole('heading',{name:'Напоминания менеджеру'})).toBeVisible();await page.getByLabel('Оплата не проверена',{exact:true}).check();await page.getByLabel('Telegram: Оплата не проверена',{exact:true}).check();await page.getByLabel('Срок: Оплата не проверена',{exact:true}).fill('3');await page.getByRole('button',{name:'Сохранить напоминания',exact:true}).click();await expect.poll(()=>harness.db.reminders?.[0]?.value.rules.payment_review.hours).toBe(3);expect(harness.db.reminders[0].value.timezone).toBe('Asia/Tashkent');expect(harness.db.reminders[0].value.rules.payment_review.enabled).toBe(true)
})
