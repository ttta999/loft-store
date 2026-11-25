import {test,expect,STORE,productId} from './fixture'
test.use({video:{mode:'on',size:{width:390,height:844}}})
const entries=[['home','/','size'],['brand','/brands?brand=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','size'],['category','/catalog?category=shoes&subcategory=all','gallery'],['subcategory','/catalog?category=shoes&subcategory=sneakers','size'],['search','/search?q=Тестовые','gallery'],['favorites','/profile?section=favorites','cart'],['new','/all-products','size'],['popular','/all-products','size'],['sale','/all-products','size']] as const
for(const [entry,path,action] of entries)test(`return audit ${entry}: ${action}, scroll and chrome stable`,async({page,harness})=>{
 harness.db.size_charts=[{id:'table',title_ru:'Таблица',title_uz:'Jadval',category_id:'shoes',subcategory_id:'sneakers',product_id:null,brand_id:null,columns_ru:['Размер'],columns_uz:['O‘lcham'],rows:[['42']],is_active:true}]
 harness.db.settings.find(r=>r.key==='sale_mode_enabled')!.value.enabled=true
 if(entry==='favorites'){await page.goto(STORE+'/product/'+productId);await page.getByRole('button',{name:'В избранное',exact:true}).click()}
 if(['new','popular','sale'].includes(entry)){
  await page.goto(STORE);const sections={new:'products:newest',popular:'products:popular',sale:'products:sale'}
  await page.locator(`[data-surface-link="${sections[entry as keyof typeof sections]}"]`).getByRole('button',{name:entry==='sale'?'Все скидки':'Больше',exact:true}).click()
 }else if(entry==='category'||entry==='subcategory'){
  await page.goto(STORE);await page.getByText('Обувь',{exact:true}).click();await expect(page).toHaveURL(/\/category/);await expect(page.locator('html')).not.toHaveAttribute('data-loft-tab-motion','true');await page.getByRole('button',{name:entry==='category'?/^Все товары/:/Кроссовки/}).click()
 }else await page.goto(STORE+path)
 await expect(page.locator('[data-onboarding]')).toHaveCount(0)
 await expect(page.locator('html')).not.toHaveAttribute('data-loft-tab-motion','true')
 if(['new','popular','sale'].includes(entry))await expect(page).toHaveURL(/\/all-products/)
 if(entry==='category'||entry==='subcategory')await expect(page).toHaveURL(/\/catalog/)
 const sort=entry==='new'?'newest':entry
 const source=page.url(),card=page.locator(['new','popular','sale'].includes(entry)?`[data-product-placement="all-${sort}:${productId}"]`:`[data-product-card="${productId}"]`).first(),image=card.locator('img').first()
 await expect(card).toBeVisible();await expect(page.locator('html')).not.toHaveAttribute('data-loft-tab-motion','true')
 await card.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate((i:HTMLImageElement)=>i.naturalWidth)).toBeGreaterThan(0)
 const before=(await image.boundingBox())!,scroll=await page.evaluate(()=>scrollY)
 await page.evaluate(()=>{const start=document.startViewTransition.bind(document);(window as any).captures=[];document.startViewTransition=callback=>{const t=start(callback);(window as any).lastTransition=t;t.ready.then(()=>{(window as any).captures.push({mode:document.documentElement.dataset.loftMotion,y:scrollY})}).catch(()=>{});return t}})
 if(entry==='favorites')await card.getByRole('link').first().click();else await image.click({ position: { x: 24, y: 60 } })
 await expect(page.locator('[data-product-hero]')).toBeVisible();await page.evaluate(()=>(window as any).lastTransition.finished)
 if(action==='gallery'){
  await page.locator('[data-product-hero]').click();const dialog=page.getByRole('dialog',{name:'Просмотр фото'});await expect(dialog).toBeVisible();await dialog.getByRole('button').first().click();await expect(dialog).toHaveCount(0)
 }else{
  await page.locator('[data-dialog-trigger="size"]').click();await page.getByRole('button',{name:'42',exact:true}).click();await expect(page.getByRole('dialog',{name:'Выберите размер'})).toHaveCount(0)
  if(action==='cart')await page.getByRole('button',{name:/В корзину/}).click()
  else{await page.getByRole('button',{name:'Таблица размеров',exact:true}).click();await page.getByRole('button',{name:'Закрыть',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0)}
 }
 await page.goBack();await expect(page).toHaveURL(source);await expect(card).toBeVisible();await page.evaluate(()=>(window as any).lastTransition.finished)
 const after=(await image.boundingBox())!;expect(Math.abs(after.y-before.y)).toBeLessThan(2);expect(await page.evaluate(()=>scrollY)).toBe(scroll)
 await expect(page.locator('[style*="loft-product-photo"]')).toHaveCount(0);await expect(page.locator('body')).not.toHaveCSS('overflow','hidden')
 await test.info().attach('Return end frame',{body:await page.screenshot(),contentType:'image/png'})
})
for(const kind of ['similar','outfit'])test(`nested ${kind}: return to source product and originating recommendation`,async({page,harness})=>{
 await page.emulateMedia({colorScheme:'dark'})
 const second='22222222-2222-4222-8222-222222222222'
 harness.db.products.push({...harness.db.products[0],id:second,name_ru:'Второй товар'})
 harness.db.product_variants.push({...harness.db.product_variants[0],id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',product_id:second})
 harness.db.product_recommendations=[{product_id:productId,target_id:second,kind,position:0}]
 await page.goto(STORE);const home=page.locator(`[data-product-placement="new:${productId}"]`)
 await home.locator('img').click();await expect(page.locator('[data-product-hero]')).toBeVisible()
 const recommendation=page.locator(`[data-product-placement="recommendation:${productId}:${kind}:${second}"]`)
 await expect(recommendation).toBeVisible()
 await expect(page.locator('html')).not.toHaveAttribute('data-loft-motion','product')
 await recommendation.locator('img').scrollIntoViewIfNeeded()
 const before=await recommendation.locator('img').boundingBox()
 await recommendation.locator('img').click();await expect(page).toHaveURL(STORE+'/product/'+second);await expect(page.getByRole('heading',{name:'Второй товар',exact:true})).toBeVisible()
 await page.goBack();await expect(page).toHaveURL(STORE+'/product/'+productId);await expect(recommendation).toBeInViewport();await expect(page.locator('html')).not.toHaveAttribute('data-loft-motion','product')
 const after=await recommendation.locator('img').boundingBox();expect(Math.abs(after!.y-before!.y)).toBeLessThan(2)
 await page.goBack();await expect(page).toHaveURL(STORE+'/');await expect(home).toBeInViewport()
})
test('return after subscribing to unavailable size restores origin via Telegram Back',async({page,harness})=>{
 harness.db.product_variants[0].stock=0
 await page.goto(STORE);await expect(page.locator('[data-onboarding]')).toHaveCount(0);const card=page.locator(`[data-product-placement="new:${productId}"]`);await card.scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY)
 await card.locator('img').click();await expect(page.locator('[data-product-hero]')).toBeVisible()
 await page.locator('[data-dialog-trigger="size"]').click();await page.getByRole('dialog',{name:'Выберите размер'}).getByRole('button',{name:/^42/}).click();await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.getByRole('button',{name:'Уведомить о поступлении',exact:true}).click();await expect.poll(()=>harness.db.restocks?.length).toBe(1)
 await page.evaluate(()=>(window as any).telegramBack());await expect(page).toHaveURL(STORE+'/');await expect(card).toBeInViewport();await expect(page.locator('html')).not.toHaveAttribute('data-loft-motion','dissolve');expect(await page.evaluate(()=>scrollY)).toBe(y)
 await expect(page.locator('body')).not.toHaveCSS('overflow','hidden')
})
test('color change and long description return to the original brand card',async({page,harness})=>{
 const blue='dddddddd-dddd-4ddd-8ddd-dddddddddddd',red='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
 harness.db.product_colors=[{id:blue,product_id:productId,name_ru:'Синий',name_uz:'Ko‘k',hex_code:'#0000ff',images:[STORE+'/fixture-product.svg?blue'],sort_order:0},{id:red,product_id:productId,name_ru:'Красный',name_uz:'Qizil',hex_code:'#ff0000',images:[STORE+'/fixture-product.svg?red'],sort_order:1}]
 harness.db.products[0].description_ru='Подробное описание товара. '.repeat(120)
 await page.goto(STORE+'/brands?brand=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');const card=page.locator(`[data-product-card="${productId}"]`);await card.scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY),before=await card.locator('img').boundingBox()
 await card.locator('img').click();await expect(page.getByRole('button',{name:'Красный',exact:true})).toBeVisible();await page.getByRole('button',{name:'Красный',exact:true}).click();await expect(page.locator('[data-product-hero]')).toHaveAttribute('src',/red/)
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.goBack();await expect(card).toBeInViewport();await expect(page.locator('html')).not.toHaveAttribute('data-loft-motion','dissolve');expect(await page.evaluate(()=>scrollY)).toBe(y);expect(Math.abs((await card.locator('img').boundingBox())!.y-before!.y)).toBeLessThan(2)
})

