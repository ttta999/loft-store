import {test,expect,STORE,ADMIN,productId} from './fixture'
test('manager saves repeat interval 5 independently of each reminder rule',async({page,harness})=>{
 await page.goto(ADMIN+'/settings?section=reminders');await page.getByLabel('Интервал повторения',{exact:true}).fill('5');await page.getByRole('button',{name:'Сохранить рабочее время'}).click();await expect.poll(()=>harness.db.reminders[0].value.repeat_hours).toBe(5)
 await page.getByRole('switch',{name:'Оплата не проверена',exact:true}).click();await page.getByLabel('Срок: Оплата не проверена',{exact:true}).fill('2');await page.getByRole('button',{name:'Сохранить: Оплата не проверена',exact:true}).click();await expect.poll(()=>harness.db.reminders[0].value.rules.payment_review.enabled).toBe(true);expect(harness.db.reminders[0].value.repeat_hours).toBe(5)
 await page.reload();await expect(page.getByLabel('Интервал повторения',{exact:true})).toHaveValue('5')
})
test('saved size changes and deletion use the existing bottom sheet, with server acknowledgement',async({page,harness})=>{
 await page.goto(STORE+'/profile?section=sizes');await page.getByRole('button',{name:/Кроссовки.*Не указан/}).click();let sheet=page.getByRole('dialog',{name:'Выберите размер'});await sheet.getByRole('button',{name:'42',exact:true}).click();await expect(sheet).toHaveCount(0);await expect.poll(()=>harness.db.preferences?.[0]?.sizes?.[0]?.size).toBe('42')
 await page.getByRole('button',{name:/Кроссовки.*42/}).click();await sheet.getByRole('button',{name:'Удалить сохранённый размер'}).click();await expect.poll(()=>harness.db.preferences[0].sizes.length).toBe(0)
})
test('checkout offers branded opt-in only for normalized changed contacts',async({page,harness})=>{
 harness.db.preferences=[{name:'Тестовый покупатель',phone:'+998901234567',delivery_method:'pickup',addresses:[],sizes:[],version:1}]
 await page.goto(STORE+'/product/'+productId);await page.getByRole('button',{name:/Размер.*Выберите/}).click();await page.getByRole('button',{name:'42',exact:true}).click();await page.getByRole('button',{name:'В корзину',exact:true}).click();await expect(page.getByRole('button',{name:'Добавлено',exact:true})).toBeVisible();await page.goto(STORE+'/cart');await page.getByRole('button',{name:/Оформить заказ/}).click();await expect(page.getByRole('switch',{name:'Сохранить данные'})).toHaveCount(0)
 await page.getByPlaceholder('Ваше имя').fill('Другой покупатель');const toggle=page.getByRole('switch',{name:'Сохранить данные'});await expect(toggle).toHaveAttribute('aria-checked','false');await toggle.click();await expect(toggle).toHaveAttribute('aria-checked','true')
})
