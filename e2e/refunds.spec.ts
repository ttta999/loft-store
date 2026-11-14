import {test,expect,ADMIN,STORE} from './fixture'

test('возврат: проверка оплаты, закрепление менеджера и обязательная квитанция',async({page,harness})=>{
 const order=harness.db.orders[0];Object.assign(order,{status:'Отменён',payment_method:'online_card',receipt_submitted_at:new Date().toISOString(),payment_status:'payment_review',cancelled_by:'client'})
 harness.db.refunds=[{id:1,order_id:order.id,user_id:order.user_id,status:'Проверка платежа',created_at:new Date().toISOString(),cancelled_by:'client'}]
 page.on('dialog',d=>d.accept())
 await page.goto(ADMIN)
 await expect(page.getByRole('button',{name:/Возвраты/})).toContainText('1')
 await page.getByRole('button',{name:/Возвраты/}).click()
 await page.getByRole('button',{name:/Возврат №1/}).click()
 await expect(page.getByRole('button',{name:'Оплата поступила',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Взять в работу',exact:true}).click()
 await page.getByLabel('Фактически полученная сумма').fill('100')
 await page.getByLabel('Валюта платежа').selectOption('USD')
 await page.getByRole('button',{name:'Оплата поступила',exact:true}).click()
 await expect(page.getByRole('button',{name:/Возврат №1/})).toContainText('Ожидает возврата')
 await expect(page.getByRole('button',{name:'Подтвердить выполненный возврат',exact:true})).toBeDisabled()
 await page.getByLabel('Квитанция обратного перевода', {exact:true}).setInputFiles({name:'proof.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 fixture')})
 await expect.poll(()=>harness.db.refunds[0].proof_url).toContain('private:refund-proofs/1/')
 await page.getByRole('checkbox').check()
 await page.getByRole('button',{name:'Подтвердить выполненный возврат',exact:true}).click()
 await expect(page.getByRole('dialog')).toBeVisible()
 await page.getByRole('button',{name:'Перевод выполнен',exact:true}).click()
 await expect(page.getByRole('button',{name:/Возврат №1/})).toContainText('Возврат выполнен')
 expect(harness.db.orders[0].status).toBe('Отменён')
 await page.goto(STORE+'/profile?section=orders&order='+order.id)
 await expect(page.locator('.loft-detail').getByText('Отменён клиентом',{exact:true})).toBeVisible()
 await expect(page.locator('.loft-detail').getByText('Возврат выполнен',{exact:true})).toBeVisible()
 await expect(page.locator('.loft-detail').getByText('Сумма: 100 $',{exact:true})).toBeVisible()
})

test('админка показывает только следующий этап обычного заказа и требует причину отмены',async({page,harness})=>{
 await page.goto(ADMIN+'/orders?order=1001')
 await expect(page.getByRole('button',{name:'Собирается',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Получен',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Отменить заказ',exact:true}).click()
 await expect(page.locator('.loft-modal').getByRole('button',{name:/Отменить заказ/})).toBeDisabled()
 await page.locator('.loft-modal textarea').fill('Нет товара на складе')
 await page.locator('.loft-modal').getByRole('button',{name:/Отменить заказ/}).click()
 await expect.poll(()=>harness.db.orders[0].cancelled_by).toBe('store')
 await expect(page.locator('span').getByText('Отменён магазином',{exact:true})).toBeVisible()
})

test('проверка возврата не показывает клиенту неподтверждённую сумму и внутренние комментарии',async({page,harness})=>{
 const o=harness.db.orders[0];Object.assign(o,{status:'Отменён',cancelled_by:'store',payment_method:'online_card',payment_status:'payment_review'})
 harness.db.refunds=[{id:1,order_id:o.id,status:'Проверка платежа',amount:null,currency:null,manager_comment:'Служебная банковская информация'}]
 await page.goto(STORE+'/profile?section=orders&order='+o.id)
 await expect(page.locator('.loft-detail').getByText('Проверка платежа',{exact:true})).toBeVisible()
 await expect(page.getByText('Служебная банковская информация')).toHaveCount(0)
 await expect(page.locator('.loft-detail').getByText('Сумма к возврату',{exact:true})).toHaveCount(0)
})

for(const theme of ['light','dark'])test(`возвраты: общий переход, кэш и оформление ${theme}`,async({page,harness},info)=>{
 const o=harness.db.orders[0];Object.assign(o,{status:'Отменён',payment_status:'refund_pending',paid_at:new Date().toISOString()})
 harness.db.refunds=[{id:1,order_id:o.id,status:'Ожидает возврата',created_at:new Date().toISOString(),amount:100,currency:'USD',cancelled_by:'client',orders:o}]
 await page.addInitScript(theme=>{localStorage.setItem('loft_admin_theme',theme)},theme)
 await page.goto(ADMIN)
 await expect(page.locator('[data-admin-card="/refunds"]')).toBeVisible()
 await page.evaluate(()=>{
  if(!document.startViewTransition)return
  const native=document.startViewTransition.bind(document);(window as any).refundTransitions=[];(window as any).refundErrors=[]
  document.startViewTransition=callback=>{
   const transition=native(callback);(window as any).refundTransition=transition
   transition.ready.then(()=>{(window as any).refundTransitions.push(document.documentElement.dataset.adminMotion)}).catch((e:Error)=>{(window as any).refundErrors.push(e.message)})
   return transition
  }
 })
 await page.locator('[data-admin-card="/refunds"]').click()
 await expect(page.getByRole('heading',{name:'Возвраты',exact:true})).toBeVisible()
 await page.evaluate(async()=>{await (window as any).refundTransition?.finished})
 if(await page.evaluate(()=>typeof document.startViewTransition==='function')){await expect.poll(()=>page.evaluate(()=>(window as any).refundTransitions)).toEqual(['surface']);expect(await page.evaluate(()=>(window as any).refundErrors)).toEqual([])}
 const header=page.locator('main > .sticky');await expect(header).toBeVisible()
 await page.getByLabel('Поиск возвратов').fill('1001')
 await page.getByRole('combobox').selectOption('Ожидает возврата')
 const row=page.locator('[data-refund-row="1"]');
 const properties=await row.getByRole('button',{name:/Возврат №1/}).evaluate(el=>{el.click();return new Promise<string[]>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(el.parentElement!.querySelector('[data-refund-collapse]')!.getAnimations().map(a=>(a as CSSTransition).transitionProperty)))))})
 expect(properties).toContain('grid-template-rows')
 await expect(row.getByRole('button',{name:'Взять в работу',exact:true})).toBeVisible()
 await expect.poll(()=>row.locator('[data-refund-collapse]').evaluate(e=>e.getBoundingClientRect().height)).toBeGreaterThan(100)
 const before=harness.calls.filter(c=>c.path.includes('/store_admin_refunds')).length
 const histories=harness.calls.filter(c=>c.path.includes('/store_admin_refund_history')).length
 await row.getByRole('button',{name:/Возврат №1/}).click()
 await expect.poll(()=>row.locator('[data-refund-collapse]').evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(1)
 await expect(row.getByRole('button',{name:'Взять в работу',exact:true})).toHaveCount(0)
 await row.getByRole('button',{name:/Возврат №1/}).click()
 expect(harness.calls.filter(c=>c.path.includes('/store_admin_refund_history')).length).toBe(histories)
 await page.getByRole('button',{name:'На главную',exact:true}).click()
 await expect(page.locator('[data-admin-card="/refunds"]')).toBeVisible()
 await page.evaluate(async()=>{await (window as any).refundTransition?.finished})
 if(await page.evaluate(()=>typeof document.startViewTransition==='function'))await expect.poll(()=>page.evaluate(()=>(window as any).refundTransitions)).toEqual(['surface','surface'])
 await page.locator('[data-admin-card="/refunds"]').click()
 await expect(page.getByLabel('Поиск возвратов')).toHaveValue('1001')
 await expect(page.getByRole('combobox')).toHaveValue('Ожидает возврата')
 await expect(page.locator('[data-refund-row="1"]').getByRole('button',{name:/Возврат №1/})).toHaveAttribute('aria-expanded','true')
 expect(harness.calls.filter(c=>c.path.includes('/store_admin_refunds')).length).toBe(before)
 await page.evaluate(async()=>{await (window as any).refundTransition?.finished})
 await page.screenshot({path:info.outputPath(`refunds-${theme}.png`),fullPage:true})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.getByRole('button',{name:'Обновить возвраты',exact:true}).click()
 await expect.poll(()=>harness.calls.filter(c=>c.path.includes('/store_admin_refunds')).length).toBe(before+1)
})

test('возвраты: уменьшение движения отключает общий переход и анимацию раскрытия',async({page,harness})=>{
 const o=harness.db.orders[0];harness.db.refunds=[{id:1,order_id:o.id,status:'Проверка платежа',created_at:new Date().toISOString()}]
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto(ADMIN)
 await page.locator('[data-admin-card="/refunds"]').click()
 await expect(page.getByRole('heading',{name:'Возвраты',exact:true})).toBeVisible()
 const row=page.locator('[data-refund-row="1"]')
 await row.getByRole('button',{name:/Возврат №1/}).click()
 expect(await row.locator('[data-refund-collapse]').evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration))).toBeLessThan(0.001)
 await page.getByRole('button',{name:'На главную',exact:true}).click()
 await expect(page.locator('[data-admin-card="/refunds"]')).toBeVisible()
 await expect(page.locator('[data-admin-frame]')).toHaveCount(0)
})
