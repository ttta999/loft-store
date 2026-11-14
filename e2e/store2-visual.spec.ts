import {test,expect,ADMIN,STORE} from './fixture'
for(const dark of [false,true])test(`Store 2.0 new screens fit viewport, themed consistently (${dark?'dark':'light'})`,async({page,harness},info)=>{
 await page.addInitScript(d=>{localStorage.setItem('loft-theme',d?'dark':'light');const saved=JSON.parse(localStorage.getItem('loft-store')||'{"state":{}}');saved.state={...saved.state,theme:d?'dark':'light'};localStorage.setItem('loft-store',JSON.stringify(saved))},dark)
 harness.db.preferences=[{name:'Покупатель',phone:'+998901234567',addresses:[],sizes:[],version:1}]
 for(const [name,path] of [['personal',STORE+'/profile?section=personal'],['sizes',STORE+'/profile?section=sizes'],['consent',STORE+'/profile?section=settings'],['campaigns',ADMIN+'/campaigns'],['size-charts',ADMIN+'/size-charts']] as const){
  await page.goto(path);await expect(page.locator('[data-loft-content]').first()).toBeVisible();if(dark)await page.evaluate(()=>document.documentElement.classList.add('dark'))
  if(name==='campaigns')await page.getByRole('button',{name:'Новая рассылка'}).click()
  if(name==='size-charts')await page.getByRole('button',{name:'Добавить таблицу'}).click()
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(dark)await expect(page.getByRole('heading',{level:1}).first()).toHaveCSS('color','rgb(255, 255, 255)')
  await page.screenshot({path:info.outputPath(`${name}-${dark?'dark':'light'}.png`),fullPage:true})
 }
 expect(harness.errors).toEqual([])
})
