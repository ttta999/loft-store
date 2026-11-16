import {test,expect,STORE,ADMIN,productId} from './fixture'

test('каталог возвращает к источнику, включая перезагрузку и прямую ссылку',async({page,harness})=>{
 await page.goto(ADMIN);await page.locator('[data-admin-card="/catalog"]').click()
 for(const path of ['/products','/categories','/brands','/size-charts']){
  await page.locator(`[data-admin-card="${path}"]`).click();await expect(page.locator('[data-admin-back]:visible')).toHaveAccessibleName('Каталог')
  if(path==='/categories')await expect(page.getByRole('button',{name:'Таблицы размеров',exact:true})).toHaveCount(0)
  if(path==='/brands')await page.reload()
  await page.locator('[data-admin-back]:visible').click();await expect(page).toHaveURL(ADMIN+'/catalog')
 }
 await page.goto(ADMIN+'/size-charts');await page.locator('[data-admin-back]:visible').click();await expect(page).toHaveURL(ADMIN+'/catalog')
 expect(harness.errors).toEqual([])
})
test('подразделы настроек сохраняют общую шапку, ширину и правильный возврат',async({page},info)=>{
 await page.goto(ADMIN+'/settings')
 for(const section of ['payments','prices','sale','theme','reminders']){
  await page.locator(`[data-admin-card="/settings?section=${section}"]`).click();await expect(page.locator('[data-admin-back]:visible')).toHaveAccessibleName('Настройки')
  await expect(page.locator('[data-admin-heading] h1')).toBeVisible()
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(section==='payments'){
   const cards=page.getByRole('region',{name:'Платёжные карты'}),delivery=page.getByRole('heading',{name:'Доставка',exact:true}).locator('../..')
   const a=await cards.boundingBox(),b=await delivery.boundingBox();expect(Math.abs(a!.width-b!.width)).toBeLessThan(3)
  }
  if(section==='theme'){await expect(page.getByText('Сейчас выбрана',{exact:true})).toHaveCount(0);await page.screenshot({path:info.outputPath('appearance.png'),fullPage:true,animations:'disabled'})}
  await page.locator('[data-admin-back]:visible').click();await expect(page).toHaveURL(ADMIN+'/settings')
 }
})
test('таблица под размером; персональная подсказка справа и не выбирает размер',async({page,harness})=>{
 harness.db.preferences=[{name:'',phone:'',delivery_method:'pickup',addresses:[],sizes:[{category:'shoes',subcategory:'sneakers',system:'numeric',size:'42'}],version:1}]
 await page.goto(STORE+'/product/'+productId)
 const size=page.locator('[data-dialog-trigger="size"]'),chart=page.locator('[data-dialog-origin="size-chart"]')
 await expect(chart).toBeVisible();expect((await chart.boundingBox())!.y).toBeGreaterThan((await size.boundingBox())!.y)
 await expect(size).not.toContainText('42')
 await size.click();const hint=page.locator('[data-size-hint]');await expect(hint).toBeVisible()
 const row=hint.locator('..')
 await expect.poll(()=>hint.evaluate(element=>{const a=element.getBoundingClientRect(),b=element.parentElement!.querySelector('span.flex-1 > span')!.getBoundingClientRect();return a.x>b.right&&Math.abs(a.y+a.height/2-b.y-b.height/2)<10})).toBe(true)
 await row.click();await expect(size).toContainText('42');await size.click();await expect(page.locator('[data-size-hint]')).toBeVisible();await expect(page.getByRole('dialog').getByText('Выбран',{exact:true})).toBeVisible()
})
test('визуальный редактор сохраняет старую структуру, два языка и доступные действия',async({page,harness},info)=>{
 harness.db.size_charts=[{id:'99999999-9999-4999-8999-999999999998',title_ru:'Старая таблица',title_uz:'Eski jadval',category_id:'shoes',subcategory_id:'sneakers',brand_id:null,product_id:null,columns_ru:['EU','Длина'],columns_uz:['EU','Uzunlik'],rows:[['42','27']],is_active:true,updated_at:new Date().toISOString()}]
 await page.goto(ADMIN+'/size-charts');await page.getByRole('button',{name:'Редактировать таблицу',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Таблица размеров',exact:true})
 await expect(dialog.getByRole('textbox',{name:'Строка 1, колонка 2',exact:true})).toHaveValue('27')
 await dialog.getByRole('textbox',{name:'Строка 1, колонка 2',exact:true}).fill('27.5')
 await dialog.getByRole('button',{name:'O‘zbekcha',exact:true}).click();await expect(dialog.getByRole('textbox',{name:'Строка 1, колонка 2',exact:true})).toHaveValue('27.5')
 await dialog.getByRole('textbox',{name:'Название — узбекский',exact:true}).fill('Yangilangan jadval')
 await dialog.getByRole('button',{name:'Предпросмотр',exact:true}).click();await expect(dialog.getByRole('table')).toContainText('27.5')
 const save=dialog.getByRole('button',{name:'Сохранить',exact:true});await expect(save).toBeInViewport();await page.screenshot({path:info.outputPath('chart-editor.png'),animations:'disabled'})
 await save.click();await expect(dialog).toHaveCount(0);expect(harness.db.size_charts[0].rows).toEqual([['42','27.5']]);expect(harness.db.size_charts[0].columns_uz).toEqual(['EU','Uzunlik'])
 await page.getByRole('button',{name:'Добавить таблицу',exact:true}).click();await dialog.getByRole('textbox',{name:'Название — русский',exact:true}).fill('Новая таблица')
 await dialog.getByRole('button',{name:'O‘zbekcha',exact:true}).click();await dialog.getByRole('textbox',{name:'Название — узбекский',exact:true}).fill('Yangi jadval')
 await dialog.getByRole('combobox',{name:'Применить к',exact:true}).selectOption('product');await dialog.getByRole('combobox',{name:'Конкретный товар',exact:true}).selectOption(productId)
 await dialog.getByRole('button',{name:'Обувь',exact:true}).click();await dialog.getByRole('textbox',{name:'Строка 1, колонка 1',exact:true}).fill('42')
 await dialog.getByRole('button',{name:'Строка',exact:true}).click();await expect(save).toBeDisabled();await dialog.getByRole('button',{name:'Удалить строку 2',exact:true}).click()
 await save.click();await expect(dialog).toHaveCount(0);expect(harness.db.size_charts[1].product_id).toBe(productId);expect(harness.db.size_charts[1].category_id).toBe('shoes');expect(harness.db.size_charts[1].rows).toEqual([['42','']])
 await page.getByRole('button',{name:'Редактировать таблицу',exact:true}).first().click();await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0)
 await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');expect(harness.errors).toEqual([])
})

for(const zone of ['Asia/Tashkent','Europe/Riga','UTC'])test.describe(`рабочие часы ${zone}`,()=>{
 test.use({timezoneId:zone})
 test('локальный ввод 24ч и обратная конвертация без изменений при открытии',async({page,harness})=>{
  await page.clock.setFixedTime(new Date('2026-07-15T12:00:00Z'))
  await page.goto(ADMIN+'/settings?section=reminders')
  const start=page.getByLabel('Начало рабочего дня',{exact:true}),end=page.getByLabel('Конец рабочего дня',{exact:true})
  await expect(start).toHaveValue(zone==='Asia/Tashkent'?'10:00':zone==='Europe/Riga'?'08:00':'05:00');await expect(end).toHaveValue(zone==='Asia/Tashkent'?'20:00':zone==='Europe/Riga'?'18:00':'15:00')
  expect(harness.calls.filter(c=>c.body?.p_value?.work_start)).toHaveLength(0)
  await start.fill(zone==='Asia/Tashkent'?'11:00':zone==='Europe/Riga'?'09:00':'06:00');await page.getByLabel('Интервал повторения',{exact:true}).fill('5');await page.getByRole('button',{name:'Сохранить рабочее время',exact:true}).click()
  await expect.poll(()=>harness.db.reminders[0].value.work_start).toBe('11:00');expect(harness.db.reminders[0].value.work_end).toBe('20:00');expect(harness.db.reminders[0].value.repeat_hours).toBe(5)
 })
})
test('таблица бренда: совместимая привязка, порядок колонок и скрытие',async({page,harness})=>{
 await page.goto(ADMIN+'/size-charts');await page.getByRole('button',{name:'Добавить таблицу',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Таблица размеров',exact:true})
 await dialog.getByLabel('Название — русский',{exact:true}).fill('Таблица бренда')
 await dialog.getByRole('button',{name:'O‘zbekcha',exact:true}).click();await dialog.getByLabel('Название — узбекский',{exact:true}).fill('Brend jadvali')
 await dialog.getByLabel('Применить к',{exact:true}).selectOption('brand');await dialog.getByLabel('Категория',{exact:true}).selectOption('shoes');await dialog.getByLabel('Подкатегория',{exact:true}).selectOption('sneakers');await dialog.getByLabel('Бренд',{exact:true}).selectOption(harness.db.brands[0].id)
 await dialog.getByRole('button',{name:'Колонка',exact:true}).click();await dialog.getByLabel('Заголовок колонки 2',{exact:true}).fill('Izoh')
 await dialog.getByRole('button',{name:'Русский',exact:true}).click();await dialog.getByLabel('Заголовок колонки 2',{exact:true}).fill('Примечание')
 await dialog.getByLabel('Строка 1, колонка 1',{exact:true}).fill('42');await dialog.getByLabel('Строка 1, колонка 2',{exact:true}).fill('проверено')
 await dialog.getByRole('button',{name:'Колонку влево',exact:true}).last().click();await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(dialog).toHaveCount(0)
 const chart=harness.db.size_charts[0];expect(chart.rows).toEqual([['проверено','42']]);expect(chart.columns_ru).toEqual(['Примечание','Размер']);expect(chart.columns_uz).toEqual(['Izoh','O‘lcham']);expect(chart.brand_id).toBe(harness.db.brands[0].id);expect(chart.subcategory_id).toBe('sneakers');expect(chart.product_id).toBe('')
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Скрыть таблицу',exact:true}).click();await expect.poll(()=>chart.is_active).toBe(false)
})
test('браузерный Back закрывает редакторы, Forward восстанавливает маршрут, несохранённые данные защищены',async({page})=>{
 await page.goto(ADMIN+'/size-charts');await page.getByRole('button',{name:'Добавить таблицу',exact:true}).click();await expect(page).toHaveURL(/dialog=edit/)
 await page.goBack();await expect(page).toHaveURL(ADMIN+'/size-charts');await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.goForward();await expect(page.getByRole('dialog',{name:'Таблица размеров'})).toBeVisible();await page.keyboard.press('Escape');await expect(page).toHaveURL(ADMIN+'/size-charts')
 await page.goto(ADMIN+'/campaigns');await page.getByRole('button',{name:'Новая рассылка',exact:true}).click();await page.getByRole('textbox',{name:'Заголовок',exact:true}).fill('Несохранённый текст')
 page.once('dialog',d=>d.dismiss());await page.goBack();await expect(page).toHaveURL(/dialog=edit/);await expect(page.getByRole('textbox',{name:'Заголовок',exact:true})).toHaveValue('Несохранённый текст')
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Закрыть редактор',exact:true}).click();await expect(page).toHaveURL(ADMIN+'/campaigns');await expect(page.getByRole('dialog')).toHaveCount(0)
})
