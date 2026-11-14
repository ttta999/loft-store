import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {test,expect,ADMIN} from './fixture'
import {writeFile} from 'node:fs/promises'
test('controlled 100ms auth latency: first and repeated navigation measurements',async({page,harness})=>{
 await page.route(/\/(auth\/v1\/user|rest\/v1\/rpc\/store_is_admin)(\?|$)/,async route=>{await new Promise(r=>setTimeout(r,100));await route.fallback()})
 await page.goto(ADMIN);await expect(page.locator('[data-admin-card="/orders"]')).toBeVisible()
 const samples:any[]=[],requests:string[]=[];page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/auth/')||u.pathname.startsWith('/rest/'))requests.push(u.pathname)})
 for(const path of ['/orders','/china','/refunds'])for(const phase of ['first','repeat']){
  if(new URL(page.url()).pathname!=='/'){await page.getByRole('button',{name:'На главную',exact:true}).click();await expect(page.locator(`[data-admin-card="${path}"]`)).toBeVisible()}
  const count=requests.length;await page.locator(`[data-admin-card="${path}"]`).evaluate(el=>el.addEventListener('pointerdown',()=>{(window as any).navTap=performance.now()},{once:true}));await page.locator(`[data-admin-card="${path}"]`).click();const start=await page.evaluate(()=>(window as any).navTap);await expect(page).toHaveURL(ADMIN+path);await expect(page.locator('.sticky').getByRole('heading',{name:path==='/orders'?'Заказы':path==='/china'?'Спецзаказы':'Возвраты',exact:true}).first()).toBeVisible()
  const shown=await page.evaluate(()=>performance.now());samples.push({path,phase,firstContentMs:Math.round(shown-start),requests:requests.slice(count)})
 }
 console.log('NAV_PERF',JSON.stringify(samples));await writeFile(join(tmpdir(),'loft-admin-perf-'+(process.env.LOFT_PERF_LABEL||'after')+'.json'),JSON.stringify(samples,null,2))
})
