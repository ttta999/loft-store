import {productReturnMotion} from './productReturnMotion'
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
/** Restore the list before the native transition captures its destination.
 * ResizeObserver retries must stop before that capture, not during animation. */
async function restoreOrigin(origin:Origin,valid:()=>boolean):Promise<HTMLImageElement|null>{
 const deadline=performance.now()+180
 let target:HTMLImageElement|null=null
 // Native View Transitions pause rendering inside their update callback.
 // Do not await animation frames here: Safari/Chromium can then time out.
 target=originCard(origin)?.querySelector<HTMLImageElement>('img')||null
 if(!target)target=await new Promise<HTMLImageElement|null>(resolve=>{
  const observer=new MutationObserver(()=>{const image=originCard(origin)?.querySelector<HTMLImageElement>('img');if(image&&valid()){observer.disconnect();clearTimeout(timer);resolve(image)}})
  const timer=setTimeout(()=>{observer.disconnect();resolve(null)},180)
  observer.observe(document.body,{childList:true,subtree:true})
 })
 if(!target||!valid())return null
 target.loading='eager'
 if(!target.complete||!target.naturalWidth)await Promise.race([target.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,Math.max(0,deadline-performance.now())))])
 if(!valid())return null
 // Stop the general late-list restorer before measuring the target geometry.
 window.dispatchEvent(new Event('loft:scroll-restored'))
 window.scrollTo({top:origin.scrollY,behavior:'instant'})
 markSharedElement(target,photoName)
 // Flush layout with press styles removed; correct for a clamped list restore.
 const rect=target.getBoundingClientRect()
 if(Math.abs(rect.top-origin.top)>1)window.scrollTo({top:window.scrollY+rect.top-origin.top,behavior:'instant'})
 if(!valid()){target.style.removeProperty('view-transition-name');return null}
 return target
}
export function prepareProductTransition(from: Page, to: Page) {
  clearProductNames()
  const openingId = to.pathname.match(/^\/product\/([^/]+)$/)?.[1]
  const saved = origins.get(from.key)
  const reverse = from.pathname.startsWith('/product/') && saved?.key === to.key
  const origin = reverse ? saved : openingId && intent?.id === openingId && intent.key === from.key ? intent : saved
  const forward = !!openingId && !!origin && origin.id === openingId && origin.key === from.key
  const returning = reverse && !!origin
  if (!origin || (!forward && !returning)) return null
  const source = forward ? originCard(origin)?.querySelector<HTMLImageElement>('img') || null : document.querySelector<HTMLImageElement>('[data-product-hero]')
  if(returning)return productReturnMotion(source,valid=>restoreOrigin(origin,valid))
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
  return {
    async finish(valid: () => boolean) {
      markContent()
      const target = returning ? await restoreOrigin(origin, valid) : forward ? document.querySelector<HTMLImageElement>('[data-product-hero]') : originCard(origin)?.querySelector<HTMLImageElement>('img')
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
