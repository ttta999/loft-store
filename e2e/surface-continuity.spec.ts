import { test, expect, STORE } from './fixture'
import type { Page } from '@playwright/test'

async function track(page: Page) {
  await page.evaluate(() => {
    const native = document.startViewTransition.bind(document)
    ;(window as any).surfaceRecords = []
    document.startViewTransition = callback => {
      const source = document.querySelector<HTMLElement>('[style*="loft-profile-surface"]')
      const sourceFrame = source?.hasAttribute('data-loft-surface-frame') || false
      const transition = native(callback)
      ;(window as any).surfaceTransition = transition
      transition.ready.then(() => {
        const style = (part: string) => getComputedStyle(document.documentElement, `::view-transition-${part}(loft-profile-surface)`)
        ;(window as any).surfaceRecords.push({ continuous: document.documentElement.dataset.loftSurfaceMotion,
          old: style('old').display, entering: style('new').animationName,
          duration: style('group').animationDuration, easing: style('group').animationTimingFunction,
          sourceFrame, targetFrame: !!document.querySelector('[data-loft-surface-frame][style*="loft-profile-surface"]'),
          targetHeight: document.querySelector('[data-loft-surface-frame]')?.getBoundingClientRect().height || 0,
          fit: style('new').objectFit, snapshotHeight: Number.parseFloat(style('new').height), groupHeight: Number.parseFloat(style('group').height) })
      }).catch(() => {})
      return transition
    }
  })
}
async function finished(page: Page) {
  await page.evaluate(() => (window as any).surfaceTransition.finished)
  const record = await page.evaluate(() => (window as any).surfaceRecords.at(-1))
  expect(record).toMatchObject({ continuous: 'continuous', old: 'none', entering: 'none', duration: '0.34s', easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fit: 'cover' })
  expect(record.sourceFrame || record.targetFrame).toBe(true)
  if (record.targetFrame) expect(record.targetHeight).toBeGreaterThan(200)
  expect(Math.abs(record.snapshotHeight - record.groupHeight)).toBeLessThan(1)
  await expect(page.locator('[data-loft-surface-frame], [data-loft-surface-hidden]')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-loft-surface-motion')
}


async function midpoint(page: Page, name: string) {
  await page.evaluate(async () => {
    await (window as any).surfaceTransition.ready
    for (const animation of document.getAnimations()) if (animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity) { animation.pause(); animation.currentTime = 170 }
  })
  const path = test.info().outputPath(name + '.png')
  await page.screenshot({ path })
  await test.info().attach(name, { path, contentType: 'image/png' })
  await page.evaluate(() => { for (const animation of document.getAnimations()) if (animation.playState === 'paused') animation.play() })
}

test('категория и подкатегория: непрерывное раскрытие и обратное закрытие без растворения', async ({ page, browserName }) => {
  await page.goto(STORE)
  await track(page)
  await page.locator('[data-surface-link="category:shoes"]').click()
  await expect(page.locator('[data-surface="category:shoes"]')).toBeVisible()
  if (browserName === 'chromium') await midpoint(page, 'category-expands-into-screen')
  await finished(page)
  await page.locator('[data-surface-link="catalog:shoes:sneakers"]').click()
  await expect(page.locator('[data-surface="catalog:shoes:sneakers"]')).toBeVisible()
  await finished(page)
  await page.goBack()
  await expect(page.locator('[data-surface="category:shoes"]')).toBeVisible()
  await finished(page)
  await page.goBack()
  await expect(page.locator('[data-surface-link="category:shoes"]')).toBeVisible()
  await finished(page)
})
for (const [section, prefix, id] of [['orders', 'order', 1001], ['china', 'request', 3001]] as const) {
  test(`${section}: список и детали раскрываются как товар, обе ступени возвращаются обратно`, async ({ page, browserName }) => {
    await page.goto(`${STORE}/profile`)
    await track(page)
    await page.locator(`[data-profile-link="${section}"]`).click()
    await expect(page.locator(`[data-profile-surface="${section}"]`)).toBeVisible()
    await finished(page)
    await page.locator(`[data-profile-link="${prefix}:${id}"]`).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    if (browserName === 'chromium') await midpoint(page, section + '-expands-into-screen')
    await finished(page)
    await page.evaluate(() => (window as any).telegramBack())
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await finished(page)
    await page.goBack()
    await expect(page.locator(`[data-profile-link="${section}"]`)).toBeVisible()
    await finished(page)
  })
}

test('анимация настроек сохраняет прежнее поведение', async ({ page }) => {
  await page.goto(`${STORE}/profile`)
  await track(page)
  await page.locator('[data-profile-link="settings"]').click()
  await expect(page.locator('[data-profile-surface="settings"]')).toBeVisible()
  await page.evaluate(() => (window as any).surfaceTransition.finished)
  const record = await page.evaluate(() => (window as any).surfaceRecords.at(-1))
  expect(record.continuous).toBeUndefined()
  expect(record.entering).toBe('loft-fade-in')
})
