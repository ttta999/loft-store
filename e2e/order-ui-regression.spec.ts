import { test, expect, STORE, productId } from './fixture'

test('размеры: закрытие движет панель целиком, сохраняет прокрутку и снимает блокировку после выхода', async ({ page }) => {
  await page.goto(`${STORE}/product/${productId}`)
  const trigger = page.locator('[data-dialog-trigger="size"]')
  await trigger.scrollIntoViewIfNeeded()
  const before = await trigger.boundingBox()
  const scroll = await page.evaluate(() => scrollY)
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Выберите размер' })
  await expect(dialog.getByRole('button', { name: '42', exact: true })).toBeVisible()
  await expect(dialog).toHaveCSS('clip-path', 'none')
  await page.waitForFunction(() => {
    const sheet = document.querySelector('[data-surface-dialog="size"]')?.lastElementChild
    return sheet && getComputedStyle(sheet).transform === 'none'
  })
  const samples = await dialog.evaluate(async element => {
    const panel=element.lastElementChild!
    element.querySelector<HTMLButtonElement>('[data-loft-dismiss]')!.click()
    const frames: {top:number;scroll:number;lock:string}[]=[]
    for(let i=0;i<24;i++){
      await new Promise(requestAnimationFrame)
      if(element.isConnected)frames.push({top:panel.getBoundingClientRect().top,scroll:scrollY,lock:document.body.style.overflow})
    }
    return frames
  })
  expect(samples.length).toBeGreaterThan(2)
  for(let i=1;i<samples.length;i++)expect(samples[i].top).toBeGreaterThanOrEqual(samples[i-1].top-0.5)
  expect(samples.every(frame=>Math.abs(frame.scroll-scroll)<1 && frame.lock==='hidden')).toBe(true)
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(()=>scrollY)).toBe(scroll)
  expect(Math.abs((await trigger.boundingBox())!.y-before!.y)).toBeLessThan(1)
  expect(await page.evaluate(()=>document.body.style.overflow)).toBe('')
})

test('цвет: галерея не теряет высоту при переходе с нескольких фото на одно', async ({ page, harness }) => {
  const red='dddddddd-dddd-4ddd-8ddd-dddddddddddd', blue='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  const photo=(name:string)=>STORE+'/fixture-product.svg?'+name
  harness.db.product_colors=[{id:red,product_id:productId,name_ru:'Красный',images:[photo('red1'),photo('red2')],sort_order:0},{id:blue,product_id:productId,name_ru:'Синий',images:[photo('blue1')],sort_order:1}]
  harness.db.product_variants=[{id:'red',product_id:productId,color_id:red,size_value:'42',stock:2},{id:'blue',product_id:productId,color_id:blue,size_value:'43',stock:1}]
  await page.goto(`${STORE}/product/${productId}`)
  const blueButton=page.getByRole('button',{name:'Синий',exact:true})
  await expect(blueButton).toBeVisible()
  await page.getByAltText('Thumbnail 2').click()
  await expect(page.locator('[data-product-hero]')).toHaveAttribute('src',photo('red2'))
  await blueButton.scrollIntoViewIfNeeded()
  const before=(await blueButton.boundingBox())!.y
  const height=await page.locator('[data-product-thumbnails]').evaluate(e=>e.getBoundingClientRect().height)
  await blueButton.click()
  await expect(page.locator('[data-product-hero]')).toHaveAttribute('src',photo('blue1'))
  expect(await page.locator('[data-product-thumbnails]').evaluate(e=>e.getBoundingClientRect().height)).toBe(height)
  expect(Math.abs((await blueButton.boundingBox())!.y-before)).toBeLessThan(1)
  await page.locator('[data-dialog-trigger="size"]').click()
  await expect(page.getByRole('button',{name:'43',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'42',exact:true})).toHaveCount(0)
})

test('оформление: поля ввода не запускают автоприближение iOS; ручной масштаб разрешён', async ({ page }) => {
  await page.goto(`${STORE}/product/${productId}`)
  await page.locator('[data-dialog-trigger="size"]').click()
  await page.getByRole('button',{name:'42',exact:true}).click()
  await page.getByRole('button',{name:'В корзину',exact:true}).click()
  await expect(page.getByText('Товар добавлен в корзину!',{exact:true})).toBeVisible()
  await page.goto(`${STORE}/cart`)
  await page.getByRole('button',{name:'Оформить заказ',exact:true}).click()
  await page.getByRole('button',{name:'Доставка',exact:true}).click()
  for(const placeholder of ['Ваше имя','+998 XX XXX XX XX','Улица, дом, квартира']){
    const field=page.getByPlaceholder(placeholder,{exact:true})
    await expect(field).toBeVisible()
    expect(await field.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16)
    await field.fill(placeholder==='Ваше имя'?'Тест':placeholder.startsWith('+')?'+998901234567':'Навои 15')
  }
  const viewport=await page.locator('meta[name="viewport"]').getAttribute('content')
  expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:[,.\s]|$)/)
})
