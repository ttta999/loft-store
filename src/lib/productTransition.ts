import {prepareTabMotion} from './tabTransition'
import {productReturnMotion} from './productReturnMotion'
import { captureReturnPhotos, retainReturnPhotos, takeReturnPhotos } from './productReturnPhotos'
import type { ProductReturnTrace } from './productReturnTrace'
import { useStore } from '../store/useStore'
import { cacheProduct } from './productCache'
import { warmPage } from './pagePreload'
import { clearSharedSources, markSharedElement } from './sharedElement'

type Page = { key: string; pathname: string; search: string }
type Origin = { id: string; key: string; index: number; placement?: string; src: string; scrollY: number; top: number }
let intent: Origin | null = null
let openingPhoto: { id: string; src: string } | null = null
export const getOpeningPhoto = (id?: string) => openingPhoto && openingPhoto.id === id ? openingPhoto.src : undefined
const origins = new Map<string, Origin>()
const photoName = 'loft-product-photo'

function visible(image: HTMLImageElement | null): image is HTMLImageElement {
  if (!image?.complete || !image.naturalWidth || !image.isConnected || getComputedStyle(image).visibility === 'hidden') return false
  const rect = image.getBoundingClientRect()
  return rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight
}
function cards(id: string) { return Array.from(document.querySelectorAll<HTMLElement>('[data-product-card]')).filter(card => card.dataset.productCard === id) }
function originCard(origin: Origin) {
  const matches = cards(origin.id)
  return origin.placement ? matches.find(card => card.dataset.productPlacement === origin.placement) : matches[origin.index]
}
function radius(image: HTMLImageElement) {
  const own = getComputedStyle(image).borderRadius
  return own !== '0px' ? own : '16px 16px 0px 0px'
}
function mark(image: HTMLImageElement) { markSharedElement(image, photoName) }
function markContent() {
  document.querySelectorAll('[data-loft-snapshot]').forEach(element => element.removeAttribute('data-loft-snapshot'))
  const content = Array.from(document.querySelectorAll<HTMLElement>('[data-loft-content]')).find(element => !element.querySelector('[data-loft-content], .loft-header, .loft-navigation'))
  content?.setAttribute('data-loft-snapshot', 'true')
}
export function clearProductNames() {
  clearSharedSources()
  if (openingPhoto) { openingPhoto = null; window.dispatchEvent(new Event('loft:product-photo-end')) }
  delete document.documentElement.dataset.loftPhotoCrossfade
  delete document.documentElement.dataset.loftOpeningSource
  document.documentElement.style.removeProperty('--loft-photo-from-radius')
  document.documentElement.style.removeProperty('--loft-photo-to-radius')
  document.querySelectorAll('[data-loft-snapshot]').forEach(element => element.removeAttribute('data-loft-snapshot'))
  document.querySelectorAll<HTMLImageElement>('[style*="loft-product-photo"]').forEach(image => image.style.removeProperty('view-transition-name'))
}
export function installProductIntent(location: () => Page) {
  const capture = (event: Event) => {
    const target = event.target as Element | null
    if (!target || target.closest('button, input')) return
    const card = target.closest<HTMLElement>('[data-product-card]')
    if (!card) return
    warmPage('/product')
    const image = card.querySelector<HTMLImageElement>('img')
    const product = useStore.getState().productsCache?.items.find(item => item.id === card.dataset.productCard)
    if (product) cacheProduct(product)
    if (event.type !== 'click' || !visible(image)) return
    intent = { id: card.dataset.productCard!, key: location().key, index: cards(card.dataset.productCard!).indexOf(card), placement: card.dataset.productPlacement, src: image.currentSrc || image.src, scrollY: window.scrollY, top: image.getBoundingClientRect().top }
  }
  document.addEventListener('click', capture, true)
  document.addEventListener('pointerover', capture, { passive: true })
  document.addEventListener('pointerdown', capture, { passive: true })
  document.addEventListener('focusin', capture)
  return () => { document.removeEventListener('click', capture, true); document.removeEventListener('pointerover', capture); document.removeEventListener('pointerdown', capture); document.removeEventListener('focusin', capture) }
}
/** Use the committed list geometry. A cold or filtered-out origin dissolves
 * immediately, so a delayed image cannot move the destination after paint. */
function restoreOrigin(origin: Origin, valid: () => boolean): HTMLImageElement | null {
  const target = originCard(origin)?.querySelector<HTMLImageElement>('img')
  // The route restorer must not race the product return for control of scroll.
  window.dispatchEvent(new Event('loft:scroll-restored'))
  window.scrollTo({ top: origin.scrollY, behavior: 'instant' })
  if (!target || !valid()) return null
  mark(target)
  const rect = target.getBoundingClientRect()
  if (rect.width && Math.abs(rect.top - origin.top) > 1) {
    window.scrollTo({ top: window.scrollY + rect.top - origin.top, behavior: 'instant' })
  }
  // The card reserves an image box even before this instance decodes its
  // cached resource. Land on that box without waiting for a second fetch.
  target.loading = 'eager'
  const destination = target.getBoundingClientRect()
  return destination.width > 0 && destination.bottom > 0 && destination.top < innerHeight ? target : null
}
export function prepareProductTransition(from: Page, to: Page, trace?: ProductReturnTrace) {
  clearProductNames()
  const openingId = to.pathname.match(/^\/product\/([^/]+)$/)?.[1]
  const saved = origins.get(from.key)
  const reverse = from.pathname.startsWith('/product/') && saved?.key === to.key
  const origin = reverse ? saved : openingId && intent?.id === openingId && intent.key === from.key ? intent : saved
  const forward = !!openingId && !!origin && origin.id === openingId && origin.key === from.key
  const returning = reverse && !!origin
  if (!origin || (!forward && !returning)) return null
  const source = forward ? originCard(origin)?.querySelector<HTMLImageElement>('img') || null : document.querySelector<HTMLImageElement>('[data-product-hero]')
  if (returning) return productReturnMotion(
    source,
    valid => restoreOrigin(origin, valid),
    () => prepareTabMotion(from, to, -1, true, trace),
    takeReturnPhotos(from.key),
    trace,
  )
  if(typeof document.startViewTransition!=='function')return null
  if (!visible(source) || (forward && (source.currentSrc || source.src) !== origin.src)) {
    return null
  }
  document.documentElement.style.setProperty('--loft-photo-from-radius', radius(source))
  mark(source)
  if (forward) {
    // Capture the unpressed card, after mark() removes tap-scale interpolation.
    origin.top=source.getBoundingClientRect().top
    origin.scrollY=window.scrollY
    openingPhoto = { id: origin.id, src: origin.src }
    origins.set(to.key, origin)
    while (origins.size > 40) origins.delete(origins.keys().next().value!)
  }
  intent = null
  const photos = captureReturnPhotos()
  return {
    finish(valid: () => boolean) {
      if (valid()) retainReturnPhotos(to.key, photos)
      markContent()
      const target = document.querySelector<HTMLImageElement>('[data-product-hero]')
      if (!valid() || !target || (target.currentSrc || target.src) !== origin.src) return false
      const rect = target.getBoundingClientRect()
      if (!rect.width || rect.bottom <= 0 || rect.top >= innerHeight || getComputedStyle(target).visibility === 'hidden') return false
      // The decoded source snapshot can move to the destination box immediately.
      // A cold destination image must not stall the native update callback.
      if (!target.complete || !target.naturalWidth) document.documentElement.dataset.loftOpeningSource = 'true'
      document.documentElement.style.setProperty('--loft-photo-to-radius', radius(target))
      mark(target)
      return true
    },
  }
}
