import {test,expect,STORE,ADMIN,productId} from './fixture'
test('customer saves contacts and several addresses without changing historic order contacts',async({page,harness})=>{
 const original=structuredClone(harness.db.orders[0]);await page.goto(STORE+'/profile');await page.getByRole('button',{name:/Личные данные/}).click()
 await page.getByLabel('Имя',{exact:true}).fill('Новый покупатель');await page.getByLabel('Телефон',{exact:true}).fill('+998901111111')
 await page.getByRole('button',{name:'Добавить адрес'}).click();await page.getByLabel('Название адреса').fill('Дом');await page.getByLabel('Полный адрес').fill('Навои дом 10 квартира 5');await page.getByRole('button',{name:'Применить адрес'}).click();await page.getByRole('button',{name:'Сохранить изменения'}).click()
 await expect.poll(()=>harness.db.preferences?.[0]?.addresses.length).toBe(1);expect(harness.db.preferences[0].name).toBe('Новый покупатель');expect(harness.db.orders[0]).toEqual(original)
 await page.reload();await expect(page.getByLabel('Имя',{exact:true})).toHaveValue('Новый покупатель');await expect(page.getByText('Навои дом 10 квартира 5',{exact:true})).toBeVisible()
})
test('my sizes filter checks subcategory/system and real variant availability',async({page,harness})=>{
 harness.db.preferences=[{name:'',phone:'',delivery_method:'pickup',addresses:[],sizes:[{category:'shoes',subcategory:'sneakers',system:'numeric',size:'42'}],version:1}]
 harness.db.products.push({...harness.db.products[0],id:'22222222-2222-4222-8222-222222222222',name_ru:'Без размера 42'})
 harness.db.product_variants.push({id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',product_id:harness.db.products[1].id,size_value:'42',color_id:null,stock:0})
 await page.goto(STORE+'/search');await page.getByRole('button',{name:/Фильтры/}).click();await page.getByRole('button',{name:'Мой размер',exact:true}).click()
 await expect(page.locator(`[data-product-card="${productId}"]`)).toBeVisible();await expect(page.locator('[data-product-card="22222222-2222-4222-8222-222222222222"]')).toHaveCount(0)
})
test('product size chart prefers explicit product chart and closes in existing surface',async({page,harness})=>{
 harness.db.size_charts=[{id:'a',title_ru:'Общая таблица',title_uz:'Umumiy jadval',category_id:'shoes',subcategory_id:null,brand_id:null,product_id:null,columns_ru:['Размер','Стопа, см'],columns_uz:['O‘lcham','Oyoq, sm'],rows:[['42','27']],is_active:true},{id:'b',title_ru:'Таблица этого товара',title_uz:'Mahsulot jadvali',category_id:'shoes',subcategory_id:'sneakers',brand_id:null,product_id:productId,columns_ru:['Размер','Стопа, см'],columns_uz:['O‘lcham','Oyoq, sm'],rows:[['42','27,5']],is_active:true}]
 await page.goto(STORE+`/product/${productId}`);await page.getByRole('button',{name:'Таблица размеров',exact:true}).click();await expect(page.getByRole('heading',{name:'Таблица этого товара'})).toBeVisible();await expect(page.getByRole('cell',{name:'27,5',exact:true})).toBeVisible();await page.getByRole('button',{name:'Закрыть',exact:true}).click();await expect(page.getByRole('heading',{name:'Таблица этого товара'})).toHaveCount(0)
})
test('admin saves a real size chart with explicit translations and scope',async({page,harness})=>{
 await page.goto(ADMIN+'/size-charts');await page.getByRole('button',{name:'Добавить таблицу',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Таблица размеров'})
 await dialog.getByLabel('Название — русский',{exact:true}).fill('Обувь');await dialog.getByLabel('Название — узбекский',{exact:true}).fill('Poyabzal');await dialog.getByLabel('Категория',{exact:true}).selectOption('shoes');await dialog.getByLabel('Названия колонок — русский',{exact:true}).fill('Размер; Стопа, см');await dialog.getByLabel('Названия колонок — узбекский',{exact:true}).fill('O‘lcham; Oyoq, sm');await dialog.getByLabel('Строки таблицы').fill('42; 27');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await expect.poll(()=>harness.db.size_charts?.length).toBe(1);expect(harness.db.size_charts[0].rows).toEqual([['42','27']])
})
