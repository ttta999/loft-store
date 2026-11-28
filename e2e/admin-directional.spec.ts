import { test, expect, ADMIN } from './fixture'

test('admin sections share one directional page animation and return to their origin', async ({ page }) => {
  await page.goto(ADMIN)
  await expect(page.locator('[data-admin-card="/orders"]')).toBeVisible()
  await page.evaluate(() => {
    const events: string[] = []
    const root = document.documentElement
    new MutationObserver(() => {
      if (root.dataset.adminMotion) events.push(root.dataset.adminMotion)
      root.dataset.testDirections = events.join(',')
    }).observe(root, { attributes: true, attributeFilter: ['data-admin-motion'] })
  })
  const root = page.locator('html')
  const directions: string[] = []
  await page.evaluate(() => {
    const originals = { header: document.querySelector('[data-admin-header]'), island: document.querySelector('[data-admin-island]') }
    Object.assign(window, { adminHeaderIdentity: originals })
  })
  const transition = async (destination: string, direction: string, button: () => Promise<void>) => {
    await button()
    await expect(page).toHaveURL(ADMIN + destination)
    directions.push(direction)
    await expect(root).toHaveAttribute('data-test-directions', directions.join(','))
    await expect(root).not.toHaveAttribute('data-admin-motion', /.+/)
    expect(await page.evaluate(() => {
      const original = (window as Window & { adminHeaderIdentity?: { header: Element; island: Element } }).adminHeaderIdentity
      return original?.header === document.querySelector('[data-admin-header]') &&
        original?.island === document.querySelector('[data-admin-island]')
    })).toBe(true)
    if (destination === '/') await expect(page.getByRole('heading', { name: 'LOFT Админ Панель' })).toBeVisible()
  }
  const open = (path: string) => transition(path, 'forward', () => page.locator(`[data-admin-card="${path}"]`).click())
  const back = (path: string) => transition(path, 'back', () => page.goBack().then(() => {}))
  test.setTimeout(70_000)
  for (const path of ['/orders', '/china', '/refunds', '/analytics', '/campaigns']) {
    await open(path)
    await back('/')
    await open(path)
    await back('/')
  }
  await open('/catalog')
  for (const path of ['/products', '/categories', '/brands', '/size-charts']) {
    await open(path)
    await back('/catalog')
    await open(path)
    await back('/catalog')
  }
  await back('/')
  await open('/settings')
  for (const section of ['payments', 'prices', 'sale', 'reminders', 'theme']) {
    await open('/settings?section=' + section)
    await back('/settings')
    await open('/settings?section=' + section)
    await back('/settings')
  }
})

test('dashboard converts confirmed revenue at the configured shop rate', async ({ page, harness }) => {
  Object.assign(harness.db.orders[0], {
    total_price_usd: 633, payment_status: 'paid', paid_at: '2026-11-20T08:00:00Z', status: 'Активный',
  })
  const setting = harness.db.settings.find(row => row.key === 'exchange_rate')!
  setting.value.rate = 12100
  await page.goto(ADMIN)
  await expect(page.getByText('$633', { exact: true })).toBeVisible()
  await expect(page.getByText('≈ 7 659 300 сум', { exact: true })).toBeVisible()
  setting.value.rate = 0
  await page.getByRole('button', { name: 'Обновить', exact: true }).click()
  await expect(page.getByText('≈ 7 659 300 сум', { exact: true })).toHaveCount(0)
  await expect(page.getByText('$633', { exact: true })).toBeVisible()
})

