import { lazy } from 'react'

const loadSearchPage = () => import('../pages/SearchPage')
export const SearchPage = lazy(loadSearchPage)
const loadCartPage = () => import('../pages/CartPage')
export const CartPage = lazy(loadCartPage)
const loadChinaPage = () => import('../pages/ChinaPage')
export const ChinaPage = lazy(loadChinaPage)
const loadProfilePage = () => import('../pages/ProfilePage')
export const ProfilePage = lazy(loadProfilePage)
const loadProductPage = () => import('../pages/ProductPage')
export const ProductPage = lazy(loadProductPage)
const loadFavoritesPage = () => import('../pages/FavoritesPage')
export const FavoritesPage = lazy(loadFavoritesPage)
const loadCatalogPage = () => import('../pages/CatalogPage')
export const CatalogPage = lazy(loadCatalogPage)
const loadBrandsPage = () => import('../pages/BrandsPage')
export const BrandsPage = lazy(loadBrandsPage)
const loadCategoryPage = () => import('../pages/CategoryPage')
export const CategoryPage = lazy(loadCategoryPage)
const loadAllProductsPage = () => import('../pages/AllProductsPage')
export const AllProductsPage = lazy(loadAllProductsPage)
const loadPrivacyPage = () => import('../pages/PrivacyPage')
export const PrivacyPage = lazy(loadPrivacyPage)
const loadTermsPage = () => import('../pages/TermsPage')
export const TermsPage = lazy(loadTermsPage)

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
