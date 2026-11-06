import { test, expect, STORE, productId } from './fixture'

async function track(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const win = window as any
    win.transitions = []
    window.addEventListener('loft:tabs-start', ((event: CustomEvent) => {
      win.transitions.push({ mode: event.detail.kind || 'tabs', direction: String(event.detail.direction), enter: 'live-tab-slide', names: [], source: [] })
      win.sharedTransition = { ready: Promise.resolve(), finished: event.detail.finished }
    }) as EventListener)
    const original = document.startViewTransition.bind(document)
    document.startViewTransition = callback => {
      const record: any = {}; win.transitions.push(record)
      const transition = original(callback); win.sharedTransition = transition
      record.source = Array.from(document.querySelectorAll<HTMLElement>('[style*=view-transition-name]')).map(element => ({ name: element.style.viewTransitionName, placement: element.closest('[data-product-placement]')?.getAttribute('data-product-placement') }))
      transition.ready.then(() => { record.mode = document.documentElement.dataset.loftMotion; record.names = Array.from(document.querySelectorAll<HTMLElement>('[style*=view-transition-name]')).map(element => element.style.viewTransitionName); record.targetPlacement = document.querySelector('[style*="loft-product-photo"]')?.closest('[data-product-placement]')?.getAttribute('data-product-placement'); record.direction = document.documentElement.style.getPropertyValue('--loft-tab-direction'); record.enter = getComputedStyle(document.documentElement, '::view-transition-new(loft-tab-in)').animationName }).catch((error: Error) => { record.error = error.message })
      return transition
    }
  })
}
async function finished(page: import('@playwright/test').Page, mode: string) {
  await page.evaluate(() => (window as any).sharedTransition.finished)
  const record = await page.evaluate(() => (window as any).transitions.at(-1))
  expect(record.error).toBeUndefined()
  expect(record.mode).toBe(mode)
  await expect(page.locator('.loft-header').last()).toHaveCSS('view-transition-name', 'none')
  if (await page.locator('.loft-navigation').count()) await expect(page.locator('.loft-navigation')).toHaveCSS('view-transition-name', 'none')
  return record
}

