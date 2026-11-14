import {test,expect,STORE,ADMIN} from './fixture'
test('UZS cards show whole sums consistently',async({page,harness})=>{
 harness.db.products[0].price_usd=210;harness.db.settings.find(s=>s.key==='exchange_rate')!.value.rate=11963.85
 await page.goto(STORE)
 await expect(page.getByText('2 512 409 сум',{exact:true}).first()).toBeVisible()
 await page.locator('[data-product-card] img').first().click()
 await expect(page.locator('[data-product-hero]')).toBeVisible();await expect(page.getByText('2 512 409 сум',{exact:true}).first()).toBeVisible()
})
test('revision fallback updates an open order list without losing its expanded row',async({page,harness})=>{
 harness.db.store_data_revisions=[{topic:'orders',revision:1}]
 await page.clock.install();await page.goto(ADMIN+'/orders?order=1001')
 await expect(page.getByRole('button',{name:/Заказ №1001/})).toBeVisible()
 await expect.poll(()=>harness.calls.filter(c=>c.path.endsWith('/store_data_revisions')).length).toBeGreaterThan(0)
 harness.db.orders[0].status='В обработке';harness.db.store_data_revisions[0].revision=2
 await page.clock.fastForward(31000)
 await expect(page.getByRole('button',{name:'Готов к выдаче',exact:true})).toBeVisible()
 expect(harness.db.orders[0].status).toBe('В обработке')
 await expect(page.getByText('Тестовые кроссовки',{exact:true}).first()).toBeVisible()
})
