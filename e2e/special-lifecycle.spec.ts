import { test, expect, STORE, ADMIN, productId } from './fixture'
import type { Page } from '@playwright/test'
async function regular(page: Page) {
 await page.goto(`${STORE}/product/${productId}`)
 await page.locator('[data-dialog-trigger="size"]').click()
 await page.getByRole('button',{name:'42',exact:true}).click()
 await page.getByRole('button',{name:'В корзину',exact:true}).click()
 await expect(page.getByText('Товар добавлен в корзину!',{exact:true})).toBeVisible()
}
async function special(page: Page,id=3001) {
 await page.goto(STORE+'/profile?section=china')
 await page.locator(`[data-profile-link="request:${id}"]`).click()
 await page.locator('.loft-detail').getByRole('button',{name:'Добавить в корзину',exact:true}).click()
}
async function checkout(page: Page) {
 await page.getByRole('button',{name:/Корзина$/}).click()
 await page.getByRole('button',{name:'Оформить заказ',exact:true}).click()
 await page.getByPlaceholder('Ваше имя',{exact:true}).fill('Покупатель')
 await page.getByPlaceholder('+998 XX XXX XX XX',{exact:true}).fill('+998901234567')
}


const receipt = {name:'receipt.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhKkAAAAASUVORK5CYII=','base64')}

test('корзина сохраняет спецзаказ при попытке добавить обычный или второй специальный товар',async({page,harness})=>{
 Object.assign(harness.db.china_requests[0],{status:'Оценён',manager_price:100})
 harness.db.china_requests.push({...harness.db.china_requests[0],id:3002,product_name:'Второй спецзаказ'})
 await special(page)
 await page.goto(`${STORE}/product/${productId}`)
 await page.locator('[data-dialog-trigger="size"]').click()
 await page.getByRole('button',{name:'42',exact:true}).click()
 await page.getByRole('button',{name:'В корзину',exact:true}).click()
 await expect(page.getByText('Спецзаказы оформляются отдельно. Чтобы добавить этот товар, сначала оформите спецзаказ или удалите его из корзины',{exact:true})).toBeVisible()
 await special(page,3002)
 await expect(page.getByText('Каждый спецзаказ оформляется отдельно. Сначала завершите оформление текущего спецзаказа',{exact:true})).toBeVisible()
 const cart=await page.evaluate(()=>JSON.parse(localStorage.getItem('loft-store')!).state.cart)
 expect(cart).toHaveLength(1);expect(cart[0].specialRequestId).toBe(3001)
 await page.goto(STORE+'/cart')
 await page.getByRole('button',{name:'Удалить из корзины',exact:true}).click()
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('loft-store')!).state.cart)).toHaveLength(0)
})

