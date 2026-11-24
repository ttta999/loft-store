import { test, expect, ADMIN } from './fixture'

for (const route of ['/catalog', '/settings']) {
  test(`Dashboard already has its island and cached statistics in the first frame from ${route}`, async ({ page, harness }) => {
    Object.assign(harness.db.orders[0], {
      total_price_usd: 633, payment_status: 'paid', paid_at: new Date().toISOString(), status: 'Активный',
    })
    await page.goto(ADMIN)
    await expect(page.getByText('$633', { exact: true })).toBeVisible()
    await page.locator(`[data-admin-card="${route}"]`).click()
    await expect(page.locator('html')).not.toHaveAttribute('data-admin-motion', /.+/)
    await page.clock.setFixedTime(new Date(Date.now() + 65_000))
    let releaseOrders!: () => void
    const ordersGate = new Promise<void>(resolve => { releaseOrders = resolve })
    await page.route('**/rest/v1/orders?*', async request => {
      await ordersGate
      await request.fallback()
    })
    await page.evaluate(() => {
      const start = document.startViewTransition?.bind(document)
      if (!start) return
      document.startViewTransition = callback => {
        const transition = start(callback)
        Object.assign(window, { dashboardFirstFrame: transition.ready.then(() => ({
          heading: document.querySelector('[data-admin-island] h1')?.textContent,
          oldHeader: getComputedStyle(document.documentElement, '::view-transition-old(loft-admin-header)').display,
          direction: document.documentElement.dataset.adminMotion,
        })) })
        return transition
      }
    })
    try {
      await page.locator('[data-admin-header] [data-admin-back]').click()
      await expect(page.getByRole('heading', {name: 'LOFT Админ Панель'})).toBeVisible()
      await expect(page.getByText('$633', { exact: true })).toBeVisible()
      const frame = await page.evaluate(() => (window as Window & { dashboardFirstFrame?: Promise<{
        heading?: string; oldHeader: string; direction?: string
      }> }).dashboardFirstFrame)
      if (frame) expect(frame).toEqual({ heading: 'LOFT Админ Панель', oldHeader: 'none', direction: 'back' })
      await expect(page.locator('html')).not.toHaveAttribute('data-admin-motion', /.+/)
    } finally {
      releaseOrders()
    }
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
