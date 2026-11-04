import { test, expect, STORE, productId } from './fixture'

test('панель Итого остаётся у нижнего края на каждом кадре открытия непустой корзины', async ({ page }) => {
  await page.goto(`${STORE}/product/${productId}`)
  await page.getByRole('button', { name: /Размер Выберите размер/ }).click()
  await page.getByRole('button', { name: '42', exact: true }).click()
  await page.getByRole('button', { name: /В корзину/ }).click()
  await expect(page.getByRole('button', { name: /Добавлено/ })).toBeVisible()
  await page.goto(STORE)
  for (let repeat = 0; repeat < 3; repeat++) {
    await page.evaluate(() => {
      (window as any).summaryFrames = []
      const observer = new MutationObserver(() => {
        const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Оформить заказ'))
        const fixed = button?.closest('.fixed')
        if (!fixed) return
        observer.disconnect()
        const sample = () => {
          const frames = (window as any).summaryFrames
          frames.push({ bottom: fixed.getBoundingClientRect().bottom, viewport: innerHeight })
          if (frames.length < 22) requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      observer.observe(document.getElementById('root')!, { childList: true, subtree: true })
    })
    await page.getByRole('button', { name: /Корзина$/ }).click()
    await expect.poll(() => page.evaluate(() => (window as any).summaryFrames.length)).toBe(22)
    const frames = await page.evaluate(() => (window as any).summaryFrames as { bottom: number; viewport: number }[])
    expect(Math.max(...frames.map(frame => Math.abs(frame.bottom - frame.viewport)))).toBeLessThan(0.5)
    await page.getByRole('button', { name: 'Главная', exact: true }).click()
    await expect(page.getByText('Что ищете сегодня?', { exact: true })).toBeVisible()
  }
})

test('при возврате из длинных деталей нет растянутого снимка списка, шапка и меню выше содержимого', async ({ page, harness }) => {
  const request = harness.db.china_requests[0]
  harness.db.china_requests = Array.from({ length: 14 }, (_, index) => ({ ...request, id: 5000 + index }))
  await page.goto(`${STORE}/profile?section=china`)
  const row = page.locator('[data-profile-link="request:5010"]')
  await row.scrollIntoViewIfNeeded()
  const scroll = await page.evaluate(() => scrollY)
  await page.evaluate(() => {
    const original = document.startViewTransition.bind(document)
    ;(window as any).snapshots = []
    document.startViewTransition = callback => {
      const sourceNames = Array.from(document.querySelectorAll<HTMLElement>('[style*=view-transition-name]')).map(element => element.style.viewTransitionName)
      const transition = original(callback)
      ;(window as any).lastTransition = transition
      transition.ready.then(() => {
        const style = (name: string) => getComputedStyle(document.documentElement, `::view-transition-group(${name})`)
        ;(window as any).snapshots.push({ sourceNames, oldContent: getComputedStyle(document.documentElement, '::view-transition-old(loft-content)').display,
          headerAnimation: style('loft-static-header').animationName, navAnimation: style('loft-static-navigation').animationName,
          navLayer: Number(style('loft-static-navigation').zIndex), contentLayer: Number(style('loft-profile-surface').zIndex),
          textWidth: Number.parseFloat(getComputedStyle(document.documentElement, '::view-transition-new(loft-profile-surface)').width),
          blend: getComputedStyle(document.documentElement, '::view-transition-new(loft-profile-surface)').mixBlendMode,
          targetWidth: document.querySelector('[style*="loft-profile-surface"]')!.getBoundingClientRect().width })
      }).catch(() => {})
      return transition
    }
  })
  for (let repeat = 0; repeat < 3; repeat++) {
    await row.click()
    await expect(page.locator('.loft-detail')).toBeVisible()
    await page.evaluate(() => (window as any).lastTransition.finished)
    await page.goBack()
    await expect(page.locator('.loft-detail')).toHaveCount(0)
    if (repeat === 0) {
      await page.evaluate(async () => {
        await (window as any).lastTransition.ready
        for (const animation of document.getAnimations()) {
          if (animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity) { animation.pause(); animation.currentTime = 170 }
        }
      })
      const path = test.info().outputPath('back-midpoint.png')
      await page.screenshot({ path })
      await test.info().attach('Возврат: содержимое не растягивается, меню остаётся сверху', { path, contentType: 'image/png' })
      await page.evaluate(() => { for (const animation of document.getAnimations()) if (animation.playState === 'paused') animation.play() })
    }
    await page.evaluate(() => (window as any).lastTransition.finished)
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    await expect(row).toBeInViewport()
  }
  const records = await page.evaluate(() => (window as any).snapshots as any[])
  expect(records).toHaveLength(6)
  for (const record of records) {
    expect(record.sourceNames).not.toContain('loft-content')
    expect(record.sourceNames).not.toContain('loft-static-header')
    expect(record.sourceNames).not.toContain('loft-static-navigation')
    expect(record.oldContent).toBe('none')
    expect(record.headerAnimation).toBe('none')
    expect(record.navAnimation).toBe('none')
    expect(record.navLayer).toBeGreaterThan(record.contentLayer)
    expect(Math.abs(record.textWidth - record.targetWidth)).toBeLessThan(1)
    expect(record.blend).toBe('normal')
  }
  await expect(page.locator('[data-loft-chrome]')).toHaveCount(0)
})

test('поздняя загрузка фото спецзаказа резервирует место и плавно уточняет пропорции', async ({ page, harness }) => {
  harness.db.china_requests[0].image_url = STORE + '/slow-request.svg'
  let release!: () => void
  const hold = new Promise<void>(resolve => { release = resolve })
  await page.route('**/slow-request.svg', async route => {
    await hold
    await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#c9a961"/></svg>' })
  })
  await page.goto(`${STORE}/profile?section=china`)
  await page.locator('[data-profile-link="request:3001"]').click()
  const photo = page.locator('[data-intrinsic-image]')
  await expect(photo).toBeVisible()
  const reserved = (await photo.boundingBox())!
  expect(reserved.height).toBeGreaterThan(100)
  await page.evaluate(() => {
    (window as any).photoHeights = []
    const image = document.querySelector('[data-intrinsic-image]')!
    const sample = () => {
      const frames = (window as any).photoHeights
      frames.push(image.getBoundingClientRect().height)
      if (frames.length < 60) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  release()
  await expect.poll(() => photo.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(600)
  await expect.poll(async () => Math.abs((await photo.boundingBox())!.height - ((reserved.width - 2) / 2 + 2))).toBeLessThan(1)
  const heights = await page.evaluate(() => (window as any).photoHeights as number[])
  expect(heights.some(height => height < reserved.height - 3 && height > (reserved.width - 2) / 2 + 5)).toBe(true)
  expect(Math.max(...heights.slice(1).map((height, index) => Math.abs(height - heights[index])))).toBeLessThan(reserved.height * 0.3)
  await page.goBack()
  await expect(page.locator('.loft-detail')).toHaveCount(0)
  await page.locator('[data-profile-link="request:3001"]').click()
  await expect(photo).toBeVisible()
  const cached = await photo.evaluate(async element => {
    const values: number[] = []
    for (let i = 0; i < 25; i++) { await new Promise(requestAnimationFrame); values.push(element.getBoundingClientRect().height) }
    return values
  })
  expect(Math.max(...cached) - Math.min(...cached)).toBeLessThan(2)
})

test('возврат сохраняет фактическую прокрутку, даже если событие scroll ещё не обработано', async ({ page }) => {
  await page.goto(STORE)
  const card = page.locator('[data-product-card]').last()
  await expect(card).toBeVisible()
  await page.evaluate(() => { window.addEventListener('scroll', event => event.stopImmediatePropagation(), true) })
  await card.scrollIntoViewIfNeeded()
  const scroll = await page.evaluate(() => scrollY)
  expect(scroll).toBeGreaterThan(100)
  await card.click()
  await expect(page.locator('[data-product-hero]')).toBeVisible()
  await page.goBack()
  await expect(card).toBeVisible()
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll)
  await expect(card).toBeInViewport()
})
