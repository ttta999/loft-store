import { motionEaseCSS, motionTiming } from './motion'
type Page = { pathname: string }
const order: Record<string, number> = { '/': 0, '/home': 0, '/cart': 1, '/china': 2, '/profile': 3 }
export function tabDirection(from: Page, to: Page) {
  const a = order[from.pathname], b = order[to.pathname]
  return a !== undefined && b !== undefined && a !== b ? Math.sign(b - a) : 0
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
export function prepareTabMotion(from: Page, to: Page) {
  const direction = tabDirection(from, to)
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
    const top = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom)
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
      node.removeAttribute('data-loft-dismiss')
      node.removeAttribute('data-surface-dialog')
      node.style.removeProperty('view-transition-name')
    }
    Object.assign(clone.style, { position: 'absolute', top: `${rect.top - top}px`, left: '0px', right: 'auto', bottom: 'auto', width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', transition: 'none' })
    clone.scrollTop = element.scrollTop
    viewport.append(clone)
    copies.push(viewport)
  }
  snapshot(source, 5)
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
      window.dispatchEvent(new CustomEvent('loft:tabs-start', { detail: { direction, animations, finished } }))
      return finished
    },
  }
}
