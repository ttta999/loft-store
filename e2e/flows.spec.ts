import { test, expect, STORE, ADMIN, productId } from './fixture'

test('магазин: каталог → карточка → размер → корзина, сохранение после перезагрузки', async ({ page, harness }) => {
  await page.goto(STORE)
  await expect(page.getByText('Тестовые кроссовки', { exact: true }).first()).toBeVisible()
  await page.goto(`${STORE}/product/${productId}`)
  await page.getByRole('button', { name: /Размер Выберите размер/ }).click()
  await expect(page.getByRole('button', { name: '42', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '42', exact: true }).click()
  await page.getByRole('button', { name: /В корзину|Добавить в корзину/ }).click()
  await expect(page.getByText('Товар добавлен в корзину!', { exact: true })).toBeVisible()
  await page.goto(`${STORE}/cart`)
  await expect(page.getByText('Тестовые кроссовки', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Тестовые кроссовки', { exact: true })).toBeVisible()
  expect(harness.calls.some(c => c.path.includes('product_variants'))).toBeTruthy()
})

test('админка: защищённые страницы, аналитика и фото топ-товара', async ({ page, harness }) => {
  harness.db.orders[0].status = 'Доставлен'
  harness.db.orders[0].payment_status = 'paid'
  harness.db.orders[0].paid_at = new Date().toISOString()
  await page.goto(ADMIN)
  await expect(page.getByText(/Панель управления|Главная панель/).first()).toBeVisible()
  await page.goto(`${ADMIN}/analytics`)
  await expect(page.getByText('Тестовые кроссовки', { exact: true })).toBeVisible()
  const photo = page.getByRole('img', { name: 'Тестовые кроссовки', exact: true })
  await expect(photo).toBeVisible()
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
})

test('неоплаченные и отменённые заказы не становятся подтверждённой выручкой', async ({ page, harness }) => {
  const unpaid = harness.db.orders[0]
  harness.db.orders.push({ ...unpaid, id: 1002, status: 'Отменён', payment_status: 'paid', paid_at: new Date().toISOString() })
  await page.goto(`${ADMIN}/analytics`)
  await expect(page.getByText('$0', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Нет данных о продажах', { exact: true })).toBeVisible()
  await page.goto(ADMIN)
  await expect(page.getByText('$0', { exact: true })).toBeVisible()
})

async function addToCart(page: import('@playwright/test').Page) {
  await page.goto(`${STORE}/product/${productId}`)
  await page.getByRole('button', { name: /Размер Выберите размер/ }).click()
  await page.getByRole('button', { name: '42', exact: true }).click()
  await page.getByRole('button', { name: 'В корзину', exact: true }).click()
  await expect(page.getByText('Товар добавлен в корзину!', { exact: true })).toBeVisible()
  await page.goto(`${STORE}/cart`)
}
async function checkout(page: import('@playwright/test').Page) {
  await addToCart(page)
  await page.getByRole('button', { name: 'Оформить заказ', exact: true }).click()
  await page.getByPlaceholder('Ваше имя', { exact: true }).fill('Тестовый покупатель')
  await page.getByPlaceholder('+998 XX XXX XX XX', { exact: true }).fill('+998901234567')
  await page.getByRole('button', { name: 'Самовывоз', exact: true }).click()
}

test('корзина: изменение количества, нижняя граница и удаление', async ({ page }) => {
  await addToCart(page)
  await page.getByRole('button', { name: 'Увеличить количество', exact: true }).click()
  await page.getByRole('button', { name: 'Уменьшить количество', exact: true }).click()
  await page.getByRole('button', { name: 'Уменьшить количество', exact: true }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('loft-store')!).state.cart[0].quantity)).toBe(1)
  await page.getByRole('button', { name: 'Удалить из корзины', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Оформить заказ', exact: true })).toHaveCount(0)
})

test('оформление с оплатой при получении создаёт заказ и очищает корзину', async ({ page, harness }) => {
  await checkout(page)
  await page.getByRole('radio', { name: 'Оплата при получении', exact: true }).check()
  await page.getByRole('button', { name: 'Подтвердить заказ', exact: true }).click()
  await expect(page.getByText('Заказ оформлен!', { exact: true })).toBeVisible()
  const order = harness.calls.find(c => c.body?.action === 'createOrder')!.body.order
  expect(order.payment_method).toBe('upon_receipt'); expect(order.delivery_method).toBe('pickup')
  expect(order.total_price_uzs).toBe(1200000)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('loft-store')!).state.cart)).toHaveLength(0)
})

test('ошибка оформления сохраняет корзину и показывает понятное уведомление', async ({ page, harness }) => {
  await checkout(page)
  harness.failAction = 'createOrder'
  await page.getByRole('button', { name: 'Перейти к оплате', exact: true }).click()
  await expect(page.getByText(/Тестовая ошибка сервера/)).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('loft-store')!).state.cart)).toHaveLength(1)
})

