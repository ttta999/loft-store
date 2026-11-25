import { test, expect, STORE, productId } from './fixture'

for (const placement of ['sale', 'new', 'popular']) {
  test(`главная / ${placement}: нажатие фото сохраняет исходный кадр и возвращает к той же карточке`, async ({ page, harness, browserName }) => {
    // Use a landscape width where the square hero can actually meet the 70% threshold.
    const viewport = page.viewportSize()
    if (viewport && viewport.width > 900) await page.setViewportSize({ ...viewport, width: 850 })
    harness.db.settings.find(row => row.key === 'sale_mode_enabled')!.value.enabled = true
    const original = harness.db.products[0]
    harness.db.products.push(...Array.from({ length: 11 }, (_, index) => ({ ...original, id: `extra-${index}`, name_ru: `Товар ${index}`, created_at: new Date(Date.now() - (index + 1) * 86400000).toISOString() })))
    await page.goto(STORE)
    await expect(page.locator('[data-onboarding]')).toHaveCount(0)
    const card = page.locator(`[data-product-placement="${placement}:${productId}"]`)
    await expect(card).toBeVisible()
    await card.scrollIntoViewIfNeeded()
    await expect.poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    await card.evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY - 110))
    await page.evaluate(() => {
      const native = document.startViewTransition.bind(document)
      ;(window as any).productFrames = []
      // Playwright can scroll the card while positioning the pointer. Capture
      // what the user actually clicked, before the route handler runs.
      document.addEventListener('click', event => {
        const image = (event.target as Element).closest('[data-product-card]')?.querySelector('img')
        if (image) Object.assign(window, { tappedCard: { y: scrollY, top: image.getBoundingClientRect().top } })
      }, { capture: true, once: true })
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
    const tapped = await page.evaluate(() => (window as Window & { tappedCard: { y: number; top: number } }).tappedCard)
    expect(opening.error).toBeUndefined()
    expect(opening.mode).toBe('product')
    expect(opening.y).toBe(tapped.y)
    expect(Math.abs(opening.sourceTop - tapped.top)).toBeLessThan(2)
    expect(opening.sourcePlacement).toBe(`${placement}:${productId}`)
    expect(opening.sourceScale).toBe('1')
    expect(opening.header).toBe('loft-static-header')
    await page.goBack()
    await expect(card).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.lastProductReturn?.placement)).toBe(`${placement}:${productId}`)
    await page.evaluate(() => window.lastProductReturn?.finished)
    await expect(page.locator('.loft-header')).toBeVisible()
    await expect(page.locator('[data-product-return-overlay]')).toHaveCount(0)
    expect(await page.evaluate(() => scrollY)).toBe(tapped.y)
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

test('opening a cold destination uses the decoded source snapshot without waiting for decode', async ({ page }) => {
  await page.goto(STORE)
  await expect(page.locator('[data-onboarding]')).toHaveCount(0)
  const card = page.locator(`[data-product-placement="new:${productId}"] img`)
  await card.scrollIntoViewIfNeeded()
  await expect.poll(() => card.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  await page.evaluate(() => {
    const width = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth')!
    const nativeDecode = HTMLImageElement.prototype.decode
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      ...width, get() { return this.hasAttribute('data-product-hero') ? 0 : width.get!.call(this) },
    })
    HTMLImageElement.prototype.decode = function () {
      return this.hasAttribute('data-product-hero') ? new Promise(() => {}) : nativeDecode.call(this)
    }
    const nativeTransition = document.startViewTransition.bind(document)
    document.startViewTransition = callback => {
      const transition = nativeTransition(callback)
      Object.assign(window, { coldPhotoFrame: transition.ready.then(() => ({
        useSource: document.documentElement.dataset.loftOpeningSource,
        layout: document.querySelector('[data-product-hero]')?.getBoundingClientRect().width,
      })) })
      return transition
    }
  })
  await card.click()
  await expect(page.locator('html')).toHaveAttribute('data-loft-opening-source', 'true')
  const frame = await page.evaluate(() => (window as Window & {coldPhotoFrame: Promise<{ useSource: string; layout: number }>}).coldPhotoFrame)
  expect(frame.useSource).toBe('true')
  expect(frame.layout).toBeGreaterThan(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-loft-opening-source')
})
