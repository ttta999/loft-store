import { motionEaseCSS, motionTiming } from './motion'
import { visibleGridCards } from './transitionGrid'
import type { ProductReturnTrace } from './productReturnTrace'
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
  const legal = (path:string) => path === '/privacy' || path === '/terms'
  if (from.pathname === '/profile' && legal(to.pathname)) return 1
  if (to.pathname === '/profile' && legal(from.pathname)) return -1
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
/** Keep the grid's full footprint, but copy only the rows the outgoing
 * viewport can show. Grid rows are ordered, so long lists need few layout reads. */
function cloneViewport(element: HTMLElement, top: number, bottom: number, cloneBranch: (element: Node) => Node) {
  const grids = element.querySelectorAll<HTMLElement>('[data-transition-product-grid]')
  if (!grids.length) return cloneBranch(element) as HTMLElement

  const branches = new Set<Element>()
  for (const grid of grids) {
    for (let node: Element | null = grid; node && node !== element; node = node.parentElement) {
      if (branches.has(node)) break
      branches.add(node)
    }
  }

  function copy(node: Element): Node {
    if (node instanceof HTMLElement && node.hasAttribute('data-transition-product-grid')) {
      const grid = node.cloneNode(false) as HTMLElement
      const rect = node.getBoundingClientRect()
      Object.assign(grid.style, { position: 'relative', height: `${rect.height}px` })
      for (const { card, box } of visibleGridCards(node, rect, top, bottom, 16)) {
        const clone = cloneBranch(card) as HTMLElement
        Object.assign(clone.style, {
          position: 'absolute', margin: '0', gridArea: 'auto',
          top: `${box.top - rect.top}px`, left: `${box.left - rect.left}px`,
          width: `${box.width}px`, height: `${box.height}px`,
        })
        grid.append(clone)
      }
      return grid
    }
    const clone = node.cloneNode(false)
    for (const child of node.childNodes) {
      clone.appendChild(child instanceof Element && branches.has(child) ? copy(child) : cloneBranch(child))
    }
    return clone
  }

  return copy(element) as HTMLElement
}

