import { test, expect, STORE, ADMIN } from './fixture'

for (const kind of ['orders', 'china'] as const) {
  test(`${kind}: детали открываются без сброса списка, возврат сохраняет прокрутку`, async ({ page, harness }) => {
    const key = kind === 'orders' ? 'orders' : 'china_requests'
    const original = harness.db[key][0]
    harness.db[key] = Array.from({ length: 14 }, (_, i) => ({ ...original, id: 5000 + i }))
    await page.goto(`${STORE}/profile?section=${kind}`)
    const title = kind === 'orders' ? 'Заказ №5010' : 'Спецзаказ №5010'
    const row = page.getByRole('heading', { name: title, exact: true })
    await row.scrollIntoViewIfNeeded()
    const scroll = await page.evaluate(() => scrollY)
    expect(scroll).toBeGreaterThan(100)
    const reads = harness.calls.filter(c => c.body?.action === (kind === 'orders' ? 'orders' : 'requests')).length
    await row.click()
    const detail = page.getByRole('dialog')
    await expect(detail).toBeVisible()
    await expect(detail.getByRole('heading', { name: title, exact: true })).toBeVisible()
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    const frames = await detail.evaluate(async element => {
      const frames: { opacity: string; background: string; scroll: number; navY: number; navTransform: string }[] = []
      for (let i = 0; i < 20; i++) {
        await new Promise(requestAnimationFrame)
        const style = getComputedStyle(element)
        const nav = document.querySelector('.loft-navigation')!
        frames.push({ opacity: style.opacity, background: style.backgroundColor, scroll: scrollY, navY: nav.getBoundingClientRect().y, navTransform: getComputedStyle(nav).transform })
      }
      return frames
    })
    expect(frames.every(f => f.opacity === '1' && !f.background.includes('rgba') && f.scroll === scroll)).toBe(true)
    expect(frames.every(frame => frame.navY === frames[0].navY && frame.navTransform === 'none')).toBe(true)
    await expect(detail).toHaveCSS('opacity', '1')
    await expect(page.locator('.loft-navigation')).toHaveCSS('view-transition-name', 'none')
    await test.info().attach('Детали после перехода', { body: await detail.screenshot(), contentType: 'image/png' })
    expect(harness.calls.filter(c => c.body?.action === (kind === 'orders' ? 'orders' : 'requests')).length).toBe(reads)
    await page.goBack()
    await expect(detail).toHaveCount(0)
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    await expect(row).toBeInViewport()
  })
}

test('история предварительно загружается в профиле, повторное открытие не делает запросов', async ({ page, harness }) => {
  await page.goto(`${STORE}/profile`)
  await expect.poll(() => harness.calls.filter(c => ['orders', 'requests'].includes(c.body?.action)).length).toBe(2)
  await page.getByRole('button', { name: /Заказы История заказов/ }).click()
  await expect(page.getByRole('heading', { name: 'Заказ №1001', exact: true })).toBeVisible()
  await page.goBack()
  await page.getByRole('button', { name: /Мои спецзаказы/ }).click()
  await expect(page.getByRole('heading', { name: 'Спецзаказ №3001', exact: true })).toBeVisible()
  expect(harness.calls.filter(c => ['orders', 'requests'].includes(c.body?.action)).length).toBe(2)
})

test('старый WebView переключает страницы без ожидания затухания; быстрые переходы не теряются', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true }) })
  await page.goto(STORE)
  await page.getByRole('button', { name: 'Корзина', exact: true }).click()
  await expect(page.getByText('Корзина пуста', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Спецзаказ', exact: true }).click()
  await page.getByRole('button', { name: 'Главная', exact: true }).click()
  await expect(page).toHaveURL(STORE + '/')
  await expect(page.getByText('Тестовые кроссовки', { exact: true }).first()).toBeVisible()
  await expect(page.locator('.loft-navigation')).toBeInViewport()
})

test('возврат пролистывает назад, нажатие кнопок упругое, уменьшенное движение отключает эффект', async ({ page }) => {
  await page.goto(STORE)
  await page.getByRole('button', { name: 'Корзина', exact: true }).click()
  await expect(page.getByText('Корзина пуста', { exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.locator('.loft-navigation')).toBeInViewport()
  const button = page.getByRole('button', { name: 'Корзина', exact: true })
  await button.focus()
  await page.keyboard.down('Space')
  await expect(button).toHaveCSS('scale', '0.98')
  await page.keyboard.up('Space')
  await expect(page.getByText('Корзина пуста', { exact: true })).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(button).toHaveCSS('transition-duration', '1e-05s')
})

test('админка: повторное открытие списка использует кеш; остальные страницы загружаются отдельными модулями', async ({ page, harness }) => {
  await page.goto(ADMIN)
  await expect(page.getByText(/Панель управления|Главная панель/).first()).toBeVisible()
  const before = harness.calls.filter(c => c.path.endsWith('/orders')).length
  await page.getByRole('button', { name: /Заказы/ }).first().click()
  await expect(page.getByRole('button', { name: /Заказ №1001/ })).toBeVisible()
  await page.goBack()
  await expect(page.getByText(/Панель управления|Главная панель/).first()).toBeVisible()
  await page.getByRole('button', { name: /Заказы/ }).first().click()
  await expect(page.getByRole('button', { name: /Заказ №1001/ })).toBeVisible()
  expect(harness.calls.filter(c => c.path.endsWith('/orders')).length).toBe(before)
})
