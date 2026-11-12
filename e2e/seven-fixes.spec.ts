import {test,expect,STORE,ADMIN} from './fixture'

for(const exit of ['app','telegram'])test(`новые товары: боковой переход и обратный ${exit} сохраняют прокрутку`,async({page,harness})=>{
 const original=harness.db.products[0];harness.db.products.push(...Array.from({length:12},(_,i)=>({...original,id:`extra-${i}`,name_ru:`Товар ${i}`,created_at:new Date(Date.now()-(i+1)*86400000).toISOString()})))
 await page.goto(STORE)
 const more=page.locator('[data-surface-link="products:newest"]').getByRole('button',{name:'Больше',exact:true})
 await more.scrollIntoViewIfNeeded();const scroll=await page.evaluate(()=>scrollY)
 await page.evaluate(()=>{(window as any).slides=[];window.addEventListener('loft:tabs-start',(event:any)=>{(window as any).slides.push({direction:event.detail.direction,kind:event.detail.kind});(window as any).lastSlide=event.detail.finished})})
 await more.click();await expect(page).toHaveURL(STORE+'/all-products');await page.evaluate(async()=>{await (window as any).lastSlide})
 await expect.poll(()=>page.evaluate(()=>(window as any).slides)).toEqual([{direction:1,kind:'section'}])
 if(exit==='app')await page.locator('.loft-header button').click();else await page.evaluate(()=>(window as any).telegramBack())
 await expect(page).toHaveURL(STORE+'/');await page.evaluate(async()=>{await (window as any).lastSlide})
 await expect.poll(()=>page.evaluate(()=>(window as any).slides)).toEqual([{direction:1,kind:'section'},{direction:-1,kind:'section'}])
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(scroll)
 await expect(more).toBeInViewport()
})

for(const exit of ['app','telegram'])test(`бренд → товар → ${exit}: общая фотография, тот же бренд и прокрутка`,async({page,harness})=>{
 const original=harness.db.products[0];harness.db.products.push(...Array.from({length:12},(_,i)=>({...original,id:`brand-extra-${i}`,name_ru:`Бренд товар ${i}`,created_at:new Date(Date.now()-(i+1)*86400000).toISOString()})))
 await page.goto(STORE);await page.getByText('Бренды',{exact:true}).click()
 await page.getByRole('button',{name:/Тестовый бренд/}).click()
 const source=page.url();const id='brand-extra-7';const card=page.locator(`[data-product-placement="brand:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb:${id}"]`)
 await card.scrollIntoViewIfNeeded();await expect.poll(()=>card.locator('img').evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBeGreaterThan(0)
 await card.evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY-110));const scroll=await page.evaluate(()=>scrollY)
 await page.evaluate(()=>{
  (window as any).photos=[];if(!document.startViewTransition)return
  const native=document.startViewTransition.bind(document)
  document.startViewTransition=cb=>{const record:any={placement:document.querySelector('[style*="loft-product-photo"]')?.closest('[data-product-card]')?.getAttribute('data-product-placement')};(window as any).photos.push(record);const t=native(cb);(window as any).lastPhoto=t;t.ready.then(()=>record.mode=document.documentElement.dataset.loftMotion).catch((e:Error)=>record.error=e.message);return t}
 })
 await card.locator('img').click({position:{x:30,y:30}});await expect(page.locator('[data-product-hero]')).toBeVisible()
 await page.evaluate(async()=>{await (window as any).lastPhoto?.finished})
 if(await page.evaluate(()=>typeof document.startViewTransition==='function'))expect(await page.evaluate(()=>(window as any).photos[0])).toEqual({placement:`brand:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb:${id}`,mode:'product'})
 if(exit==='app')await page.locator('.loft-header button').click();else await page.evaluate(()=>(window as any).telegramBack())
 await expect(page).toHaveURL(source);await page.evaluate(async()=>{await (window as any).lastPhoto?.finished})
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(scroll);await expect(card).toBeInViewport()
 if(await page.evaluate(()=>typeof document.startViewTransition==='function'))expect(await page.evaluate(()=>(window as any).photos.at(-1).mode)).toBe('product')
})

for(const photo of [true,false])test(`админка: фотография спецзаказа ${photo?'есть':'отсутствует'}, доставка без упаковки`,async({page,harness})=>{
 const r=harness.db.china_requests[0];Object.assign(r,{image_url:photo?'private:china-requests/900000001/special.png':null})
 const o=harness.db.orders[0];Object.assign(o,{delivery_method:'delivery',payment_method:'online_card',status:'Ожидает оплаты',payment_status:'pending',receipt_submitted_at:new Date().toISOString(),payment_screenshot_url:'private:payment-screenshots/900000001/pay.png',special_fulfillment:true,special_order_id:r.id,items:[{name:'Спецтовар с фото',isSpecialOrder:true,specialRequestId:r.id,size:'42',quantity:1,priceUsd:100}]})
 if(photo)await page.clock.install()
 page.on('dialog',d=>d.accept());await page.goto(ADMIN+'/orders')
 const preview=page.getByRole('link',{name:'Открыть фото: Спецтовар с фото',exact:true})
 await expect(preview).toHaveCount(photo?1:0)
 if(photo){
  await expect(preview.locator('img')).toBeVisible();await expect(preview).toHaveAttribute('href',/fixture-product/)
  const signs=()=>harness.calls.filter(c=>c.path.includes('/storage/v1/object/sign/china-requests')).length
  const initial=signs();await page.clock.fastForward(14*60_000+1_000)
  await expect.poll(signs).toBe(initial+1)
  await page.clock.resume()
 }
 await page.getByRole('button',{name:'Подтвердить',exact:true}).click();await expect.poll(()=>o.status).toBe('Принят')
 await page.getByRole('button',{name:/Заказ №1001/}).click()
 await expect(preview).toHaveCount(photo?1:0)
 for(const status of ['Заказан у поставщика','В пути','Прибыл в страну','Собирается'])await page.getByRole('button',{name:status,exact:true}).click()
 await expect(page.getByRole('button',{name:'Упакован',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Передан курьеру',exact:true}).click()
 await page.locator('.loft-modal').getByRole('button',{name:/Передать курьеру|Сохранить|Подтвердить/}).click()
 await expect.poll(()=>o.status).toBe('Передан курьеру');await page.getByRole('button',{name:'Доставлен',exact:true}).click();await expect.poll(()=>o.status).toBe('Доставлен')
})

test('обычная доставка: сборка сразу передаётся курьеру, самовывоз сохраняет готовность',async({page,harness})=>{
 const o=harness.db.orders[0];Object.assign(o,{delivery_method:'delivery',payment_method:'online_card',payment_status:'paid',paid_at:new Date().toISOString(),status:'В обработке'})
 await page.goto(ADMIN+'/orders?order=1001')
 await expect(page.getByRole('button',{name:'Упакован',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Передан курьеру',exact:true}).click();await page.locator('.loft-modal').getByRole('button',{name:/Передать курьеру|Сохранить|Подтвердить/}).click();await expect.poll(()=>o.status).toBe('Выдан')
})
