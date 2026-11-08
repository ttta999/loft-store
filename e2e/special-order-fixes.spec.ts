import { test, expect, STORE, ADMIN } from './fixture'

test('спецзаказ: Готово возвращает на главную, повторный вход открывает пустую форму', async ({ page }) => {
  await page.goto(STORE + '/china')
  await page.getByPlaceholder('Например: Zegna Triple Stitch').fill('Zegna Triple Stitch')
  await page.getByRole('button', { name: 'Отправить заявку', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Заявка отправлена!', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Новый спецзаказ', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Готово', exact: true }).click()
  await expect(page).toHaveURL(STORE + '/')
  await page.getByRole('button', { name: 'Спецзаказ', exact: true }).click()
  await expect(page.getByPlaceholder('Например: Zegna Triple Stitch')).toHaveValue('')
})

test('колокольчик показывает спецзаказ, сохраняет непрочитанное после возврата и ведёт в спецзаказы', async ({ page, harness }) => {
  harness.db.orders = []
  await page.goto(ADMIN)
  const bell = page.getByTitle('Уведомления о новых заказах и спецзаказах')
  await expect(bell.locator('[data-notification-count]')).toHaveText('1')
  await bell.click()
  await page.getByRole('button', { name: /Спецзаказ №3001/ }).click()
  await expect(page).toHaveURL(ADMIN + '/china')
  await page.locator('.sticky.top-0 button:has(svg.lucide-arrow-left)').first().click()
  await expect(bell.locator('[data-notification-count]')).toHaveText('1')
  await bell.click()
  await page.getByRole('button', { name: 'Отметить все прочитанными' }).click()
  await expect(bell.locator('[data-notification-count]')).toHaveCount(0)
  await page.reload()
  await expect(bell.locator('[data-notification-count]')).toHaveCount(0)
  harness.db.china_requests.push({ ...harness.db.china_requests[0], id: 3002, created_at: new Date(Date.now() + 1000).toISOString() })
  await page.clock.install()
  await page.clock.fastForward(31000)
  await expect(bell.locator('[data-notification-count]')).toHaveText('1')
  await bell.click()
  await expect(page.getByRole('button', { name: /Спецзаказ №3002/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Спецзаказ №3001/ })).toHaveCount(0)
})

test('колокольчик суммирует заказ и спецзаказ с одинаковым номером без потери строки', async ({ page, harness }) => {
  harness.db.china_requests[0].id = harness.db.orders[0].id
  await page.goto(ADMIN)
  const bell = page.getByTitle('Уведомления о новых заказах и спецзаказах')
  await expect(bell.locator('[data-notification-count]')).toHaveText('2')
  await bell.click()
  await expect(page.getByRole('button', { name: /^Заказ №1001/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Спецзаказ №1001/ })).toBeVisible()
})

test('оценка $100 в админке и приложении пересчитывается по одному курсу магазина', async ({ page, harness, context }) => {
  harness.db.settings.find(row => row.key === 'exchange_rate')!.value = { rate: 11910.62, version: 7 }
  await page.goto(ADMIN + '/china')
  await page.getByRole('button', { name: /Спецзаказ №3001/ }).click()
  await page.getByRole('button', { name: 'Оценён', exact: true }).click()
  await page.getByPlaceholder('200').fill('100')
  await page.getByRole('button', { name: 'Отправить', exact: true }).click()
  await expect.poll(() => harness.db.china_requests[0].manager_price).toBe(100)
  await expect(page.getByText('$100 ≈ 1 191 062 сум', { exact: true })).toBeVisible()
  await expect(page.getByText(/1 210 000/)).toHaveCount(0)
  const client = await context.newPage()
  await client.goto(STORE + '/profile?section=china')
  await expect(client.getByText('1,191,062 сум', { exact: true })).toBeVisible()
  await client.locator('[data-profile-link="request:3001"]').click()
  await expect(client.locator('.loft-detail').getByText('1,191,062 сум', { exact: true })).toBeVisible()
})


test('при недоступном курсе админка сохраняет оценку в USD и не подставляет 12100', async ({ page, harness }) => {
  Object.assign(harness.db.china_requests[0], { status: 'Оценён', manager_price: 100 })
  harness.failTable = 'settings'
  await page.goto(ADMIN + '/china')
  const row = page.getByRole('button', { name: /Спецзаказ №3001/ })
  await expect(row).toBeVisible({ timeout: 15000 })
  await expect(row).toContainText('$100')
  await expect(page.getByText(/1 210 000/)).toHaveCount(0)
})
