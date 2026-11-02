import { test, expect, STORE, productId } from './fixture'

test('фото из карточки становится фото товара, Back возвращает его в ту же карточку и сохраняет фильтр', async ({ page, harness }) => {
  const product = harness.db.products[0]
  harness.db.products = Array.from({ length: 14 }, (_, i) => ({ ...product, id: productId.slice(0, -2) + String(i).padStart(2, '0'), name_ru: `Пара ${i}` }))
  await page.goto(`${STORE}/all-products`)
  await page.getByRole('button', { name: /Фильтры/ }).click()
  await page.getByRole('button', { name: 'Обувь', exact: true }).click()
  const card = page.locator('[data-product-card]').nth(10)
  await card.scrollIntoViewIfNeeded()
  const image = card.locator('img').first()
  await expect.poll(() => image.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  const before = await image.boundingBox()
  const scroll = await page.evaluate(() => scrollY)
  await page.evaluate(() => {
    const original = document.startViewTransition.bind(document)
    document.startViewTransition = (callback: any) => { const transition = original(callback); (window as any).photoTransition = transition; transition.ready.then(() => { (window as any).readyMeta = { mode: document.documentElement.dataset.loftMotion, names: Array.from(document.querySelectorAll('[style*=view-transition]')).map(e => (e as HTMLElement).style.viewTransitionName), animation: getComputedStyle(document.documentElement,'::view-transition-group(loft-product-photo)').animationName } }); return transition }
  })
  await card.click()
  await expect(page.locator('[data-product-hero]')).toBeVisible()
  await page.evaluate(() => (window as any).photoTransition.ready)
  expect(await page.evaluate(() => (window as any).readyMeta.mode)).toBe('product')
  expect(await page.evaluate(() => getComputedStyle(document.documentElement, '::view-transition-group(loft-product-photo)').animationDuration)).toBe('0.34s')
  await test.info().attach('Фото раскрывается из карточки', { body: await page.screenshot(), contentType: 'image/png' })
  await page.evaluate(() => (window as any).photoTransition.finished)
  await page.goBack()
  await expect(card).toBeVisible()
  await page.evaluate(() => (window as any).photoTransition.finished)
  expect(await page.evaluate(() => scrollY)).toBe(scroll)
  const after = await image.boundingBox()
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(2)
  await expect(page.getByRole('button', { name: 'Обувь', exact: true })).toBeVisible()
  await expect(page.locator('[style*="loft-product-photo"]')).toHaveCount(0)
})

test('прямая ссылка не переносит фото через весь экран, галерея и панель размера закрываются обратно', async ({ page }) => {
  await page.goto(`${STORE}/product/${productId}`)
  await expect(page.locator('[data-product-hero]')).toBeVisible()
  expect(await page.locator('html').getAttribute('data-loft-motion')).toBeNull()
  await page.locator('[data-product-hero]').click()
  const gallery = page.getByRole('dialog', { name: 'Просмотр фото' })
  await expect(gallery).toBeVisible()
  await gallery.getByRole('button').first().click()
  await expect(gallery).toHaveCount(0)
  await page.getByRole('button', { name: /Размер Выберите размер/ }).click()
  await page.getByRole('button', { name: '42', exact: true }).click()
  await expect(page.getByRole('button', { name: '42', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: /В корзину/ }).click()
  await expect(page.getByRole('button', { name: /Добавлено/ })).toBeVisible()
})

for (const entry of ['home', 'catalog', 'search', 'brands', 'favorites', 'profile-favorites'] as const) {
  test(`${entry}: единая фотография открывается из списка и возвращается без снимков шапки`, async ({ page }) => {
    if (entry === 'catalog') {
      await page.goto(STORE)
      await page.getByText('Обувь', { exact: true }).click()
      await page.getByText('Все товары', { exact: true }).click()
    } else if (entry === 'favorites' || entry === 'profile-favorites') {
      await page.goto(`${STORE}/product/${productId}`)
      await page.getByRole('button', { name: 'В избранное', exact: true }).click()
      await page.goto(entry === 'favorites' ? `${STORE}/favorites` : `${STORE}/profile?section=favorites`)
    } else {
      await page.goto(entry === 'home' ? STORE : entry === 'search' ? `${STORE}/search?q=Тестовые` : `${STORE}/brands?brand=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`)
    }
    const source = page.url()
    const card = page.locator('[data-product-card]').first()
    await expect(card).toBeVisible()
    await expect.poll(() => card.locator('img').first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    await page.evaluate(() => {
      const original = document.startViewTransition.bind(document)
      document.startViewTransition = (callback: any) => {
        const transition = original(callback); (window as any).photoTransition = transition
        transition.ready.then(() => { (window as any).photoMode = document.documentElement.dataset.loftMotion }).catch(() => {})
        return transition
      }
    })
    // Favorite rows have separate image and text links.
    if (entry === 'favorites' || entry === 'profile-favorites') await card.getByRole('link').first().click()
    else await card.click()
    await expect(page.locator('[data-product-hero]')).toBeVisible()
    await page.evaluate(() => (window as any).photoTransition.finished)
    expect(await page.evaluate(() => (window as any).photoMode)).toBe('product')
    await expect(page.locator('.loft-header')).toHaveCSS('view-transition-name', 'none')
    await page.goBack()
    await expect(page).toHaveURL(source)
    await expect(card).toBeVisible()
    await page.evaluate(() => (window as any).photoTransition.finished)
    await expect(page.locator('.loft-header')).toHaveCSS('view-transition-name', 'none')
  })
}

test('самолётик и подтверждение появляются только после успешного ответа, ошибка сохраняет форму', async ({ page, harness }) => {
  await page.goto(`${STORE}/china`)
  await page.getByPlaceholder('Например: Nike Air Force 1', { exact: true }).fill('Тест полёта')
  harness.failAction = 'createRequest'
  await page.getByRole('button', { name: 'Отправить заявку', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Отправить заявку', exact: true })).toBeEnabled()
  await expect(page.locator('[data-plane-flight]')).toHaveCount(0)
  await expect(page.getByText('Заявка отправлена!', { exact: true })).toHaveCount(0)
  harness.failAction = null
  await page.getByRole('button', { name: 'Отправить заявку', exact: true }).click()
  await expect(page.getByText('Заявка отправлена!', { exact: true })).toBeVisible()
  await expect(page.locator('[data-plane-flight]')).toHaveCount(1)
  await expect(page.locator('[data-plane-flight]')).toHaveCount(0)
})

test('быстрый Back прерывает общий переход; уменьшение движения не переносит фотографию', async ({ page }) => {
  await page.goto(`${STORE}/all-products`)
  const card = page.locator('[data-product-card]').first()
  await expect(card).toBeVisible()
  await card.click()
  await page.goBack()
  await expect(page).toHaveURL(`${STORE}/all-products`)
  await expect(card).toBeVisible()
  await expect(page.locator('[style*="loft-product-photo"]')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => { document.startViewTransition = () => { throw new Error('Reduced motion must skip photo projection') } })
  await card.click()
  await expect(page.locator('[data-product-hero]')).toBeVisible()
})

test('автовыбор цвета не обрывает фотографию из карточки и не оставляет пустой кадр', async ({ page, harness }) => {
  harness.db.product_colors = [{ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', product_id: productId, name_ru: 'Красный', name_uz: 'Qizil', hex_code: '#ff0000', images: [STORE + '/fixture-product.svg?red=1'], sort_order: 0 }]
  await page.goto(`${STORE}/all-products`)
  const card = page.locator('[data-product-card]').first()
  await expect.poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  await page.evaluate(() => {
    const original = document.startViewTransition.bind(document)
    document.startViewTransition = (callback: any) => {
      const transition = original(callback); (window as any).photoTransition = transition
      transition.ready.then(() => { (window as any).photoMode = document.documentElement.dataset.loftMotion }).catch(() => {})
      return transition
    }
  })
  await card.click()
  await expect(page.locator('[data-product-hero]')).toBeVisible()
  await page.evaluate(() => (window as any).photoTransition.finished)
  expect(await page.evaluate(() => (window as any).photoMode)).toBe('product')
  await expect(page.locator('[data-product-hero]')).toHaveAttribute('src', /red=1/)
  expect(await page.locator('[data-product-hero]').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
})

test('удалённая из избранного исходная карточка даёт короткое растворение при возврате', async ({ page }) => {
  await page.goto(`${STORE}/product/${productId}`)
  await page.getByRole('button', { name: 'В избранное', exact: true }).click()
  await page.goto(`${STORE}/favorites`)
  await page.locator('[data-product-card] a').first().click()
  await expect(page.locator('[data-product-hero]')).toBeVisible()
  await page.getByRole('button', { name: 'Убрать из избранного', exact: true }).click()
  await page.goBack()
  await expect(page.getByText('Избранное пусто', { exact: true })).toBeVisible()
  await expect(page.locator('[style*="loft-product-photo"]')).toHaveCount(0)
})

test('фильтры раскрываются и закрываются с перемещением списка по высоте', async ({ page }) => {
  await page.goto(`${STORE}/all-products`)
  const toggle = page.getByRole('button', { name: /Фильтры и сортировка/ })
  const card = page.locator('[data-product-card]').first()
  await expect(card).toBeVisible()
  const before = (await card.boundingBox())!.y
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('[data-collapse]')).toBeVisible()
  await expect.poll(async () => (await card.boundingBox())!.y).toBeGreaterThan(before + 30)
  await toggle.click()
  await expect(page.locator('[data-collapse]')).toHaveCount(0)
  expect(Math.abs((await card.boundingBox())!.y - before)).toBeLessThan(2)
})

test('полноэкранное фото сохраняет пропорции, тёмную тему и прокрутку; Telegram Back закрывает фото и размер', async ({ page }) => {
  await page.goto(`${STORE}/profile?section=settings`)
  await page.getByRole('button', { name: 'Тёмная', exact: true }).click()
  await page.goto(`${STORE}/product/${productId}`)
  await expect(page.locator('html')).toHaveClass(/dark/)
  const hero = page.locator('[data-product-hero]')
  await expect.poll(() => hero.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  await page.evaluate(() => scrollTo(0, 100))
  const scroll = await page.evaluate(() => scrollY)
  const rect = (await hero.boundingBox())!
  await page.mouse.click(rect.x + rect.width / 2, Math.max(120, rect.y + 160))
  const viewer = page.getByRole('dialog', { name: 'Просмотр фото' })
  await expect(viewer).toBeVisible()
  const picture = viewer.getByRole('img')
  await expect.poll(async () => {
    const rect = (await picture.boundingBox())!
    return Math.abs(rect.width / rect.height - 1)
  }).toBeLessThan(0.01)
  await page.evaluate(() => (window as any).telegramBack())
  await expect(viewer).toHaveCount(0)
  await expect(hero).toBeVisible()
  expect(await page.evaluate(() => scrollY)).toBe(scroll)
  await page.getByRole('button', { name: /Размер Выберите размер/ }).click()
  await expect(page.getByRole('button', { name: '42', exact: true })).toBeVisible()
  await page.evaluate(() => (window as any).telegramBack())
  await expect(page.getByRole('button', { name: '42', exact: true })).toHaveCount(0)
  await expect(page).toHaveURL(`${STORE}/product/${productId}`)
})