for (const theme of ['light', 'dark'] as const) {
  test(`category action and brand logos have independent surfaces in ${theme}`, async ({ page, harness }) => {
    await page.emulateMedia({ colorScheme: theme })
    const logo = (name: string, fill: string, id: string) => ({
      ...harness.db.brands[0], id, name, logo_url: ADMIN + '/fixture-logo-' + fill + '.svg',
    })
    harness.db.brands = [
      logo('Чёрный логотип', 'black', '1'), logo('Белый логотип', 'white', '2'),
      logo('Цветной логотип', 'red', '3'),
      { ...harness.db.brands[0], id: '4', name: 'Без логотипа', logo_url: null },
    ]
    await page.route('**/fixture-logo-*.svg', route => {
      const fill = new URL(route.request().url()).pathname.split('-').at(-1)!.split('.')[0]
      return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><rect width="32" height="16" fill="${fill}"/></svg>` })
    })
    await page.goto(ADMIN + '/brands')
    const logos = page.locator('[data-brand-logo]')
    await expect(logos).toHaveCount(4)
    const images = logos.locator('img')
    await expect(images).toHaveCount(3)
    for (const image of await images.all()) {
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(32)
      await expect(image).toHaveCSS('object-fit', 'contain')
      await expect(image).toHaveCSS('background-color', 'rgb(255, 255, 255)')
      await expect(image.locator('..')).toHaveCSS('width', '36px')
      await expect(image).toHaveCSS('padding', '4px')
    }
    await expect(logos.filter({ hasNot: page.locator('img') })).toHaveText('Б')
    await page.goto(ADMIN + '/categories')
    const category = page.locator('[data-category-row="shoes"]')
    const button = category.getByRole('button', { name: 'Добавить подкатегорию', exact: true })
    const table = category.locator(':scope > div').first()
    const [tableBox, buttonBox] = await Promise.all([table.boundingBox(), button.boundingBox()])
    expect(buttonBox!.y - (tableBox!.y + tableBox!.height)).toBeGreaterThanOrEqual(12)
    await button.click()
    await expect(page.getByText('Новая подкатегория', { exact: true })).toBeVisible()
  })
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`each route has the same app bar on direct entry and initial navigation in ${colorScheme}`, async ({ page }) => {
    test.setTimeout(100_000)
    await page.emulateMedia({ colorScheme })
    const bar = page.locator('[data-admin-header]:visible')
    const height = page.viewportSize()!.width >= 768 ? 73 : 97
    const routes = [
      '/', '/orders', '/china', '/refunds', '/analytics', '/campaigns',
      '/catalog', '/products', '/categories', '/brands', '/size-charts', '/settings',
      '/settings?section=payments', '/settings?section=prices', '/settings?section=sale',
      '/settings?section=reminders', '/settings?section=theme',
    ]
    for (const route of routes) {
      await page.goto(ADMIN + route)
      await expect(bar).toHaveCount(1)
      const heading = bar.locator('h1:visible')
      await expect(heading).toBeVisible()
      await expect.poll(() => bar.evaluate(element => element.getBoundingClientRect().height)).toBe(height)
      await expect.poll(() => bar.evaluate(element => element.getBoundingClientRect().y)).toBe(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
      if (route !== '/') {
        await bar.locator('[data-admin-back]').click()
        await expect(page).not.toHaveURL(ADMIN + route)
        await expect(bar).toHaveCount(1)
        await expect(page.locator('html')).not.toHaveAttribute('data-admin-motion', /.+/)
      }
      // Complete reads before the next full document reload, which cancels WebKit requests.
      await page.waitForLoadState('networkidle')
    }
  })
}

test('rapid route interruption leaves one header, the requested route and no horizontal scroll', async ({ page }) => {
  await page.goto(ADMIN)
  await page.locator('[data-admin-card="/catalog"]').click()
  await expect(page).toHaveURL(ADMIN + '/catalog')
  await page.evaluate(() => history.back())
  await expect(page).toHaveURL(ADMIN + '/')
  await page.locator('[data-admin-card="/orders"]').click()
  await expect(page).toHaveURL(ADMIN + '/orders')
  await expect(page.locator('[data-admin-header]:visible')).toHaveCount(1)
  await expect(page.locator('html')).not.toHaveAttribute('data-admin-motion', /.+/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
})

test('cold module may remain pending while the shared push animates', async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/src/pages/OrdersPage.tsx**', async route => {
    await pending
    await route.fallback()
  })
  try {
    await page.goto(ADMIN)
    await page.locator('[data-admin-card="/orders"]').click()
    await expect(page).toHaveURL(ADMIN + '/orders')
    await expect(page.locator('[data-admin-header]:visible h1:visible')).toHaveText('Заказы')
    await expect(page.getByRole('status', { name: 'Загрузка' })).toBeVisible()
    await expect(page.locator('[data-admin-header]:visible')).toHaveCount(1)
    const viewport = await page.evaluate(() => ({
      overflow: getComputedStyle(document.documentElement).overflowX,
      scrolled: scrollX,
      contentWidth: document.querySelector('[data-admin-page]')?.clientWidth,
    }))
    expect(viewport.overflow).toBe('clip')
    expect(viewport.scrolled).toBe(0)
    expect(viewport.contentWidth).toBeLessThanOrEqual(page.viewportSize()!.width)
    // A translated page contributes to scrollWidth before the snapshot is removed.
    // Check the real layout width while the module is still blocked, after the animation.
    await expect(page.locator('html')).not.toHaveAttribute('data-admin-motion')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  } finally { release() }
  await expect(page.getByRole('button', { name: 'Обновить список' })).toBeVisible()
})

test('dashboard title stays centered and all three island actions work', async ({ page, harness }) => {
  await page.goto(ADMIN)
  const island = page.locator('[data-admin-island]')
  await expect(island).toHaveText('LOFT Админ Панель')
  const centered = () => island.evaluate(element => {
    const box = element.getBoundingClientRect()
    const grid = element.closest('[data-admin-heading]')!.getBoundingClientRect()
    return Math.abs(box.left + box.width / 2 - grid.left - grid.width / 2)
  })
  expect(await centered()).toBeLessThan(1)
  const bell = page.getByTitle('Уведомления о новых заказах и спецзаказах')
  await bell.click()
  const menu = page.locator('[data-notification-menu]')
  await expect(menu).toBeVisible()
  expect(await menu.evaluate(element => {
    const { left, right } = element.getBoundingClientRect()
    return left >= 0 && right <= innerWidth
  })).toBe(true)
  await bell.click()
  await expect(menu).toHaveCount(0)
  const refresh = page.getByRole('button', { name: 'Обновить', exact: true })
  const orderReads = harness.calls.filter(call => call.path === '/rest/v1/orders').length
  await refresh.click()
  await expect.poll(() => harness.calls.filter(call => call.path === '/rest/v1/orders').length).toBeGreaterThan(orderReads)
  expect(await centered()).toBeLessThan(1)
  await page.screenshot({ path: test.info().outputPath('dashboard-island.png') })
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await expect(page).toHaveURL(ADMIN + '/login')
  await expect(island).toHaveCount(0)
})

test('unrecognized settings sections open the settings menu', async ({ page }) => {
  await page.goto(ADMIN + '/settings?section=constructor')
  await expect(page.getByRole('heading', { name: 'Настройки', exact: true })).toBeVisible()
  await expect(page.locator('[data-admin-card="/settings?section=prices"]')).toBeVisible()
})