test('некорректный телефон не отправляет заказ', async ({ page, harness }) => {
  await checkout(page)
  await page.getByPlaceholder('+998 XX XXX XX XX', { exact: true }).fill('+99812')
  await page.getByRole('button', { name: 'Перейти к оплате', exact: true }).click()
  await expect(page.getByText(/Телефон должен быть в формате/)).toBeVisible()
  expect(harness.calls.filter(c => c.body?.action === 'createOrder')).toHaveLength(0)
})

test('избранное сохраняется, поиск находит товар и показывает пустой результат', async ({ page }) => {
  await page.goto(`${STORE}/product/${productId}`)
  await page.getByRole('button', { name: 'В избранное', exact: true }).click()
  await page.goto(`${STORE}/favorites`)
  await expect(page.getByText('Тестовые кроссовки', { exact: true })).toBeVisible()
  await page.goto(`${STORE}/search`)
  await page.getByPlaceholder('Поиск по названию...', { exact: true }).fill('кроссовки')
  await expect(page.getByText('Тестовые кроссовки', { exact: true })).toBeVisible()
  await page.getByPlaceholder('Поиск по названию...', { exact: true }).fill('товар-которого-нет')
  await expect(page.getByText('Тестовые кроссовки', { exact: true })).toHaveCount(0)
})

