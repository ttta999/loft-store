import {test,expect,STORE,ADMIN,productId} from './fixture'
const chart=(extra:any={})=>({id:'chart',title_ru:'Размеры производителя',title_uz:'Ishlab chiqaruvchi o‘lchamlari',category_id:'shoes',subcategory_id:'sneakers',product_id:null,brand_id:null,columns_ru:['Размер','Стопа'],columns_uz:['O‘lcham','Oyoq'],rows:[['42','27']],is_active:true,...extra})
test('profile cards share headers and restock has verified empty state and retry',async({page})=>{
 await page.goto(STORE+'/profile?section=restocks')
 await expect(page.getByRole('heading',{name:'Уведомления о поступлении',exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Пока нет уведомлений о поступлении',exact:true})).toBeVisible()
 await expect(page.locator('[data-profile-icon] svg')).toHaveClass(/bell/)
 await page.goto(STORE+'/profile?section=sizes');await expect(page).toHaveURL(STORE+'/profile');await expect(page.getByRole('button',{name:/Мои размеры/})).toHaveCount(0)
 await page.goto(STORE+'/profile?section=personal');await expect(page.getByText('Ваши контакты и адреса доставки',{exact:true})).toBeVisible()
 await page.goto(STORE+'/china');await expect(page.getByText('Привезём товар по вашему описанию или ссылке')).toHaveCount(0);await expect(page.locator('[data-profile-icon] svg')).toHaveClass(/globe/)
})
for(const state of ['none','empty','hidden'])test(`size chart action absent for ${state}`,async({page,harness})=>{
 harness.db.size_charts=state==='none'?[]:[chart(state==='empty'?{rows:[]}:{is_active:false})]
 await page.goto(STORE+'/product/'+productId)
 await expect.poll(()=>harness.calls.filter(c=>c.path==='/rest/v1/size_charts').length).toBe(1)
 await expect(page.getByRole('button',{name:'Таблица размеров',exact:true})).toHaveCount(0)
 await expect(page.getByText(/Для этого товара таблица не добавлена/)).toHaveCount(0)
})
test('chart cache revalidates missing and changed charts; errors are retriable, not absence',async({page,harness})=>{
 harness.db.size_charts=[]
 await page.goto(STORE+'/product/'+productId)
 await expect.poll(()=>harness.calls.filter(c=>c.path==='/rest/v1/size_charts').length).toBe(1)
 harness.db.size_charts=[chart()]
 await page.evaluate(()=>{const now=Date.now;Date.now=()=>now()+31000;window.dispatchEvent(new Event('focus'))})
 const action=page.getByRole('button',{name:'Таблица размеров',exact:true});await expect(action).toBeVisible()
 await action.click();await expect(page.getByRole('cell',{name:'27',exact:true})).toBeVisible();await page.getByRole('button',{name:'Закрыть',exact:true}).click()
 const requests=harness.calls.filter(c=>c.path==='/rest/v1/size_charts').length
 await action.click();await expect(page.getByRole('cell',{name:'27',exact:true})).toBeVisible();expect(harness.calls.filter(c=>c.path==='/rest/v1/size_charts').length).toBe(requests)
})
test('network failure is distinct from missing; retry recovers a real chart',async({page,harness})=>{
 harness.db.size_charts=[chart()];let broken=true
 await page.route('**/rest/v1/size_charts*',route=>broken?route.abort():route.fallback())
 await page.goto(STORE+'/product/'+productId)
 await expect(page.getByRole('button',{name:/Не удалось проверить таблицу размеров/})).toBeVisible({timeout:10000});await expect(page.getByRole('button',{name:'Таблица размеров',exact:true})).toHaveCount(0)
 broken=false;await page.getByRole('button',{name:/Не удалось проверить таблицу размеров/}).click();await expect(page.getByRole('button',{name:'Таблица размеров',exact:true})).toBeVisible()
})
test('saved alpha size becomes hint only through explicit mapping, no automatic variant selection',async({page,harness})=>{
 harness.db.preferences=[{name:'',phone:'',delivery_method:'pickup',addresses:[],sizes:[{category:'shoes',subcategory:'sneakers',system:'alphabetical',size:'M'}],version:1}]
 harness.db.size_charts=[chart({columns_ru:['Буква','Число'],columns_uz:['Harf','Raqam'],rows:[['M','42']],size_mapping:{source_system:'alphabetical',target_system:'numeric',source_column:0,target_column:1}})]
 await page.goto(STORE+'/product/'+productId);await expect(page.getByRole('button',{name:'Таблица размеров',exact:true})).toBeVisible()
 await page.getByRole('button',{name:/Размер.*Выберите/}).click();await expect(page.getByText('Ваш размер',{exact:true})).toBeVisible();await expect(page.getByText('Выбран',{exact:true})).toHaveCount(0)
})
for(const [path,label] of [['brands','Добавить бренд'],['categories','Добавить категорию'],['products','Добавить товар']])test(`admin add action ${path} remains fully visible and opens correct form`,async({page})=>{
 await page.goto(ADMIN+'/'+path)
 const button=page.getByRole('button',{name:label,exact:true});await expect(button).toBeVisible()
 const size=await button.evaluate(b=>({scroll:b.scrollWidth,width:b.clientWidth,right:b.getBoundingClientRect().right,viewport:innerWidth,white:getComputedStyle(b).whiteSpace}))
 expect(size.scroll).toBeLessThanOrEqual(size.width+1);expect(size.right).toBeLessThanOrEqual(size.viewport);expect(size.white).toBe('nowrap')
 await button.click();await expect(page.getByRole('heading',{name:path==='brands'?'Добавить бренд':path==='categories'?'Новая категория':'Новый товар',exact:true})).toBeVisible()
})

test('restock failure has retry and no false empty card',async({page,harness})=>{
 harness.failAction='restocks';await page.goto(STORE+'/profile?section=restocks')
 await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('heading',{name:'Пока нет уведомлений о поступлении'})).toHaveCount(0)
 harness.failAction=null;await page.getByRole('button',{name:'Повторить попытку'}).click();await expect(page.getByRole('heading',{name:'Пока нет уведомлений о поступлении'})).toBeVisible()
})
test('restock pending response never flashes the empty state',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/api/store',async route=>{if(route.request().postDataJSON()?.action==='restocks')await held;await route.fallback()})
 await page.goto(STORE+'/profile?section=restocks');await expect(page.getByRole('status',{name:'Загрузка'})).toBeVisible();await expect(page.getByRole('heading',{name:'Пока нет уведомлений о поступлении'})).toHaveCount(0)
 release();await expect(page.getByRole('heading',{name:'Пока нет уведомлений о поступлении'})).toBeVisible()
})
test('legacy native and mapped preferences survive the removed size page',async({page,harness})=>{
 const sizes=[{category:'shoes',subcategory:'sneakers',system:'numeric',size:'42'},{category:'shoes',subcategory:'sneakers',system:'alphabetical',size:'M'}]
 harness.db.preferences=[{name:'Покупатель',phone:'',delivery_method:'pickup',addresses:[],sizes:structuredClone(sizes),version:0}]
 await page.goto(STORE+'/profile?section=sizes');await expect(page).toHaveURL(STORE+'/profile');expect(harness.db.preferences[0].sizes).toEqual(sizes)
 await page.getByRole('button',{name:/Личные данные/}).click();await page.getByLabel('Имя',{exact:true}).fill('Другой покупатель');await page.getByRole('button',{name:'Сохранить изменения'}).click();await expect.poll(()=>harness.db.preferences[0].name).toBe('Другой покупатель');expect(harness.db.preferences[0].sizes).toEqual(sizes)
})
