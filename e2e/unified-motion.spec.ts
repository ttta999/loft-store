import { test, expect, STORE, productId } from './fixture'
import type { Page } from '@playwright/test'

async function track(page: Page) {
  await page.evaluate(() => {
    const original = document.startViewTransition.bind(document)
    ;(window as any).motionRecords = []
    window.addEventListener('loft:tabs-start', ((event: CustomEvent) => {
      const { direction, animations, finished } = event.detail
      ;(window as any).motionRecords.push({ mode: 'tabs', direction: String(direction), names: ['live-tab-content'] })
      ;(window as any).motionTransition = { ready: Promise.resolve(), finished }
      ;(window as any).tabAnimations = animations
    }) as EventListener)
    document.startViewTransition = callback => {
      const record: any = {}; (window as any).motionRecords.push(record)
      const transition = original(callback); (window as any).motionTransition = transition
      transition.ready.then(() => {
        record.mode = document.documentElement.dataset.loftMotion
        record.direction = document.documentElement.style.getPropertyValue('--loft-tab-direction')
        record.names = Array.from(document.querySelectorAll<HTMLElement>('[style*=view-transition-name]')).map(element => element.style.viewTransitionName)
      }).catch((error: Error) => { record.error = error.message })
      return transition
    }
  })
}
async function done(page: Page, mode: string) {
  await page.evaluate(() => (window as any).motionTransition.finished)
  const record = await page.evaluate(() => (window as any).motionRecords.at(-1))
  expect(record.error).toBeUndefined()
  expect(record.mode).toBe(mode)
  return record
}
async function cart(page: Page) {
  await page.goto(`${STORE}/product/${productId}`)
  await page.getByRole('button', { name: /Размер Выберите размер/ }).click()
  await page.getByRole('button', { name: '42', exact: true }).click()
  await page.getByRole('button', { name: /В корзину/ }).click()
  await expect(page.getByRole('button', { name: /Добавлено/ })).toBeVisible()
  await page.goto(`${STORE}/cart`)
}

test('категория и подкатегория раскрываются как история заказов и возвращаются в исходную строку', async ({ page }) => {
  await page.goto(STORE)
  await expect(page.locator('[data-surface-link="category:shoes"]')).toBeVisible()
  await track(page)
  await page.locator('[data-surface-link="category:shoes"]').click()
  await expect(page.locator('[data-surface="category:shoes"]')).toBeVisible()
  await done(page, 'profile')
  await page.locator('[data-surface-link="catalog:shoes:sneakers"]').click()
  await expect(page.locator('[data-surface="catalog:shoes:sneakers"]')).toBeVisible()
  await done(page, 'profile')
  await page.goBack()
  await expect(page.locator('[data-surface="category:shoes"]')).toBeVisible()
  await done(page, 'profile')
  await page.goBack()
  await expect(page.locator('[data-surface-link="category:shoes"]')).toBeVisible()
  await done(page, 'profile')
})

test('бренды, включая смену параметра URL, раскрываются и закрываются одним способом', async ({ page }) => {
  await page.goto(STORE)
  await track(page)
  await page.locator('[data-surface-link="brands"]').click()
  await expect(page.locator('[data-surface="brands"]')).toBeVisible()
  await done(page, 'profile')
  const row = page.locator('[data-surface-link^="brand:"]').first()
  const key = await row.getAttribute('data-surface-link')
  await row.click()
  await expect(page.locator(`[data-surface="${key}"]`)).toBeVisible()
  await done(page, 'profile')
  await page.goBack()
  await expect(row).toBeVisible()
  await done(page, 'profile')
  await page.goBack()
  await expect(page.locator('[data-surface-link="brands"]')).toBeVisible()
  await done(page, 'profile')
})

for (const sort of ['sale', 'newest', 'popular']) {
  test(`главная / ${sort}: весь раздел раскрывается из своего заголовка`, async ({ page, harness }) => {
    harness.db.settings.find(row => row.key === 'sale_mode_enabled')!.value.enabled = true
    await page.goto(STORE)
    const row = page.locator(`[data-surface-link="products:${sort}"]`)
    await row.scrollIntoViewIfNeeded()
    await track(page)
    await row.getByRole('button').click()
    await expect(page.locator(`[data-surface="products:${sort}"]`)).toBeVisible()
    await done(page, 'profile')
    await page.goBack()
    await expect(row).toBeVisible()
    await done(page, 'profile')
    await expect(row).toBeInViewport()
  })
}

test('поиск раскрывается из круглой кнопки и закрывается обратно', async ({ page }) => {
  await page.goto(STORE)
  await track(page)
  await page.locator('[data-surface-link="search"]').click()
  await expect(page.locator('[data-surface="search"]')).toBeVisible()
  await done(page, 'profile')
  const input = page.getByPlaceholder('Поиск по названию...')
  await input.fill('кроссовки')
  await expect(page).toHaveURL(/q=/)
  await page.getByRole('button', { name: 'Очистить', exact: true }).click()
  await expect(input).toHaveValue('')
  await expect(page).toHaveURL(/\/search$/)
  await input.fill('кроссовки')
  await expect(page).toHaveURL(/q=/)
  await page.goBack()
  await expect(page.locator('[data-surface-link="search"]')).toBeVisible()
  await done(page, 'profile')
})

