import {test,expect,ADMIN} from './fixture'
for(const latency of [0,250]) test(`измерение переходов каталога, задержка API ${latency}ms`,async({page,harness},info)=>{
 test.skip(info.project.name!=='desktop','Измерения на одном фиксированном desktop-профиле')
 if(latency)await page.route('**/rest/v1/**',async route=>{await new Promise(resolve=>setTimeout(resolve,latency));await route.fallback()})
 await page.goto(ADMIN+'/catalog');await page.waitForLoadState('networkidle')
 const metrics=[]
 for(const [path,title] of [['/products','Товары'],['/categories','Категории'],['/brands','Бренды'],['/size-charts','Таблицы размеров']]){
  for(const run of ['cold','repeat']){
   const before=harness.calls.length,start=Date.now()
   await page.locator(`[data-admin-card="${path}"]`).click()
   await expect(page.locator('h1').filter({hasText:title}).first()).toBeVisible()
   await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
   metrics.push({path,run,latency,ms:Date.now()-start,requests:harness.calls.length-before})
   // Return through the live menu without destroying the SPA's module/data cache.
   await page.getByRole('button',{name:/На главную|Каталог|Категории/,exact:true}).first().click()
   if(new URL(page.url()).pathname==='/categories')await page.getByRole('button',{name:'На главную',exact:true}).click()
   if(new URL(page.url()).pathname!=='/catalog')await page.locator('[data-admin-card="/catalog"]').click()
   await expect(page.locator('[data-admin-card="/products"]')).toBeVisible()
  }
 }
 console.log('NAVIGATION_METRICS',JSON.stringify(metrics))
 await info.attach('navigation-metrics.json',{body:JSON.stringify(metrics,null,2),contentType:'application/json'})
})
