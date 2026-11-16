import {test,expect,ADMIN,STORE} from './fixture'
for(const theme of ['light','dark'] as const)for(const language of ['ru','uz'] as const)test(`новые экраны: ${theme}, ${language}`,async({page,harness},info)=>{
 test.setTimeout(60000)
 await page.emulateMedia({colorScheme:theme})
 await page.goto(ADMIN+'/settings?section=theme')
 if(language==='uz')await page.getByRole('button',{name:'O‘zbekcha',exact:true}).click()
 for(const path of ['/catalog','/size-charts','/settings','/settings?section=payments','/settings?section=sale','/settings?section=theme','/settings?section=reminders','/campaigns']){
  await page.goto(ADMIN+path);await expect(page.locator('[data-admin-heading] h1:visible')).toBeVisible()
  await expect.poll(()=>page.locator('[aria-busy="true"]:visible').count()).toBe(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const fonts=await page.evaluate(()=>{const body=getComputedStyle(document.body).fontFamily;return Array.from(document.querySelectorAll('h1,button,input,select,textarea')).filter(el=>(el as HTMLElement).offsetHeight>0).every(el=>getComputedStyle(el).fontFamily===body)})
  expect(fonts).toBe(true)
  if(path==='/settings?section=theme'){
   await expect(page.locator('html')).toHaveClass(theme==='dark'?/dark/:/^(?!.*dark)/)
   await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.adminMotion||'')).toBe('')
   await page.screenshot({path:info.outputPath(`appearance-${theme}-${language}.png`),fullPage:true,animations:'disabled'})
  }
 }
 await page.goto(ADMIN+'/size-charts');await page.getByRole('button',{name:language==='ru'?'Добавить таблицу':'Jadval qo‘shish',exact:true}).click()
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:language==='ru'?'Сохранить':'Saqlash',exact:true})).toBeInViewport()
 await expect.poll(()=>page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&Number.isFinite(Number(a.effect?.getComputedTiming().iterations))).length)).toBe(0)
 await page.screenshot({path:info.outputPath(`editor-${theme}-${language}.png`)})
 expect(harness.errors).toEqual([])
})
test('личные данные используют кеш при возврате и сразу показывают успешное сохранение',async({page,harness})=>{
 harness.db.preferences=[{name:'Имя клиента',phone:'+998901234567',delivery_method:'pickup',addresses:[],sizes:[],version:1}]
 await page.goto(STORE+'/profile');await page.locator('[data-profile-link="personal"]').click()
 const name=page.getByRole('textbox',{name:'Имя',exact:true});await expect(name).toHaveValue('Имя клиента');await name.fill('Новое имя')
 await page.getByRole('button',{name:'Сохранить изменения',exact:true}).click();await expect.poll(()=>harness.db.preferences[0].name).toBe('Новое имя')
 await page.locator('.loft-header button').first().click();await expect(page.locator('[data-profile-link="personal"]')).toBeVisible()
 const before=harness.calls.filter(c=>c.body?.action==='preferences').length
 await page.locator('[data-profile-link="personal"]').click();await expect(name).toHaveValue('Новое имя');await expect(page.getByRole('status').filter({hasText:'Загрузка...'})).toHaveCount(0)
 expect(harness.calls.filter(c=>c.body?.action==='preferences')).toHaveLength(before)
})
test('просроченный кеш заказов виден сразу во время фонового запроса; фокус не сбрасывает неизменившиеся данные',async({page,harness})=>{
 await page.goto(ADMIN);await page.waitForLoadState('networkidle');await page.locator('[data-admin-card="/orders"]').click()
 await expect(page.getByRole('button',{name:/Заказ №1001/})).toBeVisible();await page.waitForLoadState('networkidle')
 const reads=()=>harness.calls.filter(c=>c.path==='/rest/v1/orders').length
 const baseline=reads();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForLoadState('networkidle');expect(reads()).toBe(baseline)
 await page.locator('[data-admin-back]:visible').click();await expect(page.locator('[data-admin-card="/orders"]')).toBeVisible()
 await page.route('**/rest/v1/orders?*',async route=>{await new Promise(resolve=>setTimeout(resolve,1000));await route.fallback()})
 await page.clock.setFixedTime(new Date(Date.now()+20_000))
 await page.locator('[data-admin-card="/orders"]').click();await expect(page.getByRole('button',{name:/Заказ №1001/})).toBeVisible();await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0)
})
