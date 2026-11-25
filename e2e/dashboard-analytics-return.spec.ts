import { test, expect, ADMIN } from './fixture'

for (const [route, minutes] of [['/catalog', 2], ['/settings', 5], ['/refunds', 15], ['/china', 30]] as const) {
  test(`Dashboard already has its island and cached statistics in the first frame from ${route} after ${minutes} minutes`, async ({ page, harness }) => {
    Object.assign(harness.db.orders[0], {
      total_price_usd: 633, payment_status: 'paid', paid_at: new Date().toISOString(), status: 'Активный',
    })
    await page.goto(ADMIN)
    await expect(page.getByText('$633', { exact: true })).toBeVisible()
    await page.locator(`[data-admin-card="${route}"]`).click()
    // The URL changes before the destination is committed and starts its slide.
    await expect(page.locator('[data-admin-back]')).toBeVisible()
    await expect(page.locator('html')).not.toHaveAttribute('data-admin-motion', /.+/)
    await page.clock.setFixedTime(new Date(Date.now() + minutes * 60_000))
    let releaseOrders!: () => void
    const ordersGate = new Promise<void>(resolve => { releaseOrders = resolve })
    await page.route('**/rest/v1/orders?*', async request => {
      await ordersGate
      await request.fallback()
    })
    await page.evaluate(() => {
      window.addEventListener('loft:admin-live-header', () => {
        const header = document.querySelector('[data-admin-header]')!
        const island = header.querySelector('[data-admin-island]')!
        const box = island.getBoundingClientRect()
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
        Object.assign(window, { dashboardFirstFrame: {
          heading: island.querySelector('h1')?.textContent,
          live: island.contains(hit),
          top: header.getBoundingClientRect().top,
          direction: document.documentElement.dataset.adminMotion,
          sizes: Array.from(header.querySelectorAll('button'), button => {
            const { width, height } = button.getBoundingClientRect()
            return [width, height]
          }),
        } })
      }, { once: true })
    })
    try {
      await page.locator('[data-admin-header] [data-admin-back]').click()
      await expect(page.getByRole('heading', {name: 'LOFT Админ Панель'})).toBeVisible()
      await expect(page.getByText('$633', { exact: true })).toBeVisible()
      const frame = await page.evaluate(() => (window as Window & { dashboardFirstFrame?: unknown }).dashboardFirstFrame)
      expect(frame).toEqual({ heading: 'LOFT Админ Панель', live: true, top: 0, direction: 'back', sizes: [[40, 40], [40, 40], [40, 40]] })
      await expect(page.locator('html')).not.toHaveAttribute('data-admin-motion', /.+/)
      harness.db.orders[0].total_price_usd = 741
    } finally {
      releaseOrders()
    }
    await expect(page.getByText('$741', { exact: true })).toBeVisible()
  })
}

