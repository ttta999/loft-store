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
  const transition = async (destination: string, direction: string, button: () => Promise<void>) => {
    await button()
    await expect(page).toHaveURL(ADMIN + destination)
    directions.push(direction)
    await expect(root).toHaveAttribute('data-test-directions', directions.join(','))
    await expect(root).not.toHaveAttribute('data-admin-motion', /.+/)
  }
  const open = (path: string) => transition(path, 'forward', () => page.locator(`[data-admin-card="${path}"]`).click())
  const back = (path: string) => transition(path, 'back', () => page.goBack().then(() => {}))
  for (const path of ['/orders', '/china', '/refunds', '/analytics', '/campaigns']) {
    await open(path)
    await back('/')
  }
  await open('/catalog')
  for (const path of ['/products', '/categories', '/brands', '/size-charts']) {
    await open(path)
    await back('/catalog')
  }
  await back('/')
  await open('/settings')
  for (const section of ['payments', 'prices', 'sale', 'reminders', 'theme']) {
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
      await expect(image.locator('..')).toHaveCSS('background-color', 'rgb(146, 146, 146)')
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