for(const delivery of ['pickup','delivery']) test(`отдельный спецзаказ: предоплата, подтверждение и вся цепочка ${delivery}`,async({page,context,harness})=>{
 Object.assign(harness.db.china_requests[0],{status:'Оценён',manager_price:100})
 await special(page);await checkout(page)
 await expect(page.getByRole('radio',{name:'Оплата при получении',exact:true})).toHaveCount(0)
 await expect(page.getByRole('radio',{name:'Оплата переводом — 100% предоплата',exact:true})).toBeChecked()
 if(delivery==='delivery'){
   await page.getByRole('button',{name:'Доставка',exact:true}).click()
   await page.locator('[data-surface-dialog="checkout"] textarea').fill('Навои дом 15 квартира 23')
 }
 await page.getByRole('button',{name:'Перейти к оплате',exact:true}).click()
 await expect.poll(()=>harness.db.orders.some(o=>o.id===2001)).toBe(true)
 expect(harness.db.china_requests[0].status).toBe('Оценён')
 const order=harness.db.orders.find(o=>o.id===2001)!
 expect(order.items).toHaveLength(1);expect(order.items[0].quantity).toBe(1);expect(order.payment_method).toBe('online_card')
 await page.locator('input[type=file]').setInputFiles(receipt)
 await expect(page.getByText('Скриншот загружен',{exact:true})).toBeVisible()
 expect(order.payment_status).toBe('pending');expect(order.status).toBe('Ожидает оплаты')
 expect(harness.db.china_requests[0].status).toBe('Оценён')
 const manager=await context.newPage();await manager.goto(ADMIN+'/orders?order=2001')
 await expect(manager.getByRole('button',{name:'Заказан у поставщика',exact:true})).toHaveCount(0)
 manager.on('dialog',dialog=>dialog.accept())
 await manager.getByRole('button',{name:'Подтвердить',exact:true}).click()
 await expect.poll(()=>order.status).toBe('Принят')
 expect(harness.db.china_requests[0].status).toBe('Оформлен')
 const sequence=['Заказан у поставщика','В пути','Прибыл в страну','Собирается',...(delivery==='pickup'?['Готов к выдаче','Получен']:['Упакован','Передан курьеру','Доставлен'])]
 for(const step of sequence){
   const action=manager.getByRole('button',{name:step,exact:true})
   await expect(action).toBeVisible()
   if(step==='Заказан у поставщика') await expect(manager.getByRole('button',{name:'Доставлен',exact:true})).toHaveCount(0)
   await action.click()
   if(step==='Передан курьеру') await manager.locator('.loft-modal').getByRole('button',{name:/Передать курьеру|Сохранить|Подтвердить/}).click()
   await expect.poll(()=>order.status).toBe(step)
 }
 await page.getByRole('button',{name:'Готово',exact:true}).click()
 await page.goto(STORE+'/profile?section=china')
 await page.locator('[data-profile-link="request:3001"]').click()
 await page.getByRole('button',{name:'Перейти к заказу',exact:true}).click()
 await expect(page).toHaveURL(STORE+'/profile?section=orders&order=2001')
 await expect(page.locator('.loft-detail').getByText(delivery==='pickup'?'Получен':'Доставлен',{exact:true})).toBeVisible()
 await expect(page.locator('.loft-detail').getByText('Спецзаказ №3001',{exact:true})).toBeVisible()
 expect(harness.calls.filter(c=>c.path==='/api/sendNotification')).toHaveLength(0)
})

test('отмена незавершённой оплаты оставляет заявку оценённой и позволяет повторить оформление',async({page,harness})=>{
 Object.assign(harness.db.china_requests[0],{status:'Оценён',manager_price:100})
 await special(page);await checkout(page)
 await page.getByRole('button',{name:'Перейти к оплате',exact:true}).click()
 await page.getByRole('button',{name:'Отменить',exact:true}).click()
 expect(harness.db.china_requests[0].status).toBe('Оценён')
 expect(harness.db.china_requests[0].reserved_order_id).toBeNull()
 await page.getByRole('button',{name:'Перейти к оплате',exact:true}).click()
 await page.locator('input[type=file]').setInputFiles(receipt)
 await expect(page.getByText('Скриншот загружен',{exact:true})).toBeVisible()
 expect(harness.db.china_requests[0].reserved_order_id).toBe(2002)
 expect(harness.db.china_requests[0].converted_to_order_id).toBeFalsy()
})

test('клиент отменяет заявку, менеджер отклоняет с причиной; закрытые заявки без кнопки корзины',async({page,context,harness})=>{
 await page.goto(STORE+'/profile?section=china')
 await page.locator('[data-profile-link="request:3001"]').click()
 page.once('dialog',dialog=>dialog.accept())
 await page.getByRole('button',{name:'Отменить спецзаказ',exact:true}).click()
 await expect.poll(()=>harness.db.china_requests[0].status).toBe('Отменён')
 harness.db.china_requests.push({...harness.db.china_requests[0],id:3002,status:'На оценке',product_name:'Отклоняемая заявка'})
 const manager=await context.newPage();await manager.goto(ADMIN+'/china')
 await manager.getByRole('button',{name:/Спецзаказ №3002/}).click()
 await manager.getByRole('button',{name:'Отклонён',exact:true}).click()
 await manager.locator('.loft-modal textarea').fill('Нет нужного размера')
 await manager.locator('.loft-modal').getByRole('button',{name:/Отклонить/}).click()
 await expect.poll(()=>harness.db.china_requests[1].status).toBe('Отклонён')
 await page.reload();await page.locator('[data-profile-link="request:3002"]').click()
 await expect(page.getByText('Причина: Нет нужного размера',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Добавить в корзину',exact:true})).toHaveCount(0)
})
