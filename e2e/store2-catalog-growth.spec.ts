import {test,expect,STORE,productId} from './fixture'
const second='22222222-2222-4222-8222-222222222222'
test('recommendation product round trip uses shared photo and restores its source product',async({page,harness})=>{
 harness.db.products.push({...harness.db.products[0],id:second,name_ru:'Другие кроссовки',price_usd:110});harness.db.product_variants.push({...harness.db.product_variants[0],id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',product_id:second})
 await page.goto(STORE+`/product/${productId}`);const card=page.locator(`[data-product-placement="recommendation:${productId}:similar:${second}"]`);await card.scrollIntoViewIfNeeded();const scroll=await page.evaluate(()=>scrollY)
 await card.locator('img').click();await expect(page).toHaveURL(STORE+`/product/${second}`);await expect(page.locator('[data-product-hero]')).toBeVisible();await page.locator('.loft-header button').click();await expect(page).toHaveURL(STORE+`/product/${productId}`);await expect(card).toBeInViewport();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(scroll)
})
test('unavailable real size offers subscription, prevents adding and can be cancelled in profile',async({page,harness})=>{
 harness.db.product_variants[0].stock=0;await page.goto(STORE+`/product/${productId}`);await page.locator('[data-dialog-trigger="size"]').click();await page.getByRole('dialog').getByRole('button',{name:/42.*Нет в наличии/}).click();await page.getByRole('button',{name:'Уведомить о поступлении',exact:true}).click();await expect(page.getByRole('button',{name:'Вы подписаны',exact:true})).toBeVisible();expect(harness.db.restocks.length).toBe(1)
 await expect(page.getByRole('button',{name:'В корзину',exact:true})).toHaveCount(0);await page.goto(STORE+'/profile?section=restocks');await page.getByRole('button',{name:'Отменить подписку',exact:true}).click();await expect(page.getByText('Активных подписок пока нет',{exact:true})).toBeVisible();expect(harness.db.restocks).toHaveLength(0)
})
test('prepared Telegram sharing invokes chooser without sending a client message',async({page,harness})=>{
 await page.goto(STORE+`/product/${productId}`);await page.evaluate(()=>{(window.Telegram!.WebApp as any).shareMessage=(id:string,callback:(ok:boolean)=>void)=>{(window as any).sharedId=id;callback(true)}})
 await page.getByRole('button',{name:/Поделиться/}).click();await expect.poll(()=>page.evaluate(()=>(window as any).sharedId)).toBe('fixture-prepared-message');expect(harness.calls.some(c=>c.body?.action==='prepareShare')).toBe(true);expect(harness.calls.some(c=>c.path.includes('sendMessage'))).toBe(false)
})
test('first Mini App launch opens shared product after verified authentication',async({page,harness})=>{
 const param=Buffer.from(JSON.stringify({type:'product',id:productId})).toString('base64url');await page.goto(STORE+'/?tgWebAppStartParam='+param);await expect(page).toHaveURL(STORE+`/product/${productId}`);await expect(page.locator('[data-product-hero]')).toBeVisible();expect(harness.calls.some(c=>c.path==='/api/validateTelegram')).toBe(true)
})
