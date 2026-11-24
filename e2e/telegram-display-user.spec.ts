import { test, expect, STORE } from './fixture'

for (const [language, scheme, status] of [['ru', 'light', 200], ['uz', 'dark', 401]] as const) {
  test(`early Telegram name is cosmetic in ${language} ${scheme} with validation ${status}`, async ({ page, harness }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.addInitScript(language => {
      localStorage.setItem('loft-intro-v1:1111', JSON.stringify({ language, completed: true }))
      localStorage.setItem('loft-store', JSON.stringify({ state: { language, theme: 'system' }, version: 0 }))
    }, language)
    let avatarRequested = false
    await page.route('https://avatar.fixture.test/photo.png', route => {
      avatarRequested = true
      expect(route.request().headers()['referer']).toBeUndefined()
      return route.fulfill({ status: 404, body: 'fixture' })
    })
    let releaseCatalogue!: () => void
    const catalogue = new Promise<void>(resolve => { releaseCatalogue = resolve })
    await page.route(url => url.pathname === '/rest/v1/products', async route => {
      await catalogue
      await route.fallback()
    })
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/api/validateTelegram', async route => {
      expect(route.request().postDataJSON()).toEqual({ initData: 'fixture-signed-login' })
      await gate
      if (status === 401) return route.fulfill({ status, json: { error: 'fixture rejected' } })
      await route.fallback()
    })
    try {
      await page.goto(STORE + '/#fixture-display=preview')
      await expect(page.getByRole('heading', { name: language === 'ru' ? 'Привет, Preview' : 'Salom, Preview' })).toBeVisible()
      expect(harness.calls.some(call => call.path === '/rest/v1/products')).toBe(false)
      await expect.poll(() => avatarRequested).toBe(true)
      releaseCatalogue()
      await expect(page.locator('img[src*="avatar.fixture.test"]')).toHaveCount(0)
      await page.getByRole('button', { name: language === 'ru' ? 'Профиль' : 'Profil', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Preview Only' })).toBeVisible()
      await page.getByRole('button', { name: language === 'ru' ? /^Заказы/ : /^Buyurtmalar/ }).click()
      expect(harness.calls.filter(call => call.path === '/api/store')).toHaveLength(0)
      expect(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('Preview')))).toBe(false)
      const auth = page.waitForResponse(response => response.url().endsWith('/api/validateTelegram'))
      release()
      expect((await auth).status()).toBe(status)
      if (status === 200) await expect.poll(() => harness.calls.some(call => call.body?.action === 'orders')).toBe(true)
      else {
        await expect(page.getByText('Тестовый покупатель', { exact: true })).toHaveCount(0)
        expect(harness.calls.filter(call => call.path === '/api/store')).toHaveLength(0)
      }
      await expect(page.locator('html')).not.toHaveAttribute('data-loft-tab-motion', 'true')
      await page.goBack()
      await expect(page.getByRole('heading', { name: status === 200 ? 'Тестовый покупатель' : 'Profil', exact: true })).toBeVisible()
      await expect(page.getByText('@forged')).toHaveCount(0)
      if (status === 401) expect(harness.calls.filter(call => call.path === '/api/store')).toHaveLength(0)
    } finally { release(); releaseCatalogue() }
  })
}

test('a browser launch with no Telegram user shows a neutral greeting and stable avatar', async ({ page, harness }) => {
  await page.goto(STORE + '/#fixture-display=browser')
  await expect(page.getByRole('heading', { name: 'Привет!', exact: true })).toBeVisible()
  await expect(page.locator('img[referrerpolicy="no-referrer"]')).toHaveCount(0)
  expect(harness.calls.some(call => call.path === '/api/validateTelegram')).toBe(false)
})