type ReturnRect = {left: number; right: number; top: number}
type ReturnFrame = {out: ReturnRect; incoming: ReturnRect; header: ReturnRect; nav: string; navRect: ReturnRect; reusedPhoto: boolean; overlay: boolean}
type ReturnProbe = {kind: string; direction: number; duration: number; frames: ReturnFrame[]; initialHeader: ReturnRect; width: number}
type ReturnWindow = Window & {scrolledReturn: Promise<ReturnProbe>; productOriginScroll: number; telegramBack: () => void}

for (const back of ['island', 'telegram'] as const) {
 test(`offscreen product return without size selection keeps both pages visible during ${back} Back`, async ({page, harness}) => {
  harness.db.products[0].description_ru = 'Подробное описание товара. '.repeat(250)
  const second = '22222222-2222-4222-8222-222222222222'
  harness.db.products.push({ ...harness.db.products[0], id: second, name_ru: 'Второй товар' })
  harness.db.product_variants.push({ ...harness.db.product_variants[0], id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', product_id: second })
  harness.db.product_recommendations = [{ product_id: productId, target_id: second, kind: 'similar', position: 0 }]

  await page.goto(STORE)
  const card = page.locator(`[data-product-placement="new:${productId}"]`)
  const image = card.locator('img')
  await image.scrollIntoViewIfNeeded()
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0)
  await page.evaluate(() => {
   document.addEventListener('click', () => Object.assign(window, {productOriginScroll: scrollY}), {once:true,capture:true})
  })
  await image.click()
  const listScroll = await page.evaluate(() => (window as ReturnWindow).productOriginScroll)
  const hero = page.locator('[data-product-hero]')
  await expect(hero).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-loft-motion', 'product')
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await expect(hero).not.toBeInViewport()
  const recommendation = page.locator(`[data-product-placement="recommendation:${productId}:similar:${second}"] img`)
  await recommendation.scrollIntoViewIfNeeded()
  await expect.poll(() => recommendation.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

  await page.evaluate(() => {
   const photo = document.querySelector<HTMLImageElement>('[data-product-placement^="recommendation:"] img')!

   const sample = (element: Element) => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, right: rect.right, top: rect.top }
   }
   const probe = new Promise(resolve => {
    window.addEventListener('loft:tabs-start', event => {
     const {kind, direction, animations, finished} = (event as CustomEvent).detail
     if (kind !== 'product-back') { resolve({kind}); return }
     const outgoing = document.querySelector('[data-tab-outgoing]')!
     const incoming = document.querySelector('[data-tab-incoming]')!
     const header = document.querySelector('.loft-header')!
     const nav = document.querySelector('.loft-navigation')!
     const start = sample(outgoing)
     const initialHeader = sample(header)
     const duration = animations[0].effect.getTiming().duration
     const frames: ReturnFrame[] = []
     const frame = () => {
      if (!outgoing.isConnected) return
      frames.push({out: sample(outgoing), incoming: sample(incoming), header: sample(header),
       nav: getComputedStyle(nav).visibility, navRect: sample(nav), reusedPhoto: outgoing.contains(photo) && photo.complete && photo.naturalWidth > 0, overlay: !!document.querySelector('[data-product-return-overlay]')})
      requestAnimationFrame(frame)
     }
     requestAnimationFrame(frame)
     void finished.then(() => resolve({kind, direction, duration, start, initialHeader, frames, width: innerWidth}))
    }, {once: true})
   })
   Object.assign(window, {scrolledReturn: probe})
  })
  if (back === 'telegram') await page.evaluate(() => (window as ReturnWindow).telegramBack())
  else await page.locator('.loft-header button').first().click()
  await expect(page.locator('[data-tab-outgoing]')).toHaveCount(1)
  const result = await page.evaluate(() => (window as ReturnWindow).scrolledReturn)
  expect(result).toMatchObject({kind: 'product-back', direction: -1, duration: 340})
  expect(result.frames.length).toBeGreaterThan(2)
  expect(result.frames.some((frame) => frame.out.left > 20 && frame.out.left < result.width - 20)).toBe(true)
  for (const frame of result.frames) {
   expect(frame.incoming.right).toBeGreaterThanOrEqual(frame.out.left - 2)
   expect(frame.header).toEqual(result.initialHeader)
   expect(frame.nav).toBe('visible')
   expect(frame.reusedPhoto).toBe(true)
   expect(frame.incoming.left - frame.navRect.left).toBeCloseTo(result.frames[0].incoming.left - result.frames[0].navRect.left, 0)
   expect(frame.navRect.top).toBe(result.frames[0].navRect.top)
   expect(frame.overlay).toBe(false)
  }
  await expect(page.locator('[data-tab-outgoing]')).toHaveCount(0)
  await expect(page.locator('.loft-navigation')).toHaveCSS('visibility', 'visible')
  await expect(page.locator('.loft-navigation')).not.toHaveAttribute('inert', '')
  await expect(card).toBeInViewport()
  expect(await page.evaluate(() => scrollY)).toBe(listScroll)
 })
}

