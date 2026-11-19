import {test,expect,STORE,productId} from './fixture'
const preferences={name:'Сохранённый покупатель',phone:'+998901234567',delivery_method:'pickup',addresses:[],sizes:[],version:0,language:'ru',language_source:'explicit',onboarding_completed_at:'2026-01-01T00:00:00Z'}
test('personal pages render warm account data during a slow background refresh; consent info does not opt in',async({page,harness})=>{
 harness.db.preferences=[structuredClone(preferences)]
 await page.goto(STORE+'/profile');await page.getByRole('button',{name:/Личные данные/}).click();await expect(page.getByLabel('Имя',{exact:true})).toHaveValue(preferences.name)
 await page.locator('.loft-header button').first().click();await expect(page).toHaveURL(/\/profile$/)
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r})
 await page.route('**/api/store',async route=>{if(route.request().postDataJSON()?.action!=='preferences')return route.fallback();await gate;await route.fulfill({json:{data:preferences}})})
 await page.getByRole('button',{name:/Личные данные/}).click();await expect(page.getByLabel('Имя',{exact:true})).toHaveValue(preferences.name);release()
 await page.goto(STORE+'/profile?section=settings');const before=harness.calls.filter(c=>c.body?.action==='marketingConsent').length
 await page.getByRole('button',{name:'О новости и предложениях',exact:true}).click();await expect(page.getByText(/Получайте новости о новых коллекциях/)).toBeVisible();expect(harness.calls.filter(c=>c.body?.action==='marketingConsent').length).toBe(before);await expect(page.getByRole('switch',{name:'Новости и предложения'})).not.toBeChecked()
})
test('first launch requires a saved language, preserves the product link, completes once without a replay setting',async({page,harness})=>{
 harness.db.preferences=[{...preferences,language:'ru',language_source:null,onboarding_completed_at:null}]
 await page.goto(STORE+'/product/'+productId+'?variant=keep-me')
 const dialog=page.locator('[data-onboarding]');await expect(dialog.getByText('Выберите язык / Tilni tanlang')).toBeVisible();await page.screenshot({path:test.info().outputPath('intro.png')});await expect(dialog.getByText('Пропустить',{exact:true})).toHaveCount(0)
 await dialog.getByRole('button',{name:'O‘zbekcha',exact:true}).click();await expect(dialog.getByText('LOFT Store’ga xush kelibsiz')).toBeVisible();await dialog.getByRole('button',{name:'O‘tkazib yuborish'}).click();await expect(dialog).toHaveCount(0);await expect(page).toHaveURL(new RegExp('/product/'+productId+'\\?variant=keep-me'))
 expect(harness.db.preferences[0].language).toBe('uz');expect(harness.db.preferences[0].onboarding_completed_at).toBeTruthy()
 await page.reload();await expect(page.locator('[data-product-hero]')).toBeVisible();await expect(dialog).toHaveCount(0)
 await page.goto(STORE+'/profile?section=settings');await expect(page.getByRole('button',{name:'Ilovadan qanday foydalanish kerak'})).toHaveCount(0)
})
test('legal route returns to settings with the same scroll; floating special action stays above nav and hides for keyboard',async({page})=>{
 await page.goto(STORE+'/profile?section=settings');await page.getByRole('button',{name:/Политика конфиденциальности/}).click();await expect(page).toHaveURL(/\/privacy/);await page.locator('.loft-header button').first().click();await expect(page).toHaveURL(/section=settings/)
 await page.goto(STORE+'/china');const action=page.getByRole('button',{name:'Отправить заявку',exact:true});await expect(action).toBeVisible();await page.screenshot({path:test.info().outputPath('special-floating.png')})
 const geometry=await page.evaluate(()=>({button:document.querySelector('[data-route-floating]')!.getBoundingClientRect().bottom,nav:document.querySelector('.loft-navigation')!.getBoundingClientRect().top}));expect(geometry.button).toBeLessThanOrEqual(geometry.nav)
 const input=page.locator('input[type=text]').first();await input.focus();if(test.info().project.name!=='desktop')await expect(action).toBeHidden();await input.blur();await expect(action).toBeVisible()
})
test('failed language choice stays selected and retry saves it; completed tutorial is not reopened by background failure',async({page,harness})=>{
 harness.db.preferences=[{...preferences,language_source:null,onboarding_completed_at:null}]
 let failures=1
 await page.route('**/api/store',async route=>{if(route.request().postDataJSON()?.action==='language'&&failures-- >0)return route.fulfill({status:503,json:{error:'offline'}});return route.fallback()})
 await page.goto(STORE+'/profile');const dialog=page.locator('[data-onboarding]');await dialog.getByRole('button',{name:'O‘zbekcha',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByText('Выберите язык / Tilni tanlang')).toBeVisible()
 await dialog.getByRole('button',{name:'O‘zbekcha',exact:true}).click();await expect(dialog.getByText('LOFT Store’ga xush kelibsiz')).toBeVisible();await dialog.getByRole('button',{name:'O‘tkazib yuborish'}).click();await expect(dialog).toHaveCount(0)
 await page.route('**/api/store',async route=>route.request().postDataJSON()?.action==='preferences'?route.fulfill({status:503,json:{error:'offline'}}):route.fallback())
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(dialog).toHaveCount(0)
})
test('restock section reuses the verified cache and update after a successful cancellation',async({page,harness})=>{
 harness.db.preferences=[{...preferences,sizes:[{category:'shoes',subcategory:'sneakers',system:'numeric',size:'42'}]}]
 harness.db.restocks=[{id:'sub-fixture',variant_id:harness.db.product_variants[0].id,product_id:productId,size:'42',name_ru:'Тестовые кроссовки'}]
 await page.goto(STORE+'/profile');await expect(page.getByRole('button',{name:/Мои размеры/})).toHaveCount(0)
 await page.getByRole('button',{name:/Уведомления о поступлении/}).click();await expect(page.getByText('Тестовые кроссовки',{exact:true})).toBeVisible();await page.getByRole('button',{name:/Отменить/}).click();await expect.poll(()=>harness.db.restocks.length).toBe(0)
 await page.locator('.loft-header button').first().click();await page.getByRole('button',{name:/Уведомления о поступлении/}).click();await expect(page.getByText('Тестовые кроссовки',{exact:true})).toHaveCount(0)
})
test('a late background response cannot undo newly saved contacts',async({page,harness})=>{
 harness.db.preferences=[structuredClone(preferences)]
 await page.goto(STORE+'/profile?section=personal');const name=page.getByLabel('Имя',{exact:true});await expect(name).toHaveValue(preferences.name)
 let release!:()=>void,started=false;const gate=new Promise<void>(r=>{release=r}),old=structuredClone(preferences)
 await page.route('**/api/store',async route=>{if(route.request().postDataJSON()?.action!=='preferences')return route.fallback();started=true;await gate;await route.fulfill({json:{data:old}})})
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>started).toBe(true)
 await name.fill('Обновлённый покупатель');await page.getByRole('button',{name:'Сохранить изменения'}).click();await expect.poll(()=>harness.db.preferences[0].name).toBe('Обновлённый покупатель')
 const response=page.waitForResponse(r=>r.url().endsWith('/api/store')&&r.request().postDataJSON()?.action==='preferences');release();await (await response).finished()
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await expect(name).toHaveValue('Обновлённый покупатель')
})
test('approximate size is advisory in dark reduced-motion mode and never selects a purchase size',async({page,harness})=>{
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'})
 harness.db.categories=[{id:'clothes',name_ru:'Одежда',name_uz:'Kiyim',is_active:true}]
 harness.db.subcategories=[{id:'trousers',category_id:'clothes',name_ru:'Брюки',name_uz:'Shimlar',sizes:['46','48','50'],size_type:'numeric',is_active:true}]
 Object.assign(harness.db.products[0],{category:'clothes',subcategory:'trousers',name_ru:'Брюки',size_type:'numeric'});harness.db.product_variants[0].size_value='48'
 harness.db.preferences=[{...preferences,sizes:[{category:'clothes',subcategory:'trousers',system:'alphabetical',size:'M'}]}]
 await page.goto(STORE+'/product/'+productId);await expect(page.locator('html')).toHaveClass(/dark/);const trigger=page.locator('[data-dialog-trigger="size"]');await expect(trigger).toContainText('Выберите размер');await trigger.click()
 await expect(page.locator('[data-size-hint]')).toContainText('≈');await expect(page.locator('[data-size-hint-explanation]')).toBeVisible();await page.screenshot({path:test.info().outputPath('approximate-dark.png')})
 await page.getByRole('button',{name:'Закрыть',exact:true}).click();await expect(trigger).toContainText('Выберите размер')
})
