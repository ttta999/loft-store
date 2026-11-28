import {test,expect,STORE,ADMIN} from './fixture'
for(const theme of ['light','dark'] as const)for(const language of ['ru','uz'] as const)test(`followup surfaces ${theme} ${language}`,async({page,harness},info)=>{
 harness.db.preferences=[{language,language_source:'explicit'}]
 test.setTimeout(60000);await page.emulateMedia({colorScheme:theme})
 await page.addInitScript(({language})=>{localStorage.setItem('loft-store',JSON.stringify({state:{language,theme:'system'},version:0}));localStorage.setItem('loft-admin-language:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',language)}, {language})
 for(const path of ['/china','/profile?section=settings','/profile?section=personal','/profile?section=restocks'] as const){
  await page.goto(STORE+path)
  const title=({
   '/china':['Спецзаказ','Maxsus buyurtma'],
   '/profile?section=settings':['Настройки','Sozlamalar'],
   '/profile?section=personal':['Личные данные','Shaxsiy ma’lumotlar'],
   '/profile?section=restocks':['Уведомления о поступлении','Kelishi haqida xabarlar'],
  } as const)[path]![language==='ru'?0:1]
  const heading=page.getByRole('heading',{name:title,exact:true})
  await expect(heading).toBeVisible()
  await expect(heading.locator('../..').locator('[data-profile-icon]')).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`${path.replace(/[^a-z]/g,'-')}-${theme}-${language}.png`),animations:'disabled'})
 }
 const addLabels=language==='ru'?['Добавить бренд','Добавить категорию','Добавить товар']:['Brend qo‘shish','Toifa qo‘shish','Mahsulot qo‘shish']
 for(const [i,path] of ['/brands','/categories','/products'].entries()){
  await page.goto(ADMIN+path);const add=page.getByRole('button',{name:addLabels[i],exact:true});await expect(add).toBeVisible();await expect(add).toHaveCSS('white-space','nowrap')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(path==='/categories'){const sub=page.getByRole('button',{name:language==='ru'?'Добавить подкатегорию':'Ichki toifa qo‘shish',exact:true});await sub.click();await expect(page.getByRole('heading',{name:language==='ru'?'Новая подкатегория':'Yangi ichki kategoriya',exact:true})).toBeVisible()}
  await page.screenshot({path:info.outputPath(`admin-${i}-${theme}-${language}.png`),animations:'disabled'})
 }
})