/** Move a noninteractive outgoing viewport and the live destination. */
export function prepareTabMotion(from: Page, to: Page, internalDirection = 0, productBack = false, trace?: ProductReturnTrace) {
  const direction = internalDirection || tabDirection(from, to)
  const kind = productBack ? 'product-back' : internalDirection ? 'section' : 'tabs'
  const source = productBack ? document.querySelector<HTMLElement>('[data-product-surface]') : content()
  if (!direction || !source) return null
  const width = innerWidth
  const copies: HTMLElement[] = []
  const photos: { source: HTMLImageElement; placeholder: HTMLImageElement }[] = []
  const targets: HTMLElement[] = []
  const animations: Animation[] = []
  let cleaned = false
  let firstFrame = 0
  let incomingNavigation: HTMLElement | null = null
  let releaseViewport: (() => void) | undefined
  const header = internalDirection ? Array.from(document.querySelectorAll<HTMLElement>('.loft-header')).at(-1) : null
  const navigation = internalDirection ? document.querySelector<HTMLElement>('.loft-navigation') : null
  const headerBottom = header?.getBoundingClientRect().bottom ?? 0
  const navigationTop = navigation?.getBoundingClientRect().top ?? innerHeight
  const snapshot = (element: HTMLElement | null | undefined, zIndex: number) => {
    if (!element) return
    const rect = element.getBoundingClientRect()
    const top = Math.max(0, rect.top, headerBottom)
    const bottom = Math.min(innerHeight, rect.bottom, navigationTop)
    if (!rect.width || bottom <= top) return
    const viewport = document.createElement('div')
    viewport.dataset.tabOutgoing = 'true'
    viewport.dataset.sourceScroll = String(element.scrollTop)
    viewport.setAttribute('aria-hidden', 'true')
    viewport.inert = true
    Object.assign(viewport.style, { position: 'fixed', left: `${rect.left}px`, top: `${top}px`, width: `${rect.width}px`, height: `${bottom - top}px`, overflow: 'hidden', pointerEvents: 'none', zIndex: String(zIndex), transition: 'none' })
    const clone = cloneViewport(element, top, bottom, branch => {
      const copy = branch.cloneNode(true)
      if (productBack && branch instanceof Element && copy instanceof Element) {
        const originals = branch.querySelectorAll('img')
        const placeholders = copy.querySelectorAll('img')
        originals.forEach((image, index) => {
          if (!image.complete || !image.naturalWidth) return
          const box = image.getBoundingClientRect()
          if (box.width && box.height && box.bottom > top && box.top < bottom) {
            photos.push({ source: image, placeholder: placeholders[index] })
          }
        })
      }
      return copy
    })
    for (const node of [clone, ...clone.querySelectorAll<HTMLElement>('*')]) {
      node.removeAttribute('id')
      for (const attribute of [...node.attributes]) if (attribute.name.startsWith('data-')) node.removeAttribute(attribute.name)
      node.style.removeProperty('view-transition-name')
    }
    if (productBack) {
      const header = clone.querySelector<HTMLElement>('.loft-header')
      if (header) Object.assign(header.style, { position: 'static', visibility: 'hidden' })
    }
    Object.assign(clone.style, { position: 'absolute', top: `${rect.top - top}px`, left: '0px', right: 'auto', bottom: 'auto', width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', transition: 'none' })
    clone.scrollTop = element.scrollTop
    viewport.append(clone)
    copies.push(viewport)
  }
  // Keep the product slice below the live header and the arriving catalog
  // surface. Other section transitions retain their modal stacking order.
  snapshot(source, productBack ? 30 : internalDirection ? 60 : 5)
  snapshot(floating(), 40)
  trace?.mark('outgoingPrepared', copies.length)
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    cancelAnimationFrame(firstFrame)
    animations.forEach(animation => animation.cancel())
    copies.forEach(copy => copy.remove())
    targets.forEach(target => target.removeAttribute('data-tab-incoming'))
    releaseViewport?.()
    if (incomingNavigation) incomingNavigation.inert = false
    delete document.documentElement.dataset.loftTabMotion
    trace?.finish()
  }
  return {
    cleanup,
    run() {
      document.documentElement.dataset.loftTabMotion = 'true'
      // React removed the previous product. Keep its already decoded photos
      // alive for the outgoing frame instead of repainting fresh lazy clones.
      for (const { source, placeholder } of photos) {
        if (!source.isConnected) placeholder.replaceWith(source)
      }
      incomingNavigation = productBack ? document.querySelector<HTMLElement>('.loft-navigation') : null
      if (incomingNavigation) incomingNavigation.inert = true
      const incomingContent = content()
      const incomingFloating = floating()
      const surface = incomingNavigation?.closest<HTMLElement>('[data-product-return-surface]')
      // Keep fixed controls and portal content in their original containing blocks.
      const canClip = productBack && incomingContent && !incomingContent.querySelector('.fixed, .sticky')
      const sharedSurface = canClip && surface?.contains(incomingContent) && !incomingFloating ? surface : null
      const clipped = sharedSurface || (canClip && incomingContent.querySelector('[data-transition-product-grid]') ? incomingContent : null)
      if (clipped) {
        const visualViewport = window.visualViewport
        const viewportBottomOffset = sharedSurface && incomingNavigation
          ? incomingNavigation.getBoundingClientRect().bottom - innerHeight : 0
        let viewportFrame = 0
        let previous = ''
        const syncViewport = () => {
          const rect = clipped.getBoundingClientRect()
          const bottom = rect.bottom - innerHeight - viewportBottomOffset
          const viewportTop = visualViewport?.offsetTop ?? 0
          const viewportBottom = Math.min(innerHeight, viewportTop + (visualViewport?.height ?? innerHeight))
          const clip = `inset(${viewportTop - rect.top}px 0 ${rect.bottom - viewportBottom}px)`
          const geometry = `${bottom} ${clip}`
          if (geometry === previous) return
          previous = geometry
          if (sharedSurface) clipped.style.setProperty('--loft-return-navigation-bottom', `${bottom}px`)
          clipped.style.setProperty('--loft-return-clip', clip)
        }
        const scheduleViewport = () => {
          if (viewportFrame) return
          viewportFrame = requestAnimationFrame(() => {
            viewportFrame = 0
            syncViewport()
          })
        }
        syncViewport()
        clipped.dataset.loftReturnClip = ''
        const observer = new ResizeObserver(syncViewport)
        observer.observe(clipped)
        window.addEventListener('resize', scheduleViewport)
        window.addEventListener('scroll', scheduleViewport, { passive: true })
        visualViewport?.addEventListener('resize', scheduleViewport)
        visualViewport?.addEventListener('scroll', scheduleViewport)
        releaseViewport = () => {
          cancelAnimationFrame(viewportFrame)
          observer.disconnect()
          window.removeEventListener('resize', scheduleViewport)
          window.removeEventListener('scroll', scheduleViewport)
          visualViewport?.removeEventListener('resize', scheduleViewport)
          visualViewport?.removeEventListener('scroll', scheduleViewport)
          delete clipped.dataset.loftReturnClip
          clipped.style.removeProperty('--loft-return-navigation-bottom')
          clipped.style.removeProperty('--loft-return-clip')
        }
      }
      const timing = { duration: motionTiming.page * 1000, easing: motionEaseCSS, fill: 'both' as const }
      const incoming = sharedSurface ? [sharedSurface] : [incomingContent, incomingFloating, incomingNavigation]
      for (const element of incoming) {
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
      const finished = Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (!cleaned) trace?.mark('animationFinished')
        cleanup()
      })
      const announce = () => window.dispatchEvent(new CustomEvent('loft:tabs-start', { detail: { kind, direction, animations, finished } }))
      if (productBack && animations.length) {
        trace?.mark('animationsCreated', animations.length)
        for (const animation of animations) {
          animation.pause()
          animation.currentTime = 0
        }
        // The previous timeline tick can predate the React commit and image
        // setup. Hold the prepared layers at zero until the browser's next frame.
        firstFrame = requestAnimationFrame(timestamp => {
          const startTime = document.timeline.currentTime ?? timestamp
          for (const animation of animations) {
            animation.play()
            animation.startTime = startTime
          }
          trace?.sample(animations[0], incoming.find(element => element !== null), width)
          announce()
        })
      } else {
        announce()
      }
      return finished
    },
  }
}
