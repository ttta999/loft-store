import {test,expect,STORE,ADMIN,productId} from './fixture'
const prefs={name:'Покупатель',phone:'',delivery_method:'pickup',addresses:[],sizes:[],version:0,language:'ru',language_source:'explicit',onboarding_completed_at:'2026-01-01T00:00:00Z'}
test('language is visible before profile and catalogue responses; intro has a fixed centered brand and directional locked slides',async({page,harness})=>{
 harness.db.preferences=[{...prefs,language_source:null,onboarding_completed_at:null}]
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r})
 await page.route('**/api/store',async route=>{if(route.request().postDataJSON()?.action==='preferences')await gate;await route.fallback()})
 await page.route('**/rest/v1/products*',async route=>{await gate;await route.fallback()})
 await page.goto(STORE);const intro=page.locator('[data-onboarding]');await expect(intro.getByRole('heading',{name:'Выберите язык / Tilni tanlang'})).toBeVisible();await expect(intro.getByRole('status')).toHaveCount(0)
 await expect(intro.getByRole('button',{name:'Пропустить',exact:true})).toHaveCount(0)
 const brand=await page.locator('[data-intro-brand]').boundingBox();expect(Math.abs(brand!.x+brand!.width/2-page.viewportSize()!.width/2)).toBeLessThan(1)
 release();await intro.getByRole('button',{name:'Русский',exact:true}).click();await expect(page.locator('[data-intro-screen="0"]')).toBeVisible()
 const before=await page.locator('[data-intro-brand]').boundingBox(),stage=await page.locator('[data-intro-stage]').boundingBox()
 await intro.getByRole('button',{name:'Далее',exact:true}).click();await expect(intro.getByRole('button',{name:'Далее',exact:true})).toBeDisabled();await expect(intro.getByRole('button',{name:'Далее',exact:true})).toBeEnabled();await expect(page.locator('[data-intro-screen="1"]')).toBeVisible()
 const after=await page.locator('[data-intro-brand]').boundingBox();expect(after!.y).toBeCloseTo(before!.y,0);expect((await page.locator('[data-intro-stage]').boundingBox())!.height).toBe(stage!.height)
 await intro.getByRole('button',{name:'Назад',exact:true}).click();await expect(intro.getByRole('button',{name:'Далее',exact:true})).toBeEnabled();await expect(page.locator('[data-intro-screen="0"]')).toBeVisible()
 await intro.getByRole('button',{name:'Далее',exact:true}).click();await expect(intro.getByRole('button',{name:'Далее',exact:true})).toBeEnabled();await intro.getByRole('button',{name:'Далее',exact:true}).click();await expect(intro.getByRole('button',{name:'Начать покупки'})).toBeEnabled();await expect(intro.getByRole('button',{name:'Пропустить',exact:true})).toHaveCount(0)
 await page.screenshot({path:test.info().outputPath('intro-final.png')});await intro.getByRole('button',{name:'Начать покупки'}).click();await expect(intro).toHaveCount(0)
 await page.reload();await expect(intro).toHaveCount(0)
})
test('removed profile links redirect safely and never modify stored size preferences',async({page,harness})=>{
 const sizes=[{category:'clothes',subcategory:'pants',system:'alphabetical',size:'M'}];harness.db.preferences=[{...prefs,sizes:structuredClone(sizes)}]
 await page.goto(STORE+'/profile?section=sizes');await expect(page).toHaveURL(STORE+'/profile');await expect(page.getByRole('button',{name:/Мои размеры/})).toHaveCount(0)
 await page.getByRole('button',{name:/Настройки/}).click();await expect(page.getByRole('button',{name:/Как пользоваться приложением/})).toHaveCount(0);expect(harness.db.preferences[0].sizes).toEqual(sizes)
})
for(const [entry,path] of [['home','/'],['brand','/brands?brand=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],['category','/catalog?category=shoes&subcategory=sneakers'],['search','/search?q=Тестовые']] as const)test(`rapid size/Back ${entry} survives viewport changes, restores the card and can reopen`,async({page})=>{
 if (test.info().project.name === 'desktop') await page.setViewportSize({ width: 1440, height: 1900 })
 if(entry==='category'){await page.goto(STORE);await page.getByText('Обувь',{exact:true}).click();await page.getByRole('button',{name:/Кроссовки/}).click()}else await page.goto(STORE+path)
 if(entry==='category'){await expect(page).toHaveURL(/\/catalog/);await expect(page.locator('[data-surface^="catalog:"]')).toBeVisible()}
 await expect(page.locator('html')).not.toHaveAttribute('data-loft-tab-motion','true')
 await expect(page.locator('[data-onboarding]')).toHaveCount(0);const card=page.locator(`[data-product-card="${productId}"]`).first();await card.scrollIntoViewIfNeeded();const origin=await card.locator('img').boundingBox(),scroll=await page.evaluate(()=>scrollY)
 await card.locator('img').click();await expect(page.locator('[data-product-hero]')).toBeVisible();await expect(page.locator('html')).not.toHaveAttribute('data-loft-motion','product')
 await page.locator('[data-dialog-trigger="size"]').click();await page.getByRole('dialog',{name:'Выберите размер'}).getByRole('button',{name:'42',exact:true}).click()
 // Do not wait for the sheet's exit: this is the real competing-action window.
 await page.evaluate(()=>{(window as Window & {returnStart:number;telegramBack:()=>void;lastProductReturn:{finished:Promise<void>}}).returnStart=performance.now();(window as Window & {returnStart:number;telegramBack:()=>void;lastProductReturn:{finished:Promise<void>}}).telegramBack()})
 await expect(page.locator('[data-product-return-overlay]')).toBeVisible();const size=page.viewportSize()!;await page.setViewportSize({width:size.width,height:size.height+24});await page.evaluate(()=> (window as Window & {returnStart:number;telegramBack:()=>void;lastProductReturn:{finished:Promise<void>}}).lastProductReturn.finished)
 await expect(page.locator('[data-product-return-overlay]')).toHaveCount(0);await expect(card.locator('img')).toBeVisible();expect(Math.abs((await card.locator('img').boundingBox())!.y-origin!.y)).toBeLessThan(2);expect(await page.evaluate(()=>scrollY)).toBe(scroll)
 expect(await page.evaluate(()=>performance.now()-(window as Window & {returnStart:number;telegramBack:()=>void;lastProductReturn:{finished:Promise<void>}}).returnStart)).toBeGreaterThan(240)
 await card.locator('img').click();await expect(page.locator('[data-product-hero]')).toBeVisible();await page.evaluate(()=> (window as Window & {returnStart:number;telegramBack:()=>void;lastProductReturn:{finished:Promise<void>}}).telegramBack());await expect(card).toBeVisible();await expect(page.locator('body')).not.toHaveCSS('overflow','hidden')
})
test('cart and special-request actions share geometry and stay above navigation',async({page,harness})=>{
 await page.goto(STORE+'/product/'+productId);await page.locator('[data-dialog-trigger="size"]').click();await page.getByRole('button',{name:'42',exact:true}).click();await page.getByRole('button',{name:'В корзину',exact:true}).click();await expect(page.getByRole('button',{name:'Добавлено',exact:true})).toBeVisible();await page.goto(STORE+'/cart');const cart=page.getByRole('button',{name:'Оформить заказ',exact:true});await expect(cart).toBeVisible();const style=await cart.evaluate(el=>({height:el.getBoundingClientRect().height,radius:getComputedStyle(el).borderRadius}))
 await page.goto(STORE+'/china');const action=page.getByRole('button',{name:'Отправить заявку',exact:true});await expect(action).toBeVisible();expect(await action.evaluate(el=>({height:el.getBoundingClientRect().height,radius:getComputedStyle(el).borderRadius}))).toEqual(style)
 const geometry=await action.evaluate(el=>({bottom:el.getBoundingClientRect().bottom,nav:document.querySelector('.loft-navigation')!.getBoundingClientRect().top}));expect(geometry.bottom).toBeLessThan(geometry.nav)
 await page.locator('textarea').fill('Комментарий');if(test.info().project.name!=='desktop')await expect(action).toBeHidden();await page.locator('textarea').blur();await expect(action).toBeVisible();expect(harness.db.china_requests.length).toBe(1)
 await page.screenshot({path:test.info().outputPath('special-action.png')})
})
test('pants show only created variants, with subscription for existing zero stock',async({page,harness})=>{
 Object.assign(harness.db.products[0],{category:'clothes',subcategory:'pants',size_type:'combined'});harness.db.product_variants[0].size_value='M'
 harness.db.product_variants.push({...harness.db.product_variants[0],id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',size_value:'48',stock:0})
 await page.goto(STORE+'/product/'+productId);await page.locator('[data-dialog-trigger="size"]').click();const dialog=page.getByRole('dialog',{name:'Выберите размер'})
 for(const size of ['36','38','40','42','44','46','50','52','54','56'])await expect(dialog.getByRole('button',{name:new RegExp('^'+size+'(?: |$)')})).toHaveCount(0)
 await expect(dialog.getByRole('button',{name:'M',exact:true})).toBeEnabled();expect(harness.db.product_variants[0].size_value).toBe('M')
 await dialog.getByRole('button',{name:/^48 Нет в наличии/}).click()
 await page.getByRole('button',{name:'Уведомить о поступлении',exact:true}).click()
 await expect(page.getByRole('button',{name:'Вы подписаны',exact:true})).toBeVisible()
})
for(const legacy of [false,true])test(`admin pants grid supports ${legacy?'legacy stock editing':'new products'} without converting variants`,async({page,harness})=>{
 harness.db.categories.push({id:'clothes',name_ru:'Одежда',name_uz:'Kiyim',is_active:true,sort_order:2})
 harness.db.subcategories.push({id:'pants',category_id:'clothes',name_ru:'Брюки',name_uz:'Shimlar',size_type:'combined',sizes:['M','48'],is_active:true,sort_order:1})
 if(legacy){Object.assign(harness.db.products[0],{category:'clothes',subcategory:'pants',size_type:'combined'});harness.db.product_variants[0].size_value='M'}
 const original=structuredClone(harness.db.product_variants[0])
 await page.goto(ADMIN+'/products')
 if(legacy)await page.getByRole('button',{name:'Редактировать',exact:true}).click()
 else{await page.getByRole('button',{name:'Добавить товар',exact:true}).first().click();await page.getByPlaceholder('Например: Loro Piana Summer Walk',{exact:true}).fill('Новые брюки');const selects=page.locator('.loft-modal select');await selects.nth(0).selectOption('clothes');await selects.nth(1).selectOption('pants');await page.getByPlaceholder('95',{exact:true}).fill('100')}
 const modal=page.locator('.loft-modal').last();const size36=modal.getByRole('button',{name:'36',exact:true});await size36.scrollIntoViewIfNeeded();await expect(size36).toBeVisible()
 const numeric=await modal.locator('button').allTextContents();for(const size of ['36','38','40','42','44','46','48','50','52','54','56'])expect(numeric.map(v=>v.trim())).toContain(size)
 if(legacy){await expect(modal.getByRole('button',{name:/^M/})).toBeVisible();await page.getByRole('button',{name:'Сохранить изменения',exact:true}).click();await expect(modal).toHaveCount(0);expect(harness.db.product_variants.find(v=>v.id===original.id)?.size_value).toBe('M');expect(harness.db.product_variants.find(v=>v.id===original.id)?.stock).toBe(original.stock)}
 else{await expect(modal.getByRole('button',{name:'M',exact:true})).toHaveCount(0);await size36.click();await modal.getByRole('button',{name:'Добавить товар',exact:true}).click();await expect.poll(()=>harness.db.products.length).toBe(2);const created=harness.db.products.find(p=>p.name_ru==='Новые брюки')!;expect(created.size_type).toBe('numeric');expect(harness.db.product_variants.filter(v=>v.product_id===created.id).map(v=>v.size_value)).toEqual(['36'])}
})
test('subcategory settings save the eleven numeric defaults without touching stock',async({page,harness})=>{
 harness.db.categories.push({id:'clothes',name_ru:'Одежда',name_uz:'Kiyim',is_active:true,sort_order:2})
 harness.db.subcategories.push({id:'pants',category_id:'clothes',name_ru:'Брюки',name_uz:'Shimlar',size_type:'combined',sizes:['M','48'],is_active:true,sort_order:1})
 const before=structuredClone(harness.db.product_variants)
 await page.goto(ADMIN+'/categories');const row=page.locator('div').filter({has:page.getByText('Брюки',{exact:true})}).filter({has:page.getByTitle('Редактировать',{exact:true})}).last()
 await row.getByTitle('Редактировать',{exact:true}).click();const modal=page.locator('.loft-modal');await expect(modal.getByRole('combobox').last()).toBeDisabled();await modal.getByRole('button',{name:'Сохранить',exact:true}).click()
 await expect.poll(()=>harness.db.subcategories.find(s=>s.id==='pants')?.sizes.length).toBe(11);expect(harness.db.subcategories.find(s=>s.id==='pants')?.size_type).toBe('numeric');expect(harness.db.product_variants).toEqual(before)
})
test('dark UZ intro respects reduced motion and does not offer replay after completion',async({page,harness})=>{
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});harness.db.preferences=[{...prefs,language_source:null,onboarding_completed_at:null}]
 await page.goto(STORE);const intro=page.locator('[data-onboarding]');await intro.getByRole('button',{name:'O‘zbekcha',exact:true}).click();await expect(intro.getByRole('heading',{name:'LOFT Store’ga xush kelibsiz'})).toBeVisible();await expect(page.locator('html')).toHaveClass(/dark/)
 await intro.getByRole('button',{name:'Davom etish',exact:true}).click();await intro.getByRole('button',{name:'Davom etish',exact:true}).click();await expect(intro.getByRole('button',{name:'O‘tkazib yuborish',exact:true})).toHaveCount(0);await page.screenshot({path:test.info().outputPath('intro-dark-uz.png')});await intro.getByRole('button',{name:'Xaridni boshlash'}).click();await expect(intro).toHaveCount(0)
})
test('local completion is only a boot hint and a contradictory server account restores mandatory language',async({page,harness})=>{
 harness.db.preferences=[structuredClone(prefs)];await page.goto(STORE);await expect(page.locator('[data-onboarding]')).toHaveCount(0)
 let hold=true,release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/api/store',async route=>{if(hold&&route.request().postDataJSON()?.action==='preferences')await gate;await route.fallback()})
 await page.reload();await expect(page.locator('[data-onboarding]')).toHaveCount(0);await expect(page.getByRole('heading',{name:/Категории/})).toBeVisible();hold=false;release()
 harness.db.preferences=[{...prefs,language_source:null,onboarding_completed_at:null}];await page.reload();await expect(page.getByRole('heading',{name:'Выберите язык / Tilni tanlang'})).toBeVisible();await expect(page.getByRole('button',{name:'Пропустить',exact:true})).toHaveCount(0)
})

test('two colors keep separate size grids while the last unit sells and stock returns', async ({ page, harness }) => {
 const blue = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
 const red = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
 Object.assign(harness.db.products[0], { category: 'clothes', subcategory: 'jeans', size_type: 'numeric' })
 const image = STORE + '/fixture-product.svg'
 harness.db.product_colors = [
  { id: blue, product_id: productId, name_ru: 'Синий', name_uz: 'Ko‘k', hex_code: '#0000ff', images: [image], sort_order: 0 },
  { id: red, product_id: productId, name_ru: 'Красный', name_uz: 'Qizil', hex_code: '#ff0000', images: [image], sort_order: 1 },
 ]
 const row = harness.db.product_variants[0]
 const grid = ['36','38','40','42','44','46','48','50','52','54','56']
 harness.db.product_variants = [
  ...grid.map((size, index) => ({ ...row, id: 'blue-' + index, color_id: blue, size_value: size, stock: 1 })),
  { ...row, color_id: red, size_value: '50', stock: 1 },
 ]
 await page.clock.install()
 await page.goto(STORE + '/product/' + productId)
 await page.getByRole('button', { name: 'Синий', exact: true }).click()
 const trigger = page.locator('[data-dialog-trigger="size"]')
 const sheet = page.getByRole('dialog', { name: 'Выберите размер' })
 await trigger.click()
 for (const size of grid) await expect(sheet.getByRole('button', { name: size, exact: true })).toBeEnabled()
 await sheet.getByRole('button', { name: '36', exact: true }).click()
 await page.getByRole('button', { name: 'Красный', exact: true }).click()
 await trigger.click()
 await expect(sheet.getByRole('button', { name: '36', exact: true })).toHaveCount(0)
 await expect(sheet.getByRole('button', { name: '50', exact: true })).toBeEnabled()

 const redVariant = harness.db.product_variants.at(-1)!
 redVariant.stock = 0
 await page.clock.fastForward(16_000)
 await expect(sheet.getByRole('button', { name: /^50 Нет в наличии/ })).toBeEnabled()
 redVariant.stock = 2
 await page.clock.fastForward(16_000)
 await expect(sheet.getByRole('button', { name: '50', exact: true })).toBeEnabled()
})
