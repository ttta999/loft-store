import { test, expect, STORE, productId } from './fixture'
import type { Page } from '@playwright/test'

async function regularCart(page: Page) {
  await page.goto(`${STORE}/product/${productId}`)
  await page.locator('[data-dialog-trigger="size"]').click()
  await page.getByRole('button', { name: '42', exact: true }).click()
  await page.getByRole('button', { name: 'В корзину', exact: true }).click()
  await expect(page.getByText('Товар добавлен в корзину!', { exact: true })).toBeVisible()
}
async function checkout(page: Page) {
  await regularCart(page)
  await page.goto(STORE + '/cart')
  await page.getByRole('button', { name: 'Оформить заказ', exact: true }).click()
  await page.getByPlaceholder('Ваше имя', { exact: true }).fill('Тестовый покупатель')
  await page.getByPlaceholder('+998 XX XXX XX XX', { exact: true }).fill('+998901234567')
}

test('спецзаказ: все текстовые поля имеют безопасный для фокуса iOS размер шрифта', async ({ page }) => {
  await page.goto(STORE + '/china')
  const fields = page.locator('input:not([type=file]), textarea')
  await expect(fields).toHaveCount(4)
  for (const field of await fields.all()) {
    expect(await field.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16)
  }
})

test('смешанная корзина показывает уведомление об отдельном оформлении и сохраняет оба товара', async ({ page, harness }) => {
  Object.assign(harness.db.china_requests[0], { status: 'Оценён', manager_price: 100 })
  await regularCart(page)
  await page.goto(STORE + '/profile?section=china')
  await page.locator('[data-profile-link="request:3001"]').click()
  await page.locator('.loft-detail').getByRole('button', { name: /^Оплатить / }).click()
  await page.getByRole('button', { name: /Корзина$/ }).click()
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('loft-store')!).state.cart)
  expect(before).toHaveLength(2)
  await page.getByRole('button', { name: 'Оформить заказ', exact: true }).click()
  await expect(page.getByText(/Спецзаказ оформляется отдельно от других товаров/)).toBeVisible()
  await expect(page.locator('[data-surface-dialog="checkout"]')).toHaveCount(0)
  expect(harness.calls.filter(call => call.body?.action === 'createOrder')).toHaveLength(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('loft-store')!).state.cart)).toEqual(before)
  await page.getByRole('button', { name: 'Удалить из корзины', exact: true }).first().click()
  await page.getByRole('button', { name: 'Оформить заказ', exact: true }).click()
  await expect(page.locator('[data-surface-dialog="checkout"]')).toBeVisible()
})

test('после заказа при получении Готово сразу ведёт на главную', async ({ page, harness }) => {
  await checkout(page)
  await page.getByRole('radio', { name: 'Оплата при получении', exact: true }).check()
  await page.getByRole('button', { name: 'Подтвердить заказ', exact: true }).click()
  await expect(page.getByText('Заказ оформлен!', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Готово', exact: true }).click()
  await expect(page).toHaveURL(STORE + '/')
  await expect(page.getByText('Что ищете сегодня?', { exact: true })).toBeVisible()
  await expect(page.locator('[data-surface-dialog="checkout"]')).toHaveCount(0)
  expect(harness.calls.filter(call => call.body?.action === 'cancelOrder')).toHaveLength(0)
})

test('после загрузки чека Готово ведёт на главную и не отменяет заказ при выходе', async ({ page, harness }) => {
  await checkout(page)
  await page.getByRole('button', { name: 'Перейти к оплате', exact: true }).click()
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhKkAAAAASUVORK5CYII=', 'base64')
  await page.locator('input[type=file]').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByText('Скриншот загружен', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Готово', exact: true }).click()
  await expect(page).toHaveURL(STORE + '/')
  await expect(page.getByText('Что ищете сегодня?', { exact: true })).toBeVisible()
  await expect(page.locator('[data-surface-dialog="checkout"]')).toHaveCount(0)
  expect(harness.calls.filter(call => call.body?.action === 'cancelOrder')).toHaveLength(0)
  const order = harness.db.orders.find(order => order.id === 2001)!
  expect(order.payment_screenshot_url).toBeTruthy()
  expect(order.payment_status).toBe('pending')
  expect(order.status).not.toBe('Отменён')
})