test('вкладки движутся на ширину экрана в правильную сторону; меню неподвижно', async ({ page }) => {
  await page.goto(STORE)
  await track(page)
  const nav = (await page.locator('.loft-navigation').boundingBox())!
  for (const [label, direction] of [['Корзина', 1], ['Спецзаказ', 1], ['Профиль', 1], ['Корзина', -1], ['Главная', -1]] as const) {
    const count = await page.evaluate(() => (window as any).motionRecords.length)
    await page.getByRole('button', { name: label, exact: true }).click()
    await expect.poll(() => page.evaluate(() => (window as any).motionRecords.length)).toBe(count + 1)
    await expect.poll(() => page.evaluate(() => (window as any).motionRecords.at(-1)?.mode)).toBe('tabs')
    const record = await page.evaluate(() => (window as any).motionRecords.at(-1))
    expect(record.direction).toBe(String(direction))
    expect(record.names).toContain('live-tab-content')
    if (label === 'Корзина' && direction === 1) {
      await page.evaluate(async () => {
        await (window as any).motionTransition.ready
        await new Promise(requestAnimationFrame)
        await new Promise(requestAnimationFrame)
        for (const animation of (window as any).tabAnimations as Animation[]) { animation.playbackRate = 0.01; animation.currentTime = 170 }
      })
      const motion = await page.evaluate(() => ({
        incoming: parseFloat(getComputedStyle(document.querySelector('[data-tab-incoming]')!).translate),
        outgoing: parseFloat(getComputedStyle(document.querySelector('[data-tab-outgoing]')!).translate),
      }))
      expect(motion.incoming).toBeGreaterThan(0)
      expect(motion.outgoing).toBeLessThan(0)
      const path = test.info().outputPath('tabs-midpoint.png')
      await page.screenshot({ path })
      await test.info().attach('Горизонтальное пролистывание: промежуточный кадр', { path, contentType: 'image/png' })
      await page.evaluate(() => { for (const animation of (window as any).tabAnimations as Animation[]) if (animation.playbackRate === 0.01) animation.playbackRate = 1 })
    }
    const navNow = (await page.locator('.loft-navigation').boundingBox())!
    expect(Math.abs(navNow.y - nav.y)).toBeLessThan(0.5)
    await done(page, 'tabs')
    await expect(page.locator('[data-tab-incoming], [data-tab-outgoing]')).toHaveCount(0)
  }
})

test('выбор размера и оформление раскрываются из кнопки; Back закрывает с сохранением прокрутки', async ({ page }) => {
  await cart(page)
  await page.getByRole('button', { name: 'Оформить заказ', exact: true }).click()
  const dialog = page.locator('[data-surface-dialog="checkout"]')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveCSS('transform', 'none')
  await expect.poll(() => page.evaluate(() => typeof (window as any).telegramBack)).toBe('function')
  await page.evaluate(() => (window as any).telegramBack())
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  await expect(page).toHaveURL(`${STORE}/cart`)
})

test('этапы оплаты сохраняют фиксированную нижнюю панель во время раскрытия', async ({ page, harness }) => {
  await cart(page)
  await page.getByRole('button', { name: 'Оформить заказ', exact: true }).click()
  await page.getByPlaceholder('Ваше имя', { exact: true }).fill('Тестовый покупатель')
  await page.getByPlaceholder('+998 XX XXX XX XX', { exact: true }).fill('+998901234567')
  await page.getByRole('button', { name: 'Самовывоз', exact: true }).click()
  await page.getByRole('button', { name: 'Перейти к оплате', exact: true }).click()
  const dialog = page.locator('[data-surface-dialog="checkout"][data-dialog-stage="payment"]')
  await expect(dialog).toBeVisible()
  const deltas = await dialog.evaluate(async element => {
    const footer = element.querySelector<HTMLElement>('.fixed')!
    const result: number[] = []
    for (let i = 0; i < 24; i++) { await new Promise(requestAnimationFrame); result.push(Math.abs(footer.getBoundingClientRect().bottom - innerHeight)) }
    return result
  })
  expect(Math.max(...deltas)).toBeLessThan(0.5)
  expect(harness.calls.filter(call => call.body?.action === 'createOrder')).toHaveLength(1)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  await expect(page.locator('[data-dialog-stage="form"]')).toBeVisible()
})

test('изменение избранного не пересоздаёт заголовки и фотографии соседних карточек на главной', async ({ page }) => {
  await page.goto(STORE)
  const heading = page.getByRole('heading', { name: 'Новые товары', exact: true })
  await expect(heading).toBeVisible()
  await heading.evaluate(element => { (window as any).homeHeading = element })
  const card = page.locator('[data-product-card]').first()
  await card.locator('button').click()
  await expect(card.locator('svg.lucide-heart')).toHaveClass(/fill-/)
  expect(await heading.evaluate(element => element === (window as any).homeHeading && element.isConnected)).toBe(true)
})
