import { test, expect, STORE, productId } from './fixture'

test('нажатие и отпускание кнопки меняют масштаб постепенно, без скачка', async ({ page }) => {
  await page.goto(STORE)
  const button = page.getByRole('button', { name: 'Корзина', exact: true })
  await expect(button).toBeVisible()
  await button.evaluate(element => {
    const capture = (key: string, count: number) => {
      const values: number[] = []; (window as any)[key] = values
      const sample = () => {
        const scale = getComputedStyle(element).scale
        values.push(scale === 'none' ? 1 : Number.parseFloat(scale))
        if (values.length < count) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    }
    element.addEventListener('pointerdown', () => capture('pressSamples', 10), { once: true })
    element.addEventListener('pointerup', () => capture('releaseSamples', 18), { once: true })
  })
  await button.hover()
  await page.mouse.down()
  await expect.poll(() => page.evaluate(() => (window as any).pressSamples?.length || 0)).toBe(10)
  const press = await page.evaluate(() => (window as any).pressSamples as number[])
  expect(press.some(scale => scale > 0.9801 && scale < 0.9999)).toBe(true)
  expect(press.at(-1)).toBeCloseTo(0.98, 3)
  await page.mouse.up()
  await expect.poll(() => page.evaluate(() => (window as any).releaseSamples?.length || 0)).toBe(18)
  const release = await page.evaluate(() => (window as any).releaseSamples as number[])
  expect(release.some(scale => scale > 0.9801 && scale < 0.9999)).toBe(true)
  expect(release.at(-1)).toBeCloseTo(1, 3)
  await expect(page.getByText('Корзина пуста', { exact: true })).toBeVisible()
})

test('прокрутка остаётся заблокированной до окончания закрытия размеров', async ({ page }) => {
  await page.goto(`${STORE}/product/${productId}`)
  await page.getByRole('button', { name: /Размер Выберите размер/ }).click()
  const size = page.getByRole('button', { name: '42', exact: true })
  await expect(size).toBeVisible()
  const during = await size.evaluate(async element => {
    element.click()
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    return document.body.style.overflow
  })
  expect(during).toBe('hidden')
  await expect(size).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('первый кадр страницы не исчезает полностью и не вспыхивает перед появлением', async ({ page }) => {
  await page.goto(STORE)
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      const content = document.querySelector('main[data-loft-content]')
      if (!content?.textContent?.includes('Корзина пуста')) return
      observer.disconnect()
      requestAnimationFrame(() => { (window as any).firstCartOpacity = Number.parseFloat(getComputedStyle(content).opacity) })
    })
    observer.observe(document.getElementById('root')!, { childList: true, subtree: true })
  })
  await page.getByRole('button', { name: 'Корзина', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).firstCartOpacity !== undefined)).toBe(true)
  const opacity = await page.evaluate(() => (window as any).firstCartOpacity)
  expect(opacity).toBeGreaterThan(0)
  expect(opacity).toBeLessThan(1)
  await expect(page.getByText('Корзина пуста', { exact: true })).toBeVisible()
})
