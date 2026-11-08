import { test, expect, STORE, productId } from './fixture'

test('главная считает товары всей категории, исключая скрытые позиции и отключённые подкатегории', async ({ page, harness }) => {
  const product = harness.db.products[0]
  harness.db.products = Array.from({ length: 8 }, (_, index) => ({ ...product, id: index ? `fixture-shoe-${index}` : productId, subcategory: index === 7 ? 'boots' : 'sneakers' }))
  harness.db.products.push({ ...product, id: 'hidden', is_active: false }, { ...product, id: 'disabled-subcategory', subcategory: 'old' })
  harness.db.categories.push({ ...harness.db.categories[0], id: 'clothes', name_ru: 'Одежда', name_uz: 'Kiyim' })
  harness.db.subcategories.push({ ...harness.db.subcategories[0], id: 'boots', name_ru: 'Ботинки' }, { ...harness.db.subcategories[0], id: 'old', is_active: false })
  await page.goto(STORE)
  const shoes = page.locator('[data-surface-link="category:shoes"]')
  await expect(shoes).toContainText('8 товаров')
  await expect(page.locator('[data-surface-link="category:clothes"]')).toContainText('0 товаров')
  await shoes.click()
  await expect(page.getByRole('button', { name: /Все товары/ })).toBeVisible()
  await expect(page.getByText(/Нажмите «Все товары»/)).toHaveCount(0)
  await page.getByRole('button', { name: /Все товары/ }).click()
  await expect(page.locator('[data-product-card]')).toHaveCount(8)
})
