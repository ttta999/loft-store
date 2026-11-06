import { useStore } from '../store/useStore'
import { cacheProduct } from './productCache'
import { warmPage } from './pagePreload'
import { clearSharedSources, markSharedElement } from './sharedElement'

type Page = { key: string; pathname: string; search: string }
type Origin = { id: string; key: string; index: number; placement?: string; src: string }
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
    intent = { id: card.dataset.productCard!, key: location().key, index: cards(card.dataset.productCard!).indexOf(card), placement: card.dataset.productPlacement, src: image.currentSrc || image.src }
  }
  document.addEventListener('click', capture, true)
  document.addEventListener('pointerover', capture, { passive: true })
  document.addEventListener('pointerdown', capture, { passive: true })
  document.addEventListener('focusin', capture)
  return () => { document.removeEventListener('click', capture, true); document.removeEventListener('pointerover', capture); document.removeEventListener('pointerdown', capture); document.removeEventListener('focusin', capture) }
}
export function prepareProductTransition(from: Page, to: Page) {
  clearProductNames()
  const openingId = to.pathname.match(/^\/product\/([^/]+)$/)?.[1]
  const origin = openingId && intent?.id === openingId && intent.key === from.key ? intent : origins.get(from.key)
  const forward = !!openingId && !!origin && origin.id === openingId && origin.key === from.key
  const returning = !openingId && from.pathname.startsWith('/product/') && !!origin && origin.key === to.key
  if (!origin || (!forward && !returning)) return null
  const source = forward ? originCard(origin)?.querySelector<HTMLImageElement>('img') || null : document.querySelector<HTMLImageElement>('[data-product-hero]')
  if (!visible(source) || (forward && (source.currentSrc || source.src) !== origin.src)) return null
  document.documentElement.style.setProperty('--loft-photo-from-radius', radius(source))
  mark(source)
  if (forward) {
    openingPhoto = { id: origin.id, src: origin.src }
    origins.set(to.key, origin)
    while (origins.size > 40) origins.delete(origins.keys().next().value!)
  }
  intent = null
  return {
    async finish(valid: () => boolean) {
      markContent()
      const target = forward ? document.querySelector<HTMLImageElement>('[data-product-hero]') : originCard(origin)?.querySelector<HTMLImageElement>('img')
      if (!target) return false
      // A complete cached image already has a paintable frame. Re-decoding it
      // inside the native update callback freezes the outgoing screen on Safari.
      if (!target.complete || !target.naturalWidth) {
        await Promise.race([target.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 180))])
      }
      if (!valid() || !visible(target) || (forward && (target.currentSrc || target.src) !== origin.src)) return false
      if ((target.currentSrc || target.src) !== (source.currentSrc || source.src)) document.documentElement.dataset.loftPhotoCrossfade = 'true'
      document.documentElement.style.setProperty('--loft-photo-to-radius', radius(target))
      mark(target)
      return true
    },
  }
}
