import { test, expect, STORE } from './fixture'
import type { Page } from '@playwright/test'

async function track(page: Page) {
  await page.evaluate(() => {
    const win = window as any
    win.surfaceRecords = []
    win.nativeSections = 0
    const native = document.startViewTransition.bind(document)
    document.startViewTransition = callback => { win.nativeSections++; return native(callback) }
    window.addEventListener('loft:tabs-start', ((event: CustomEvent) => {
      const { kind, direction, animations, finished } = event.detail
      win.surfaceAnimations = animations
      win.surfaceTransition = { ready: Promise.resolve(), finished }
      win.surfaceRecords.push({ kind, direction, width: innerWidth,
        frames: animations.map((animation: Animation) => (animation.effect as KeyframeEffect).getKeyframes().map(frame => frame.translate)),
        timing: animations.map((animation: Animation) => animation.effect!.getTiming()),
        copiesContainChrome: !!document.querySelector('[data-tab-outgoing] .loft-header, [data-tab-outgoing] .loft-navigation') })
    }) as EventListener)
  })
}
async function finished(page: Page, direction: number) {
  await page.evaluate(() => (window as any).surfaceTransition.finished)
  const record = await page.evaluate(() => (window as any).surfaceRecords.at(-1))
  expect(record.kind).toBe('section')
  expect(record.direction).toBe(direction)
  expect(record.copiesContainChrome).toBe(false)
  expect(record.frames.length).toBeGreaterThanOrEqual(2)
  expect(Number.parseFloat(record.frames[0][0])).toBe(direction * record.width)
  expect(Number.parseFloat(record.frames[0][1])).toBe(0)
  expect(Number.parseFloat(record.frames.at(-1)[0])).toBe(0)
  expect(Number.parseFloat(record.frames.at(-1)[1])).toBe(-direction * record.width)
  for (const timing of record.timing) expect(timing).toMatchObject({ duration: 340, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' })
  expect(await page.evaluate(() => (window as any).nativeSections)).toBe(0)
  await expect(page.locator('[data-tab-outgoing], [data-tab-incoming], [data-loft-chrome]')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-loft-tab-motion')
}
async function midpoint(page: Page, name: string) {
  await page.evaluate(() => {
    for (const animation of (window as any).surfaceAnimations) { animation.pause(); animation.currentTime = 170 }
  })
  const path = test.info().outputPath(name + '.png')
  await page.screenshot({ path })
  await test.info().attach(name, { path, contentType: 'image/png' })
  await page.evaluate(() => { for (const animation of (window as any).surfaceAnimations) animation.play() })
}

test('категория и подкатегория пролистываются на ширину экрана, Back меняет направление', async ({ page }) => {
  await page.goto(STORE)
  await track(page)
  await page.locator('[data-surface-link="category:shoes"]').click()
  await expect(page.locator('[data-surface="category:shoes"]')).toBeVisible()
  await midpoint(page, 'category-page-slide')
  await finished(page, 1)
  await page.locator('[data-surface-link="catalog:shoes:sneakers"]').click()
  await expect(page.locator('[data-surface="catalog:shoes:sneakers"]')).toBeVisible()
  await finished(page, 1)
  await page.goBack()
  await expect(page.locator('[data-surface="category:shoes"]')).toBeVisible()
  await finished(page, -1)
  await page.goBack()
  await expect(page.locator('[data-surface-link="category:shoes"]')).toBeVisible()
  await finished(page, -1)
})
for (const [section, prefix, id] of [['orders', 'order', 1001], ['china', 'request', 3001]] as const) {
  test(`${section}: список и детали используют пролистывание страницы в обе стороны`, async ({ page }) => {
    await page.goto(`${STORE}/profile`)
    await track(page)
    await page.locator(`[data-profile-link="${section}"]`).click()
    await expect(page.locator(`[data-profile-surface="${section}"]`)).toBeVisible()
    await finished(page, 1)
    await page.locator(`[data-profile-link="${prefix}:${id}"]`).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await midpoint(page, section + '-page-slide')
    await finished(page, 1)
    await page.evaluate(() => (window as any).telegramBack())
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await finished(page, -1)
    await page.goBack()
    await expect(page.locator(`[data-profile-link="${section}"]`)).toBeVisible()
    await finished(page, -1)
  })
}
for (const theme of ['light', 'dark']) {
  test(`профиль ${theme}: меню остаётся тем же живым элементом на каждом кадре всех разделов`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme as 'light' | 'dark' })
    await page.goto(`${STORE}/profile`)
    await expect(page.locator('[data-profile-link="orders"]')).toBeVisible()
    await expect(page.locator('[data-nav-tab="profile"]')).toHaveCSS('background-color', theme === 'dark' ? 'rgb(34, 48, 74)' : 'rgb(232, 226, 213)')
    await track(page)
    await page.evaluate(() => {
      const win = window as any
      const nav = document.querySelector<HTMLElement>('.loft-navigation')!
      const initial = nav.getBoundingClientRect()
      const button = nav.querySelector<HTMLElement>('[data-nav-tab="profile"]')!
      const background = getComputedStyle(button).backgroundColor
      win.navFailures = []
      win.navFrames = 0
      const sample = () => {
        const rect = nav.getBoundingClientRect(), style = getComputedStyle(nav)
        win.navFrames++
        if (!nav.isConnected || document.querySelectorAll('.loft-navigation').length !== 1 ||
          Math.abs(rect.y - initial.y) > 0.5 || Math.abs(rect.width - initial.width) > 0.5 ||
          style.translate !== 'none' || style.transform !== 'none' || style.opacity !== '1' || style.viewTransitionName !== 'none' ||
          getComputedStyle(button).backgroundColor !== background) win.navFailures.length < 5 && win.navFailures.push({ rect: rect.toJSON(), initial: initial.toJSON(), name: style.viewTransitionName, background, actualBackground: getComputedStyle(button).backgroundColor, translate: style.translate, transform: style.transform })
        win.navFrame = requestAnimationFrame(sample)
      }
      sample()
    })
    for (const section of ['orders', 'china', 'favorites', 'settings']) {
      await page.locator(`[data-profile-link="${section}"]`).click()
      await expect(page.locator(`[data-profile-surface="${section}"]`)).toBeVisible()
      await finished(page, 1)
      await page.goBack()
      await expect(page.locator(`[data-profile-link="${section}"]`)).toBeVisible()
      await finished(page, -1)
    }
    await page.evaluate(() => cancelAnimationFrame((window as any).navFrame))
    expect(await page.evaluate(() => (window as any).navFrames)).toBeGreaterThan(20)
    expect(await page.evaluate(() => (window as any).navFailures)).toEqual([])
  })
}

