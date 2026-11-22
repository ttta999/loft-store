import { test, expect, STORE, productId } from './fixture'

test('a missing entry module shows a retry and reload preserves the product link', async ({ page }) => {
  await page.route('**/src/main.tsx', route => route.abort(), { times: 1 })
  await page.goto(STORE + '/product/' + productId)
  const retry = page.locator('#loft-boot-retry')
  await expect(retry).toBeVisible()
  await retry.click()
  await expect(page).toHaveURL(STORE + '/product/' + productId)
  await expect(page.getByRole('heading', { name: 'Тестовые кроссовки', exact: true })).toBeVisible()
  await expect(retry).toBeHidden()
})

test('catalog failure can be retried without revalidating Telegram or repeating writes', async ({ page, harness }) => {
  await page.route('**/rest/v1/products?**', route => route.fulfill({
    status: 503, contentType: 'application/json', body: '{"message":"fixture offline"}',
  }), { times: 1 })
  await page.goto(STORE)
  await expect(page.getByText('Не удалось загрузить товары', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(page.locator('[data-product-card]').first()).toBeVisible()
  expect(harness.calls.filter(call => call.path === '/api/validateTelegram')).toHaveLength(1)
  expect(harness.calls.filter(call => call.body?.action === 'createOrder')).toHaveLength(0)
})

test('intro paints while SDK, preferences and catalogue are still in flight', async ({ page, harness }) => {
  harness.db.preferences = [{ language: 'ru', language_source: null, onboarding_completed_at: null, addresses: [], sizes: [] }]
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  const paths = ['**/telegram-web-app.js', '**/rest/v1/products?**', '**/api/store']
  for (const path of paths) await page.route(path, async route => {
    if (path !== '**/api/store' || route.request().postDataJSON()?.action === 'preferences') await pending
    await route.fallback()
  })
  try {
    await page.goto(STORE, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-intro-language]')).toBeVisible()
  } finally { release() }
})

test('stale lazy chunks present reload after shell commit', async ({ page }) => {
  await page.goto(STORE)
  await expect(page.locator('#loft-boot')).toBeHidden()
  await page.evaluate(() => window.dispatchEvent(new Event('vite:preloadError')))
  await expect(page.locator('#loft-boot-retry')).toBeVisible()
  await page.locator('#loft-boot-retry').click()
  await expect(page.locator('[data-product-card]').first()).toBeVisible()
})

test('a stalled Telegram validation expires and the intro can retry the read', async ({ page, harness }) => {
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/validateTelegram', async route => {
    await pending
    await route.abort().catch(() => {})
  }, { times: 1 })
  const started = page.waitForRequest('**/api/validateTelegram')
  try {
    await page.goto(STORE)
    await started
    await expect(page.getByText('Не удалось проверить настройки аккаунта')).toBeVisible({ timeout: 18_000 })
    await page.getByRole('dialog').getByRole('button', { name: 'Повторить', exact: true }).click()
    await expect(page.locator('[data-onboarding]')).toHaveCount(0)
    await expect(page.getByRole('heading',{name:/Привет, Тестовый/})).toBeVisible()
    expect(harness.calls.filter(call => call.path === '/api/validateTelegram')).toHaveLength(1)
    expect(harness.calls.some(call => ['createOrder', 'language'].includes(call.body?.action))).toBe(false)
  } finally { release() }
})