test('тема сохраняется в магазине и в админке после перезагрузки', async ({ page }) => {
  for (const url of [`${STORE}/profile?section=settings`, `${ADMIN}/settings`]) {
    await page.goto(url)
    await page.getByRole('button', { name: 'Тёмная', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('button', { name: 'Светлая', exact: true }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  }
})

test('пароль не завершает вход: неверный MFA-код отклоняется, верный открывает админку', async ({ page }) => {
  await page.goto(`${ADMIN}/login`)
  await page.evaluate(() => localStorage.removeItem('sb-fixture-auth-token'))
  await page.getByPlaceholder('admin@loft-store.uz').fill('admin@example.test')
  await page.locator('input[type=password]').fill('fixture-password')
  await page.getByRole('button', { name: /Войти/ }).click()
  const code = page.getByRole('textbox', { name: 'Код двухфакторного входа', exact: true })
  await expect(code).toBeVisible()
  await code.fill('000000')
  await page.getByRole('button', { name: /Подтвердить/ }).click()
  await expect(code).toBeVisible()
  await code.fill('123456')
  await page.getByRole('button', { name: /Подтвердить/ }).click()
  await expect(page).toHaveURL(ADMIN + '/')
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await expect(page).toHaveURL(ADMIN + '/login')
  await page.goto(`${ADMIN}/orders`)
  await expect(page).toHaveURL(ADMIN + '/login')
})

test('редактирование товара в админке отражается в магазине', async ({ page, context, harness }) => {
  await page.goto(`${ADMIN}/products`)
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click()
  await page.getByPlaceholder('Например: Loro Piana Summer Walk', { exact: true }).fill('Обновлённые кроссовки')
  await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).scrollIntoViewIfNeeded()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click()
  await expect.poll(() => harness.db.products[0].name_ru).toBe('Обновлённые кроссовки')
  const buyer = await context.newPage()
  await buyer.goto(`${STORE}/product/${productId}`)
  await expect(buyer.getByRole('heading', { name: 'Обновлённые кроссовки', exact: true })).toBeVisible()
})

test('бренд: создание и удаление в админке', async ({ page, harness }) => {
  await page.goto(`${ADMIN}/brands`)
  await page.getByRole('button', { name: /Добавить/ }).first().click()
  await page.getByPlaceholder('Например: Nike', { exact: true }).fill('Новый тестовый бренд')
  await page.locator('.loft-modal').getByRole('button', { name: 'Добавить', exact: true }).click()
  await expect(page.getByText('Новый тестовый бренд', { exact: true })).toBeVisible()
  const row = page.getByText('Новый тестовый бренд', { exact: true }).locator('..').locator('..')
  page.once('dialog', dialog => dialog.accept())
  await row.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect.poll(() => harness.db.brands.some(b => b.name === 'Новый тестовый бренд')).toBe(false)
})

for (const [name, origin, routes] of [
  ['магазин', STORE, ['/', '/search', '/cart', '/china', '/profile', '/favorites', '/catalog', '/brands', '/category', '/all-products', '/privacy', '/terms']],
  ['админка', ADMIN, ['/', '/orders', '/china', '/products', '/analytics', '/settings', '/brands', '/categories']],
] as const) {
  test(`${name}: все страницы открываются без ошибок и горизонтального переполнения`, async ({ page }) => {
    for (const route of routes) {
      await page.goto(origin + route)
      await expect.poll(() => page.locator('#root').innerText()).not.toBe('')
      await page.waitForLoadState('networkidle')
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    }
  })
}

test('перевод: загрузка чека и подтверждение оплаты в админке', async ({ page, context, harness }) => {
  await checkout(page)
  await page.getByRole('button', { name: 'Перейти к оплате', exact: true }).click()
  const file = page.locator('input[type=file]')
  await expect(file).toHaveCount(1)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhKkAAAAASUVORK5CYII=', 'base64')
  await file.setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByText('Скриншот загружен', { exact: true })).toBeVisible()
  expect(harness.db.orders.find(o => o.id === 2001)?.payment_status).toBe('pending')
  const manager = await context.newPage()
  await manager.goto(`${ADMIN}/orders`)
  manager.once('dialog', dialog => dialog.accept())
  await manager.getByRole('button', { name: 'Подтвердить', exact: true }).click()
  await expect.poll(() => harness.db.orders.find(o => o.id === 2001)?.payment_status).toBe('paid')
  await expect.poll(() => harness.calls.some(c => c.path === '/api/sendNotification' && c.body.chatId === '900000001')).toBe(true)
})

test('создание спецзаказа в магазине отражается у менеджера', async ({ page, context, harness }) => {
  await page.goto(`${STORE}/china`)
  await page.getByPlaceholder('Например: Nike Air Force 1', { exact: true }).fill('Новый спецзаказ из теста')
  await page.getByPlaceholder('https://...', { exact: true }).fill('https://example.test/product')
  await page.getByRole('button', { name: 'Отправить заявку', exact: true }).click()
  await expect.poll(() => harness.db.china_requests.some(r => r.product_name === 'Новый спецзаказ из теста')).toBe(true)
  const manager = await context.newPage()
  await manager.goto(`${ADMIN}/china`)
  await expect(manager.getByRole('button', { name: /Спецзаказ №3002.*Новый спецзаказ из теста/ })).toBeVisible()
})

test('скидочный режим из админки меняет цену в магазине', async ({ page, context, harness }) => {
  await page.goto(`${ADMIN}/settings`)
  await page.getByRole('button', { name: 'Включить', exact: true }).click()
  await expect.poll(() => harness.db.settings.find(s => s.key === 'sale_mode_enabled')?.value.enabled).toBe(true)
  const buyer = await context.newPage()
  await buyer.goto(`${STORE}/product/${productId}`)
  await expect(buyer.getByText(/960[,\s]000 сум/, { exact: true })).toBeVisible()
})

test('переходы не сдвигают страницы и уважают уменьшение движения', async ({ page }) => {
  await page.goto(STORE)
  await page.evaluate(() => {
    const win = window as any; win.transitionCount = 0
    const original = document.startViewTransition.bind(document)
    document.startViewTransition = (callback: any) => { win.transitionCount++; return original(callback) }
  })
  await page.getByRole('button', { name: 'Корзина', exact: true }).click()
  await expect(page).toHaveURL(STORE + '/cart')
  await expect.poll(() => page.evaluate(() => (window as any).transitionCount)).toBe(1)
  const motion = await page.evaluate(() => { const style = getComputedStyle(document.documentElement, '::view-transition-new(root)'); return { transform: style.transform, duration: style.animationDuration } })
  expect(motion.transform).toBe('none'); expect(motion.duration).toBe('0.46s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Главная', exact: true }).click()
  await expect(page).toHaveURL(STORE + '/')
  expect(await page.evaluate(() => (window as any).transitionCount)).toBe(1)
})

