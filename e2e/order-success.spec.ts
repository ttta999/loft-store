import { test, expect, STORE, productId } from './fixture'

for (const exit of ['done', 'back', 'pickup'] as const) {
  test(`успешный заказ сохраняет номер: ${exit}`, async ({ page }) => {
    await page.goto(`${STORE}/product/${productId}`)
    await page.getByRole('button', { name: /Размер Выберите размер/ }).click()
    await page.getByRole('button', { name: '42', exact: true }).click()
    await page.getByRole('button', { name: 'В корзину', exact: true }).click()
    await expect(page.getByText('Товар добавлен в корзину!', { exact: true })).toBeVisible()
    await page.goto(`${STORE}/cart`)
    await page.getByRole('button', { name: 'Оформить заказ', exact: true }).click()
    await page.getByPlaceholder('Ваше имя', { exact: true }).fill('Тестовый покупатель')
    await page.getByPlaceholder('+998 XX XXX XX XX', { exact: true }).fill('+998901234567')
    if (exit === 'pickup') {
      await page.getByRole('radio', { name: 'Оплата при получении', exact: true }).check()
      await page.getByRole('button', { name: 'Подтвердить заказ', exact: true }).click()
    } else {
      await page.getByRole('button', { name: 'Перейти к оплате', exact: true }).click()
      await expect(page.getByRole('link', { name: 'Менеджер', exact: true })).toBeVisible()
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhKkAAAAASUVORK5CYII=', 'base64')
      await page.locator('input[type=file]').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: png })
      await expect(page.getByText('Скриншот загружен', { exact: true })).toBeVisible()
      if (exit === 'done') await page.getByRole('button', { name: 'Готово', exact: true }).click()
      else await page.evaluate(() => (window as any).telegramBack())
    }
    await expect(page.getByText('Заказ оформлен!', { exact: true })).toBeVisible()
    await expect(page.getByText('№2001', { exact: true })).toBeVisible()
  })
}
