import { test, expect, STORE, ADMIN, productId } from './fixture'

for (const section of ['newest', 'popular', 'sale']) {
  test(`${section}: фильтры сохраняют карточки, фото непрерывно открывается и возвращается в список`, async ({ page, harness }) => {
    harness.db.settings.find(s => s.key === 'sale_mode_enabled')!.value.enabled = true
    const original = harness.db.products[0]
    harness.db.products.push(...Array.from({ length: 10 }, (_, i) => ({ ...original, id: `extra-${i}`, name_ru: `Товар ${i}`, sale_price: null, created_at: new Date(Date.now() - (i + 1) * 86400000).toISOString() })))
    await page.goto(STORE)
    await page.locator(`[data-surface-link="products:${section}"]`).getByRole('button', { name: section === 'sale' ? 'Все скидки' : 'Больше', exact: true }).click()
    await expect(page).toHaveURL(STORE + '/all-products')
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-loft-motion'))
    const card = page.locator(`[data-product-placement="all-${section}:${productId}"]`)
    await expect(card).toBeVisible()
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-loft-motion'))
    if (section === 'sale') await expect(page.locator('[data-product-card]')).toHaveCount(1)
    await card.evaluate(e => { (window as any).originalCard = e })
    const filters = page.getByRole('button', { name: /Фильтры и сортировка/ })
    await filters.click()
    await expect(filters).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('button', { name: 'Обувь', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Обувь', exact: true }).click()
    await page.getByRole('button', { name: 'Кроссовки', exact: true }).click()
    expect(await page.evaluate(() => (window as any).originalCard.isConnected)).toBe(true)
    await filters.click()
    await expect(page.locator('[data-collection-filters]')).toHaveCount(0)
    await card.evaluate(e => scrollTo(0, e.getBoundingClientRect().top + scrollY - 110))
    await expect.poll(() => card.locator('img').evaluate((e: HTMLImageElement) => e.naturalWidth)).toBeGreaterThan(0)
    const scroll = await page.evaluate(() => scrollY)
    await page.evaluate(() => {
      const native = document.startViewTransition.bind(document)
      ;(window as any).frames = []
      document.startViewTransition = cb => {
        const source = document.querySelector<HTMLElement>('[style*="loft-product-photo"]')
        const record: any = { source: !!source }
        ;(window as any).frames.push(record)
        const transition = native(cb)
        ;(window as any).lastTransition = transition
        transition.ready.then(() => { record.mode = document.documentElement.dataset.loftMotion }).catch((e: Error) => { record.error = e.message })
        return transition
      }
    })
    await card.locator('img').click({ position: { x: 30, y: 30 } })
    await expect(page.locator('[data-product-hero]')).toBeVisible()
    await page.evaluate(() => (window as any).lastTransition.finished)
    await page.goBack()
    await expect(card).toBeVisible()
    await page.evaluate(() => (window as any).lastTransition.finished)
    expect(await page.evaluate(() => (window as any).frames)).toEqual([{ source: true, mode: 'product' }, { source: true, mode: 'product' }])
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    await filters.click()
    await expect(page.getByRole('button', { name: 'Кроссовки', exact: true })).toHaveClass(/bg-\[#1B2A4A\]/)
  })
}

for (const currency of ['USD', 'UZS']) {
  test(`доставка в USD из админки: корректная цена и порог в ${currency}`, async ({ page, context, harness }) => {
    const manager = await context.newPage()
    await manager.goto(ADMIN + '/settings?section=payments')
    await manager.getByLabel('Цена доставки (USD)', { exact: true }).fill('2.52')
    await manager.getByLabel('Порог бесплатной доставки (USD)', { exact: true }).fill('200')
    await manager.getByRole('button', { name: 'Сохранить настройки доставки', exact: true }).click()
    await expect.poll(() => harness.db.settings.find(s => s.key === 'delivery_price')!.value.price_usd).toBe(2.52)
    expect(harness.db.settings.find(s => s.key === 'free_delivery_threshold')!.value.amount_usd).toBe(200)
    harness.db.products[0].price_usd = 160
    harness.db.settings.find(s => s.key === 'exchange_rate')!.value.rate = 11910.62
    await page.goto(STORE + '/profile?section=settings')
    await page.getByRole('button', { name: currency, exact: true }).click()
    await page.goto(`${STORE}/product/${productId}`)
    await page.locator('[data-dialog-trigger="size"]').click()
    await page.getByRole('button', { name: '42', exact: true }).click()
    await page.getByRole('button', { name: 'В корзину', exact: true }).click()
    await expect(page.getByText('Товар добавлен в корзину!', { exact: true })).toBeVisible()
    await page.goto(STORE + '/cart')
    await page.getByRole('button', { name: 'Оформить заказ', exact: true }).click()
    await page.getByRole('button', { name: 'Доставка', exact: true }).click()
    await page.getByPlaceholder('Ваше имя', { exact: true }).fill('Покупатель')
    await page.getByPlaceholder('+998 XX XXX XX XX', { exact: true }).fill('+998901234567')
    await page.locator('textarea').fill('Навои дом 15 квартира 17')
    if (currency === 'USD') {
      await expect(page.getByText('$2.52', { exact: true })).toBeVisible()
      await expect(page.getByText('$162.52', { exact: true })).toBeVisible()
    } else await expect(page.getByText(/1[,\s]935[,\s]714 сум/, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Перейти к оплате', exact: true }).click()
    await expect(page.locator('input[type=file]')).toHaveCount(1)
    const order = harness.calls.find(c => c.body?.action === 'createOrder')!.body.order
    expect(order.total_price_usd).toBe(162.52)
    expect(order.total_price_uzs).toBe(1935714)
  })
}

test('фильтры раскрываются и закрываются без скачков прокрутки', async ({ page }) => {
  await page.goto(STORE)
  await page.locator('[data-surface-link="products:newest"]').getByRole('button', { name: 'Больше', exact: true }).click()
  await expect(page.locator(`[data-product-placement="all-newest:${productId}"]`)).toBeVisible()
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-loft-motion'))
  const toggle = page.getByRole('button', { name: /Фильтры и сортировка/ })
  for (const open of [true, false]) {
    await page.evaluate(() => {
      ;(window as any).filterFrames = []
      const sample = () => {
        const panel = document.querySelector('[data-collection-filters]')?.parentElement
        ;(window as any).filterFrames.push({ h: panel?.getBoundingClientRect().height || 0, y: scrollY })
        if ((window as any).filterFrames.length < 40) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    await toggle.click()
    await expect.poll(() => page.evaluate(() => (window as any).filterFrames.length)).toBe(40)
    const frames = await page.evaluate(() => (window as any).filterFrames as { h: number; y: number }[])
    expect(Math.max(...frames.map(f => f.y)) - Math.min(...frames.map(f => f.y))).toBeLessThan(1)
    const max = Math.max(...frames.map(f => f.h))
    expect(frames.some(f => f.h > 1 && f.h < max - 1)).toBe(true)
    for (let i = 1; i < frames.length; i++) expect((frames[i].h - frames[i - 1].h) * (open ? 1 : -1)).toBeGreaterThanOrEqual(-1)
  }
})

test('админка не сохраняет дроби доллара меньше цента и не показывает успех при ошибке сервера', async ({ page, harness }) => {
  await page.goto(ADMIN + '/settings?section=payments')
  const save = page.getByRole('button', { name: 'Сохранить настройки доставки', exact: true })
  await page.getByLabel('Цена доставки (USD)', { exact: true }).fill('2.521')
  await save.click()
  await expect(page.getByText('Введите неотрицательные суммы в долларах, не более двух знаков после точки', { exact: true })).toBeVisible()
  expect(harness.calls.some(c => c.path.endsWith('/rpc/store_admin_save_delivery'))).toBe(false)
  await page.getByLabel('Цена доставки (USD)', { exact: true }).fill('2.52')
  const original = structuredClone(harness.db.settings)
  await page.route('**/rest/v1/rpc/store_admin_save_delivery', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Fixture rejected' }) }))
  await save.click()
  await expect(page.getByText('Ошибка сохранения', { exact: true })).toBeVisible()
  expect(harness.db.settings).toEqual(original)
})
