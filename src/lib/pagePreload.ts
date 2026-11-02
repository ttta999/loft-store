import { createElement, type ComponentType } from 'react'

function deferredPage(loader: () => Promise<{ default: ComponentType }>) {
  let Page: ComponentType | undefined
  let pending: Promise<unknown> | undefined
  let failure: unknown
  const load = () => pending ||= loader().then(module => { Page = module.default }, error => { failure = error; throw error })
  return {
    load,
    Component() {
      if (failure) throw failure
      if (!Page) throw load()
      return createElement(Page)
    },
  }
}

const SearchPageResource = deferredPage(() => import('../pages/SearchPage'))
const loadSearchPage = SearchPageResource.load
export const SearchPage = SearchPageResource.Component
const CartPageResource = deferredPage(() => import('../pages/CartPage'))
const loadCartPage = CartPageResource.load
export const CartPage = CartPageResource.Component
const ChinaPageResource = deferredPage(() => import('../pages/ChinaPage'))
const loadChinaPage = ChinaPageResource.load
export const ChinaPage = ChinaPageResource.Component
const ProfilePageResource = deferredPage(() => import('../pages/ProfilePage'))
const loadProfilePage = ProfilePageResource.load
export const ProfilePage = ProfilePageResource.Component
const ProductPageResource = deferredPage(() => import('../pages/ProductPage'))
const loadProductPage = ProductPageResource.load
export const ProductPage = ProductPageResource.Component
const FavoritesPageResource = deferredPage(() => import('../pages/FavoritesPage'))
const loadFavoritesPage = FavoritesPageResource.load
export const FavoritesPage = FavoritesPageResource.Component
const CatalogPageResource = deferredPage(() => import('../pages/CatalogPage'))
const loadCatalogPage = CatalogPageResource.load
export const CatalogPage = CatalogPageResource.Component
const BrandsPageResource = deferredPage(() => import('../pages/BrandsPage'))
const loadBrandsPage = BrandsPageResource.load
export const BrandsPage = BrandsPageResource.Component
const CategoryPageResource = deferredPage(() => import('../pages/CategoryPage'))
const loadCategoryPage = CategoryPageResource.load
export const CategoryPage = CategoryPageResource.Component
const AllProductsPageResource = deferredPage(() => import('../pages/AllProductsPage'))
const loadAllProductsPage = AllProductsPageResource.load
export const AllProductsPage = AllProductsPageResource.Component
const PrivacyPageResource = deferredPage(() => import('../pages/PrivacyPage'))
const loadPrivacyPage = PrivacyPageResource.load
export const PrivacyPage = PrivacyPageResource.Component
const TermsPageResource = deferredPage(() => import('../pages/TermsPage'))
const loadTermsPage = TermsPageResource.load
export const TermsPage = TermsPageResource.Component

const loaders: Record<string, () => Promise<unknown>> = {
  '/search': loadSearchPage,
  '/cart': loadCartPage,
  '/china': loadChinaPage,
  '/profile': loadProfilePage,
  '/product': loadProductPage,
  '/favorites': loadFavoritesPage,
  '/catalog': loadCatalogPage,
  '/brands': loadBrandsPage,
  '/category': loadCategoryPage,
  '/all-products': loadAllProductsPage,
  '/privacy': loadPrivacyPage,
  '/terms': loadTermsPage,
}
export function preloadPage(pathname: string): Promise<unknown> {
  const key = '/' + pathname.split('/').filter(Boolean)[0]
  return loaders[key]?.() || Promise.resolve()
}
export function warmPage(pathname: string) { void preloadPage(pathname).catch(() => {}) }