test('отмена незавершённой оплаты не оставляет активный заказ', async ({ page, harness }) => {
  await checkout(page)
  await page.getByRole('button', { name: 'Перейти к оплате', exact: true }).click()
  await expect(page.locator('input[type=file]')).toHaveCount(1)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  await expect.poll(() => harness.db.orders.find(o => o.id === 2001)?.status).toBe('Отменён')
})

test('отключение категории скрывает товар в магазине, включение возвращает его', async ({ page, context, harness }) => {
  await page.goto(`${ADMIN}/categories`)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Отключить', exact: true }).first().click()
  await expect.poll(() => harness.db.categories[0].is_active).toBe(false)
  const buyer = await context.newPage()
  await buyer.goto(STORE)
  await expect.poll(() => buyer.evaluate(() => !!JSON.parse(localStorage.getItem('loft-store') || '{}').state?.productsCache)).toBe(true)
  await expect(buyer.getByText('Тестовые кроссовки', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Включить', exact: true }).first().click()
  await expect.poll(() => harness.db.categories[0].is_active).toBe(true)
  await buyer.reload()
  await expect(buyer.getByText('Тестовые кроссовки', { exact: true }).first()).toBeVisible()
})

test('смена цвета сбрасывает размер и показывает остатки выбранного цвета', async ({ page, harness }) => {
  const red = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', blue = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  harness.db.product_colors = [{id:red,product_id:productId,name_ru:'Красный',hex_code:'#ff0000',images:[],sort_order:0},{id:blue,product_id:productId,name_ru:'Синий',hex_code:'#0000ff',images:[],sort_order:1}]
  harness.db.product_variants = [{id:'red',product_id:productId,color_id:red,size_value:'42',stock:2},{id:'blue',product_id:productId,color_id:blue,size_value:'43',stock:1}]
  await page.goto(`${STORE}/product/${productId}`)
  await page.getByRole('button', { name: /Размер Выберите размер/ }).click()
  await page.getByRole('button', { name: '42', exact: true }).click()
  await page.getByRole('button', { name: 'Синий', exact: true }).click()
  await page.getByRole('button', { name: /Размер Выберите размер/ }).click()
  await expect(page.getByRole('button', { name: '42', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '43', exact: true }).click()
  await page.getByRole('button', { name: 'В корзину', exact: true }).click()
  await expect(page.getByText('Товар добавлен в корзину!', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('loft-store')!).state.cart[0].colorId)).toBe(blue)
})

test('валюта USD сохраняется и передаётся при оформлении заказа', async ({ page, harness }) => {
  await page.goto(`${STORE}/profile?section=settings`)
  await page.getByRole('button', { name: 'USD', exact: true }).click()
  await checkout(page)
  await page.getByRole('button', { name: 'Перейти к оплате', exact: true }).click()
  await expect(page.locator('input[type=file]')).toHaveCount(1)
  const order = harness.calls.find(c => c.body?.action === 'createOrder')!.body.order
  expect(order.order_currency).toBe('USD'); expect(order.total_price_usd).toBe(100)
})