for (const placement of ['sale', 'new', 'popular']) {
  test(`главная / ${placement}: фото возвращается в тот же раздел среди повторяющихся товаров`, async ({ page, harness }) => {
    harness.db.settings.find(row => row.key === 'sale_mode_enabled')!.value.enabled = true
    harness.db.product_colors = [{ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', product_id: productId, name_ru: 'Красный', name_uz: 'Qizil', hex_code: '#ff0000', images: [STORE + '/fixture-product.svg?red=1'], sort_order: 0 }]
    await page.goto(STORE)
    const card = page.locator(`[data-product-placement="${placement}:${productId}"]`)
    await card.scrollIntoViewIfNeeded()
    await expect.poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    const scroll = await page.evaluate(() => scrollY)
    await track(page)
    await card.click()
    await expect(page.locator('[data-product-hero]')).toBeVisible()
    const opening = await finished(page, 'product')
    expect(opening.source.find((item: any) => item.name === 'loft-product-photo').placement).toBe(`${placement}:${productId}`)
    await expect(page.locator('[data-product-hero]')).toHaveAttribute('src', /red=1/)
    await page.goBack()
    await expect(card).toBeVisible()
    const closing = await finished(page, 'product')
    expect(closing.names).toContain('loft-product-photo')
    expect(closing.targetPlacement).toBe(`${placement}:${productId}`)
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    await expect(card).toBeInViewport()
  })
}

for (const section of ['orders', 'china', 'favorites', 'settings']) {
  test(`профиль / ${section}: плитка и заголовок связаны в обе стороны`, async ({ page }) => {
    await page.goto(`${STORE}/profile`)
    const tile = page.locator(`[data-profile-link="${section}"]`)
    await expect(tile).toBeVisible()
    await track(page)
    const nav = await page.locator('.loft-navigation').boundingBox()
    await tile.click()
    await expect(page.locator(`[data-profile-surface="${section}"]`)).toBeVisible()
    const opening = await finished(page, 'section')
    expect(opening.enter).toBe('live-tab-slide')
    expect(opening.direction).toBe('1')
    expect(opening.names).toEqual([])
    expect(await page.locator('.loft-navigation').boundingBox()).toEqual(nav)
    await page.goBack()
    await expect(tile).toBeVisible()
    const closing = await finished(page, 'section')
    expect(closing.direction).toBe('-1')
    expect(await page.locator('.loft-navigation').boundingBox()).toEqual(nav)
    await expect(page.locator('[style*="loft-profile-"]')).toHaveCount(0)
  })
}

for (const [section, item, id] of [['orders', 'order', 1001], ['china', 'request', 3001]] as const) {
  test(`профиль / ${section}: строка раскрывается в детали и возвращается без дублей снимка`, async ({ page }) => {
    await page.goto(`${STORE}/profile?section=${section}`)
    const row = page.locator(`[data-profile-link="${item}:${id}"]`)
    await expect(row).toBeVisible()
    await track(page)
    await row.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const opening = await finished(page, 'section')
    expect(opening.names).toEqual([])
    await page.evaluate(() => (window as any).telegramBack())
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await finished(page, 'section')
    await expect(row).toBeInViewport()
  })
}

for (const document of ['privacy', 'terms']) {
  test(`настройки / ${document}: документ раскрывается из своей строки и возвращается`, async ({ page }) => {
    await page.goto(`${STORE}/profile?section=settings`)
    const row = page.locator(`[data-profile-link="${document}"]`)
    await row.scrollIntoViewIfNeeded()
    await track(page)
    await row.click()
    await expect(page.locator(`[data-profile-surface="${document}"]`)).toBeVisible()
    await page.evaluate(() => (window as any).sharedTransition.finished)
    expect(await page.evaluate(() => (window as any).transitions.at(-1).mode)).toBe('profile')
    await page.goBack()
    await expect(row).toBeVisible()
    await finished(page, 'profile')
    await expect(row).toBeInViewport()
  })
}

test('основные вкладки пролистываются по порядку меню в обе стороны', async ({ page }) => {
  await page.goto(STORE)
  await track(page)
  await page.getByRole('button', { name: 'Корзина', exact: true }).click()
  await expect(page.getByText('Корзина пуста', { exact: true })).toBeVisible()
  const forward = await finished(page, 'tabs')
  expect(forward.direction).toBe('1')
  expect(forward.enter).toBe('live-tab-slide')
  await page.getByRole('button', { name: 'Главная', exact: true }).click()
  await expect(page.getByText('Что ищете сегодня?', { exact: true })).toBeVisible()
  const back = await finished(page, 'tabs')
  expect(back.direction).toBe('-1')
})

test('чек открывается поверх заказа; Telegram Back закрывает сначала чек', async ({ page, harness }) => {
  harness.db.orders[0].payment_method = 'online_card'
  harness.db.orders[0].payment_status = 'paid'
  harness.db.orders[0].payment_screenshot_url = STORE + '/fixture-product.svg'
  await page.goto(`${STORE}/profile?section=orders`)
  await page.locator('[data-profile-link="order:1001"]').click()
  await page.locator('.loft-detail button:has(svg.lucide-eye)').click()
  const receipt = page.getByRole('dialog', { name: 'Просмотр чека' })
  await expect(receipt).toBeVisible()
  await page.evaluate(() => (window as any).telegramBack())
  await expect(receipt).toHaveCount(0)
  await expect(page.locator('.loft-detail')).toBeVisible()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.evaluate(() => (window as any).telegramBack())
  await expect(page.locator('.loft-detail')).toHaveCount(0)
})

test('быстрый возврат из профиля и уменьшение движения не оставляют переход поверх интерфейса', async ({ page }) => {
  await page.goto(`${STORE}/profile`)
  await page.locator('[data-profile-link="orders"]').click()
  await page.goBack()
  await expect(page.locator('[data-profile-link="settings"]')).toBeVisible()
  await expect(page.locator('[style*="loft-profile-"]')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => { document.startViewTransition = () => { throw Error('Reduced motion must skip projection') } })
  await page.locator('[data-profile-link="orders"]').click()
  await page.locator('[data-profile-link="order:1001"]').click()
  await expect(page.locator('.loft-detail')).toBeVisible()
  await page.goBack()
  await expect(page.locator('.loft-detail')).toHaveCount(0)
})