test('Analytics preserves selected period and cached results while its fresh read is pending', async ({page, harness}) => {
  Object.assign(harness.db.orders[0], {
    created_at: new Date().toISOString(), total_price_usd: 633, payment_status: 'paid',
    paid_at: new Date().toISOString(), status: 'Активный',
  })
  await page.goto(ADMIN + '/analytics')
  await expect(page.getByText('$633', {exact:true}).first()).toBeVisible()
  await page.getByRole('button', {name: 'Неделя', exact: true}).click()
  await expect.poll(() => harness.calls.filter(call => call.path === '/rest/v1/orders').length).toBeGreaterThanOrEqual(2)
  await expect(page.getByText('$633', {exact:true}).first()).toBeVisible()
  await page.locator('[data-admin-header] [data-admin-back]').click()
  await expect(page.locator('html')).not.toHaveAttribute('data-admin-motion', /.+/)

  let releaseOrders!: () => void
  let trackRead!: () => void
  const ordersGate = new Promise<void>(resolve => { releaseOrders = resolve })
  const readStarted = new Promise<void>(resolve => { trackRead = resolve })
  await page.route('**/rest/v1/orders?*', async request => {
    if (!new URL(request.request().url()).searchParams.get('created_at')) return request.fallback()
    trackRead()
    await ordersGate
    await request.fallback()
  })
  try {
    harness.db.orders[0].total_price_usd = 740
    await page.locator('[data-admin-card="/analytics"]').click()
    await expect(page.getByText('$633', {exact:true}).first()).toBeVisible()
    await readStarted
    await expect(page.getByText('$740', {exact:true}).first()).toHaveCount(0)
  } finally {
    releaseOrders()
  }
  await expect(page.getByText('$740', {exact:true}).first()).toBeVisible()
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`Dashboard keeps four independent controls on a transparent sticky header in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 844 })
      await page.goto(ADMIN)
      const shell = page.locator('[data-admin-header]')
      await expect(shell).toHaveCSS('position', 'sticky')
      await expect(shell).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await expect(shell).toHaveCSS('border-bottom-color', 'rgba(0, 0, 0, 0)')
      await expect(shell.getByRole('heading', { name: 'LOFT Админ Панель' })).toBeVisible()
      await expect(shell.getByRole('button')).toHaveCount(3)
      const dimensions = await shell.getByRole('button').evaluateAll(buttons => buttons.map(button => {
        const box = button.getBoundingClientRect()
        const style = getComputedStyle(button)
        return { width: box.width, height: box.height, radius: parseFloat(style.borderRadius), text: button.querySelector('span:not([data-notification-count])')?.textContent ?? '' }
      }))
      expect(dimensions).toEqual(Array(3).fill({ width: 40, height: 40, radius: dimensions[0].radius, text: '' }))
      expect(dimensions[0].radius).toBeGreaterThanOrEqual(20)
      await page.locator('[data-admin-card="/catalog"]').click()
      await expect(shell.getByRole('heading', { name: 'Каталог' })).toBeVisible()
      await expect(shell).toHaveCSS('background-color', colorScheme === 'dark' ? 'rgb(11, 17, 30)' : 'rgb(245, 241, 232)')
    }
  })
}

test('Dashboard retains expired data on failure and clears it across login', async ({ page, harness }) => {
  Object.assign(harness.db.orders[0], {
    total_price_usd: 633, payment_status: 'paid', paid_at: new Date().toISOString(), status: 'Активный',
  })
  await page.goto(ADMIN)
  await expect(page.getByText('$633', { exact: true })).toBeVisible()
  await page.locator('[data-admin-card="/catalog"]').click()
  await expect(page.locator('html')).not.toHaveAttribute('data-admin-motion', /.+/)
  await page.clock.setFixedTime(new Date(Date.now() + 31 * 60_000))
  const ordersUrl = '**/rest/v1/orders?*'
  await page.route(ordersUrl, route => route.fulfill({ status: 400, headers: { 'access-control-allow-origin': '*' }, json: { message: 'Fixture read failure' } }))
  await page.locator('[data-admin-back]').click()
  await expect(page.locator('[data-sonner-toast]').getByText('Не удалось обновить. Показаны последние данные.')).toBeVisible()
  await expect(page.getByText('$633', { exact: true })).toBeVisible()
  await expect(page.locator('[data-dashboard-refresh]')).toHaveAttribute('data-dashboard-refresh', 'error')
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await expect(page).toHaveURL(ADMIN + '/login')
  await expect(page.getByText('$633', { exact: true })).toHaveCount(0)
  await page.unroute(ordersUrl)
  harness.db.orders[0].total_price_usd = 341
  await page.getByPlaceholder('admin@loft-store.uz').fill('admin@example.test')
  await page.locator('input[type=password]').fill('fixture-password')
  await page.getByRole('button', { name: /Войти/ }).click()
  await page.getByRole('textbox', { name: 'Код двухфакторного входа', exact: true }).fill('123456')
  await page.getByRole('button', { name: /Подтвердить/ }).click()
  await expect(page.getByText('$341', { exact: true })).toBeVisible()
  await expect(page.getByText('$633', { exact: true })).toHaveCount(0)
})

test('Analytics keeps its cards while uncached periods load and ignores a late previous response', async ({ page, harness }) => {
  const now = Date.now()
  const paid = { ...harness.db.orders[0], status: 'Активный', payment_status: 'paid', paid_at: new Date(now).toISOString() }
  harness.db.orders = [
    { ...paid, total_price_usd: 17, created_at: new Date(now).toISOString() },
    { ...paid, id: 1002, total_price_usd: 28, created_at: new Date(now - 16 * 86_400_000).toISOString() },
    { ...paid, id: 1003, total_price_usd: 62, created_at: new Date(now - 90 * 86_400_000).toISOString() },
  ]
  await page.goto(ADMIN + '/analytics')
  const results = page.locator('[data-analytics-results]')
  await expect(results.getByText('$45', { exact: true }).first()).toBeVisible()
  await results.evaluate(node => node.dataset.fixtureMounted = 'original')
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let trackWeek!: () => void
  const weekStarted = new Promise<void>(resolve => { trackWeek = resolve })
  let markCompleted!: () => void
  const weekCompleted = new Promise<void>(resolve => { markCompleted = resolve })
  await page.route('**/rest/v1/orders?*', async route => {
    const start = new URL(route.request().url()).searchParams.get('created_at')
    if (!start || Date.parse(start.slice(4)) < now - 10 * 86_400_000) return route.fallback()
    trackWeek()
    await gate
    await route.fallback()
    markCompleted()
  })
  try {
    await page.getByRole('button', { name: 'Неделя', exact: true }).click()
    await weekStarted
    await expect(results).toHaveAttribute('aria-busy', 'true')
    await expect(results).toHaveAttribute('inert', '')
    await expect(results).toHaveAttribute('data-fixture-mounted', 'original')
    await expect(page.getByText('Данные обновляются…', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Год', exact: true }).click()
    await expect(results.getByText('$107', { exact: true }).first()).toBeVisible()
  } finally {
    release()
  }
  await weekCompleted
  await expect(results.getByText('$107', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Год', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Месяц', exact: true }).click()
  await expect(results).toHaveAttribute('aria-busy', 'false')
  await expect(results).toHaveAttribute('data-fixture-mounted', 'original')
  await expect(results.getByText('$45', { exact: true }).first()).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-admin-motion', /.+/)
})

test('Dashboard refresh owns a stable button and keeps timestamps out of the stats layout', async ({ page, harness }) => {
  await page.goto(ADMIN)
  const stats = page.locator('[data-dashboard-stats]')
  const button = page.getByRole('button', { name: 'Обновить', exact: true })
  await expect(stats).toBeVisible()
  const top = (await stats.boundingBox())!.y
  const island = page.locator('[data-admin-island]')
  if (page.viewportSize()!.width >= 768) {
    const box = (await island.boundingBox())!
    expect(top - box.y - box.height).toBeGreaterThanOrEqual(16)
    expect(top - box.y - box.height).toBeLessThanOrEqual(21)
  }
  const btnBox = await button.boundingBox()
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let reads = 0
  await page.route('**/rest/v1/orders?*', async route => {
    if (!new URL(route.request().url()).searchParams.get('select')?.startsWith('*')) return route.fallback()
    reads++
    await gate
    return route.fallback()
  })
  try {
    await button.click()
    await expect(button).toHaveAttribute('aria-busy', 'true')
    await expect(button).toHaveAttribute('aria-disabled', 'true')
    await expect(button.locator('svg')).toHaveClass(/animate-spin/)
    await button.evaluate(element => (element as HTMLElement).click())
    await expect.poll(() => reads).toBe(1)
    await expect(stats).toBeVisible()
    expect((await stats.boundingBox())!.y).toBe(top)
    await expect(page.getByText('Данные обновляются…', { exact: true })).toHaveCount(0)
    await expect(page.locator('#dashboard-refresh-info')).toHaveCSS('opacity', '1')
  } finally {
    release()
  }
  await expect(button).toHaveAttribute('data-dashboard-refresh', 'success')
  await expect(button.locator('svg')).toHaveClass(/dashboard-refresh-success/)
  await expect(button).toHaveAttribute('data-dashboard-refresh', 'idle')
  expect(await button.boundingBox()).toEqual(btnBox)
  expect((await stats.boundingBox())!.y).toBe(top)
  expect(reads).toBe(1)
  await expect(page.locator('#dashboard-refresh-info')).toContainText('Последнее обновление:')
  await expect(page.getByText(/^Обновлено:/)).toHaveCount(0)
  expect(harness.errors).toEqual([])
})