for (const fraction of [0.6, 0.8]) {
  test(`a ${fraction * 100}% visible product photo selects the right return animation`, async ({ page, harness }) => {
    harness.db.products[0].description_ru = 'Описание для проверки прокрутки. '.repeat(100)
    await page.goto(STORE)
    await expect(page.locator('[data-onboarding]')).toHaveCount(0)
    const source = page.locator(`[data-product-placement="new:${productId}"] img`)
    await source.click()
    const hero = page.locator('[data-product-hero]')
    await expect.poll(() => hero.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-loft-motion', 'product')
    const actual = await hero.evaluate((node, fraction) => {
      const rect = node.getBoundingClientRect(), header = document.querySelector('.loft-header')!
      scrollTo(0, scrollY + rect.top + rect.height * (1 - fraction) - header.getBoundingClientRect().bottom)
      const result = node.getBoundingClientRect()
      return (Math.min(result.bottom, innerHeight) - Math.max(result.top, header.getBoundingClientRect().bottom)) / result.height
    }, fraction)
    expect(actual).toBeCloseTo(fraction, 1)
    await page.evaluate(() => {
      window.addEventListener('loft:product-return-start', () => { document.documentElement.dataset.testProductRoute = 'photo' }, { once: true })
      window.addEventListener('loft:tabs-start', () => { document.documentElement.dataset.testProductRoute = 'slide' }, { once: true })
    })
    await page.locator('.loft-header button').first().click()
    await expect(page.locator('html')).toHaveAttribute('data-test-product-route', fraction > 0.7 ? 'photo' : 'slide')
    await expect(page.locator('[data-product-return-overlay], [data-tab-outgoing]')).toHaveCount(0)
    await expect(source).toBeInViewport()
  })
}
