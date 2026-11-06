import { test, expect, STORE, productId } from './fixture'

for (const placement of ['sale', 'new', 'popular']) {
  test(`главная / ${placement}: нажатие фото сохраняет исходный кадр и возвращает к той же карточке`, async ({ page, harness, browserName }) => {
    harness.db.settings.find(row => row.key === 'sale_mode_enabled')!.value.enabled = true
    const original = harness.db.products[0]
    harness.db.products.push(...Array.from({ length: 11 }, (_, index) => ({ ...original, id: `extra-${index}`, name_ru: `Товар ${index}`, created_at: new Date(Date.now() - (index + 1) * 86400000).toISOString() })))
    await page.goto(STORE)
    const card = page.locator(`[data-product-placement="${placement}:${productId}"]`)
    await expect(card).toBeVisible()
    await card.scrollIntoViewIfNeeded()
    await expect.poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    await card.evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY - 110))
    const scroll = await page.evaluate(() => scrollY)
    const image = (await card.locator('img').boundingBox())!
    await page.evaluate(() => {
      const native = document.startViewTransition.bind(document)
      ;(window as any).productFrames = []
      document.startViewTransition = callback => {
        const source = document.querySelector<HTMLElement>('[style*="loft-product-photo"]')!
        const frame: any = { y: scrollY, sourceTop: source.getBoundingClientRect().top, sourcePlacement: source.closest('[data-product-placement]')?.getAttribute('data-product-placement'), sourceScale: getComputedStyle(source.closest('[data-product-card]') || source).scale, header: document.querySelector<HTMLElement>('.loft-header')?.style.viewTransitionName }
        ;(window as any).productFrames.push(frame)
        const transition = native(callback)
        ;(window as any).productTransition = transition
        transition.ready.then(() => { frame.mode = document.documentElement.dataset.loftMotion }).catch((error: Error) => { frame.error = error.message })
        return transition
      }
    })
    await card.locator('img').click({ position: { x: 30, y: 35 } })
    await expect(page.locator('[data-product-hero]')).toBeVisible()
    // WebKit's headless capture omits live view-transition layers when their
    // timeline is manually seeked. Keep the visual artifact in Chromium.
    if (placement === 'new' && browserName === 'chromium') {
      await page.evaluate(async () => {
        await (window as any).productTransition.ready
        for (const animation of document.getAnimations()) {
          if (animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity) {
            animation.playbackRate = 0.01
            animation.currentTime = 170
          }
        }
      })
      const path = test.info().outputPath('home-product-midpoint.png')
      await page.screenshot({ path })
      await test.info().attach('Главная: общая фотография на середине открытия', { path, contentType: 'image/png' })
      await page.evaluate(() => { for (const animation of document.getAnimations()) if (animation.playbackRate === 0.01) animation.playbackRate = 1 })
    }
    await page.evaluate(() => (window as any).productTransition.finished)
    const opening = await page.evaluate(() => (window as any).productFrames[0])
    expect(opening.error).toBeUndefined()
    expect(opening.mode).toBe('product')
    expect(opening.y).toBe(scroll)
    expect(Math.abs(opening.sourceTop - image.y)).toBeLessThan(2)
    expect(opening.sourcePlacement).toBe(`${placement}:${productId}`)
    expect(opening.sourceScale).toBe('1')
    expect(opening.header).toBe('loft-static-header')
    await page.goBack()
    await expect(card).toBeVisible()
    await page.evaluate(() => (window as any).productTransition.finished)
    const closing = await page.evaluate(() => (window as any).productFrames.at(-1))
    expect(closing.mode).toBe('product')
    expect(closing.error).toBeUndefined()
    expect(closing.header).toBe('loft-static-header')
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    await expect(card).toBeInViewport()
  })
}

test('клавиатура открывает товар, избранное не запускает переход', async ({ page }) => {
  await page.goto(STORE)
  const card = page.locator(`[data-product-placement="new:${productId}"]`)
  await card.getByRole('button').click()
  await expect(page).toHaveURL(STORE + '/')
  await card.focus()
  await card.press('Enter')
  await expect(page.locator('[data-product-hero]')).toBeVisible()
})


test('первое касание: модуль товара готовится без hover, декодирование готового фото не задерживает снимок', async ({ page }) => {
  let requested = false
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/src/pages/ProductPage.tsx*', async route => {
    requested = true
    await held
    await route.fallback()
  })
  await page.goto(STORE)
  const card = page.locator(`[data-product-placement="new:${productId}"]`)
  await expect(card).toBeVisible()
  // No hover, focus or pointerdown has taken place: warm on the home idle frame.
  await expect.poll(() => requested).toBe(true)
  await card.scrollIntoViewIfNeeded()
  await expect.poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  const scroll = await page.evaluate(() => scrollY)
  const sourceTop = (await card.locator('img').boundingBox())!.y
  await page.evaluate(() => {
    const native = document.startViewTransition.bind(document)
    const decode = HTMLImageElement.prototype.decode
    ;(window as any).redundantDecodes = 0
    HTMLImageElement.prototype.decode = function () {
      if (this.hasAttribute('data-product-hero') && this.complete && this.naturalWidth) {
        ;(window as any).redundantDecodes++
        return new Promise(() => {}) // Safari may defer a redundant decode during capture.
      }
      return decode.call(this)
    }
    document.startViewTransition = callback => {
      const image = document.querySelector<HTMLElement>('[style*="loft-product-photo"]')!
      ;(window as any).coldSource = { y: scrollY, top: image.getBoundingClientRect().top }
      const transition = native(callback)
      ;(window as any).coldTransition = transition
      return transition
    }
  })
  // Immediate touch while the cold module request is still in flight.
  await card.evaluate(element => (element as HTMLElement).click())
  expect(await page.evaluate(() => scrollY)).toBe(scroll)
  release()
  await expect(page.locator('[data-product-hero]')).toBeVisible()
  await page.evaluate(() => (window as any).coldTransition.finished)
  expect(await page.evaluate(() => (window as any).redundantDecodes)).toBe(0)
  expect(await page.evaluate(() => (window as any).coldSource)).toEqual({ y: scroll, top: sourceTop })
  await page.goBack()
  await expect(card).toBeVisible()
  await page.evaluate(() => (window as any).coldTransition.finished)
  expect(await page.evaluate(() => scrollY)).toBe(scroll)
})
