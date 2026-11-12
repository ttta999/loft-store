import { motionEaseCSS, motionTiming } from './motion'
type Page = { pathname: string; search?: string }
const order: Record<string, number> = { '/': 0, '/home': 0, '/cart': 1, '/china': 2, '/profile': 3 }
export function tabDirection(from: Page, to: Page) {
  const a = order[from.pathname], b = order[to.pathname]
  return a !== undefined && b !== undefined && a !== b ? Math.sign(b - a) : 0
}
/** Internal pages use the same push as tabs, including profile query routes. */
export function sectionDirection(from: Page, to: Page, backwards: boolean) {
  if (from.pathname === '/profile' && to.pathname === '/profile') {
    const a = new URLSearchParams(from.search), b = new URLSearchParams(to.search)
    if (['section', 'order', 'request'].some(key => a.get(key) !== b.get(key))) {
      const depth = (params: URLSearchParams) => params.get('order') || params.get('request') ? 2 : params.get('section') && params.get('section') !== 'main' ? 1 : 0
      return Math.sign(depth(b) - depth(a)) || (backwards ? -1 : 1)
    }
  }
  if (from.pathname === '/brands' && to.pathname === '/brands') {
    const a = new URLSearchParams(from.search).get('brand'), b = new URLSearchParams(to.search).get('brand')
    if (a !== b) return Math.sign(Number(!!b) - Number(!!a)) || (backwards ? -1 : 1)
  }
  const depth: Record<string, number> = { '/': 0, '/home': 0, '/category': 1, '/catalog': 2, '/brands': 1, '/search': 1, '/all-products': 1 }
  const home = (path: string) => path === '/' || path === '/home'
  const categoryPair = [from.pathname, to.pathname].includes('/category')
  const entryPair = (home(from.pathname) && ['/brands', '/search', '/all-products'].includes(to.pathname)) ||
    (home(to.pathname) && ['/brands', '/search', '/all-products'].includes(from.pathname))
  return (categoryPair || entryPair) && from.pathname in depth && to.pathname in depth ? Math.sign(depth[to.pathname] - depth[from.pathname]) : 0
}
function activeDialog() { return Array.from(document.querySelectorAll<HTMLElement>('.loft-modal, [data-surface-dialog]')).at(-1) }
function content() {
  const dialog = activeDialog()
  if (dialog) {
    const body = dialog.querySelector<HTMLElement>('[data-profile-detail-content], .overflow-y-auto')
    if (body) return body
    if (!dialog.querySelector('.loft-header')) return dialog
  }
  return document.querySelector<HTMLElement>('[data-profile-detail-content]') ||
    Array.from(document.querySelectorAll<HTMLElement>('[data-loft-content]')).find(element => !element.querySelector('[data-loft-content], .loft-header, .loft-navigation, .loft-modal'))
}
function floating() {
  const dialog = activeDialog()
  return dialog ? dialog.querySelector<HTMLElement>('.fixed') : document.querySelector<HTMLElement>('[data-route-floating]')
}
/** Retain only a noninteractive copy of the outgoing viewport. Live destination
 * content slides independently; fixed chrome never enters a transformed parent. */
export function prepareTabMotion(from: Page, to: Page, internalDirection = 0) {
  const direction = internalDirection || tabDirection(from, to)
  const kind = internalDirection ? 'section' : 'tabs'
  const source = content()
  if (!direction || !source) return null
  const width = innerWidth
  const copies: HTMLElement[] = []
  const targets: HTMLElement[] = []
  const animations: Animation[] = []
  let cleaned = false
  const snapshot = (element: HTMLElement | null | undefined, zIndex: number) => {
    if (!element) return
    const rect = element.getBoundingClientRect()
    const header = internalDirection ? Array.from(document.querySelectorAll<HTMLElement>('.loft-header')).at(-1) : null
    const navigation = internalDirection ? document.querySelector<HTMLElement>('.loft-navigation') : null
    const top = Math.max(0, rect.top, header?.getBoundingClientRect().bottom || 0)
    const bottom = Math.min(innerHeight, rect.bottom, navigation?.getBoundingClientRect().top || innerHeight)
    if (!rect.width || bottom <= top) return
    const viewport = document.createElement('div')
    viewport.dataset.tabOutgoing = 'true'
    viewport.dataset.sourceScroll = String(element.scrollTop)
    viewport.setAttribute('aria-hidden', 'true')
    viewport.inert = true
    Object.assign(viewport.style, { position: 'fixed', left: `${rect.left}px`, top: `${top}px`, width: `${rect.width}px`, height: `${bottom - top}px`, overflow: 'hidden', pointerEvents: 'none', zIndex: String(zIndex), transition: 'none' })
    const clone = element.cloneNode(true) as HTMLElement
    for (const node of [clone, ...clone.querySelectorAll<HTMLElement>('*')]) {
      node.removeAttribute('id')
      for (const attribute of [...node.attributes]) if (attribute.name.startsWith('data-')) node.removeAttribute(attribute.name)
      node.style.removeProperty('view-transition-name')
    }
    Object.assign(clone.style, { position: 'absolute', top: `${rect.top - top}px`, left: '0px', right: 'auto', bottom: 'auto', width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', transition: 'none' })
    clone.scrollTop = element.scrollTop
    viewport.append(clone)
    copies.push(viewport)
  }
  snapshot(source, internalDirection ? 60 : 5)
  snapshot(floating(), 40)
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    animations.forEach(animation => animation.cancel())
    copies.forEach(copy => copy.remove())
    targets.forEach(target => target.removeAttribute('data-tab-incoming'))
    delete document.documentElement.dataset.loftTabMotion
  }
  return {
    cleanup,
    run() {
      document.documentElement.dataset.loftTabMotion = 'true'
      const timing = { duration: motionTiming.page * 1000, easing: motionEaseCSS, fill: 'both' as const }
      for (const element of [content(), floating()]) {
        if (!element) continue
        element.dataset.tabIncoming = 'true'
        targets.push(element)
        animations.push(element.animate([{ translate: `${direction * width}px 0` }, { translate: '0px 0' }], timing))
      }
      for (const copy of copies) {
        document.body.append(copy)
        ;(copy.firstElementChild as HTMLElement).scrollTop = Number(copy.dataset.sourceScroll)
        animations.push(copy.animate([{ translate: '0px 0' }, { translate: `${-direction * width}px 0` }], timing))
      }
      const finished = Promise.allSettled(animations.map(animation => animation.finished)).then(() => { cleanup() })
      window.dispatchEvent(new CustomEvent('loft:tabs-start', { detail: { kind, direction, animations, finished } }))
      return finished
    },
  }
}