test('адрес профиля доступен с клавиатуры и ведёт в Навигатор на телефоне, в карту на компьютере', async ({ page, isMobile }) => {
  await page.goto(`${STORE}/profile`)
  const address = page.getByRole('link', { name: /Адрес магазина ТЦ Mercato/ })
  await expect(address).toBeVisible()
  const href = await address.getAttribute('href')
  if (isMobile) {
    expect(href).toMatch(/^yandexnavi:\/\/map_search\?text=/)
    expect(new URL(href!).searchParams.get('text')).toBe('Ташкент, Малая кольцевая дорога, 57, ТЦ Mercato')
  } else {
    expect(href).toBe('https://yandex.com/maps/org/mercato/220591012883/')
    await expect(address).toHaveAttribute('target', '_blank')
  }
  await address.evaluate(element => element.addEventListener('click', event => { event.preventDefault(); (window as any).addressActivated = true }))
  await address.focus()
  await address.press('Enter')
  expect(await page.evaluate(() => (window as any).addressActivated)).toBe(true)
})


test('бренды: обе ступени пролистываются и возвращаются с восстановлением прокрутки', async ({ page, harness }) => {
  const original = harness.db.brands[0]
  harness.db.brands = Array.from({ length: 20 }, (_, index) => ({ ...original, id: `brand-${index}`, name: `Brand ${String(index).padStart(2, '0')}` }))
  await page.goto(STORE)
  await track(page)
  await page.locator('[data-surface-link="brands"]').click()
  await expect(page.locator('[data-surface="brands"]')).toBeVisible()
  await finished(page, 1)
  const row = page.locator('[data-surface-link="brand:brand-15"]')
  await row.scrollIntoViewIfNeeded()
  const scroll = await page.evaluate(() => scrollY)
  expect(scroll).toBeGreaterThan(100)
  await row.click()
  await expect(page.locator('[data-surface="brand:brand-15"]')).toBeVisible()
  await finished(page, 1)
  await page.evaluate(() => (window as any).telegramBack())
  await expect(row).toBeVisible()
  await finished(page, -1)
  expect(await page.evaluate(() => scrollY)).toBe(scroll)
  await page.goBack()
  await expect(page.locator('[data-surface-link="brands"]')).toBeVisible()
  await finished(page, -1)
})

test('поиск пролистывается как категории; набор и очистка запроса не перезапускают движение', async ({ page }) => {
  await page.goto(STORE)
  await track(page)
  await page.locator('[data-surface-link="search"]').click()
  const input = page.getByPlaceholder('Поиск по названию...')
  await expect(input).toBeVisible()
  await finished(page, 1)
  await input.fill('кроссовки')
  await expect(page).toHaveURL(/q=/)
  await page.getByRole('button', { name: 'Очистить', exact: true }).click()
  await expect(page).toHaveURL(/\/search$/)
  expect(await page.evaluate(() => (window as any).surfaceRecords.length)).toBe(1)
  await page.evaluate(() => (window as any).telegramBack())
  await expect(page.locator('[data-surface-link="search"]')).toBeVisible()
  await finished(page, -1)
})
