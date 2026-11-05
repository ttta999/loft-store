import { test, expect, STORE } from './fixture'
import type { Page } from '@playwright/test'

async function track(page: Page) {
  await page.evaluate(() => {
    const native = document.startViewTransition.bind(document)
    ;(window as any).surfaceRecords = []
    document.startViewTransition = callback => {
      const transition = native(callback)
      ;(window as any).surfaceTransition = transition
      transition.ready.then(() => {
        const style = (part: string) => getComputedStyle(document.documentElement, `::view-transition-${part}(loft-profile-surface)`)
        ;(window as any).surfaceRecords.push({ continuous: document.documentElement.dataset.loftSurfaceMotion,
          old: style('old').display, entering: style('new').animationName,
          duration: style('group').animationDuration, easing: style('group').animationTimingFunction })
      }).catch(() => {})
      return transition
    }
  })
}
async function finished(page: Page) {
  await page.evaluate(() => (window as any).surfaceTransition.finished)
  const record = await page.evaluate(() => (window as any).surfaceRecords.at(-1))
  expect(record).toEqual({ continuous: 'continuous', old: 'none', entering: 'none', duration: '0.34s', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' })
  await expect(page.locator('html')).not.toHaveAttribute('data-loft-surface-motion')
}

test('категория и подкатегория: непрерывное раскрытие и обратное закрытие без растворения', async ({ page }) => {
  await page.goto(STORE)
  await track(page)
  await page.locator('[data-surface-link="category:shoes"]').click()
  await expect(page.locator('[data-surface="category:shoes"]')).toBeVisible()
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
  test(`${section}: список и детали раскрываются как товар, обе ступени возвращаются обратно`, async ({ page }) => {
    await page.goto(`${STORE}/profile`)
    await track(page)
    await page.locator(`[data-profile-link="${section}"]`).click()
    await expect(page.locator(`[data-profile-surface="${section}"]`)).toBeVisible()
    await finished(page)
    await page.locator(`[data-profile-link="${prefix}:${id}"]`).click()
    await expect(page.getByRole('dialog')).toBeVisible()
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
