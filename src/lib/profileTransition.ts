import { consumeSurfaceIntent, getSurfaceIntent } from './surfaceIntent'
import { clearSharedSources, markSharedElement } from './sharedElement'
type Page = { key: string; pathname: string; search: string }
type Origin = { key: string; item: string }
const origins = new Map<string, Origin>()
const surfaceName = 'loft-profile-surface'
const iconName = 'loft-profile-icon'

function find(attribute: string, value: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[${attribute}]`)).find(element => element.getAttribute(attribute) === value)
}
function surface(destination: boolean, value: string) {
  return find(destination ? 'data-surface' : 'data-surface-link', value) || find(destination ? 'data-profile-surface' : 'data-profile-link', value)
}
export function hasSurfaceNavigation(from: Page, to: Page) {
  return !!getSurfaceIntent(from, to) || origins.get(from.key)?.key === to.key
}
export function inheritSurfaceOrigin(from: Page, to: Page) {
  const origin = origins.get(from.key)
  if (origin && from.pathname === to.pathname) origins.set(to.key, origin)
}
function visible(element?: HTMLElement) {
  if (!element?.isConnected) return false
  const rect = element.getBoundingClientRect()
  const top = element.closest('.loft-header') ? 0 : 72
  return rect.width > 0 && rect.height > 0 && rect.bottom > top && rect.top < innerHeight - 90
}
function mark(element: HTMLElement) {
  markSharedElement(element, surfaceName)
  const icon = element.querySelector<HTMLElement>('[data-profile-icon]')
  if (icon) icon.style.viewTransitionName = iconName
}
export function clearProfileNames(keepMetrics = false) {
  clearSharedSources()
  if (!keepMetrics) for (const name of ['source-width', 'source-height', 'target-width', 'target-height']) document.documentElement.style.removeProperty(`--loft-surface-${name}`)
  document.querySelectorAll<HTMLElement>('[style*="loft-profile-"]').forEach(element => element.style.removeProperty('view-transition-name'))
}

/** Pair the selected tile/row with its destination card, never the fixed app chrome. */
export function prepareProfileTransition(from: Page, to: Page) {
  clearProfileNames()
  const previous = new URLSearchParams(from.search)
  const next = new URLSearchParams(to.search)
  let item: string | undefined = getSurfaceIntent(from, to)
  if (from.pathname === '/profile') {
    if (to.pathname === '/profile') {
      const section = next.get('section')
      if ((!previous.get('section') || previous.get('section') === 'main') && section && section !== 'main') item = section
      else if (previous.get('section') === section && !previous.get('order') && !previous.get('request')) {
        if (section === 'orders' && next.get('order')) item = `order:${next.get('order')}`
        if (section === 'china' && next.get('request')) item = `request:${next.get('request')}`
      }
    } else if (previous.get('section') === 'settings' && ['/privacy', '/terms'].includes(to.pathname)) item = to.pathname.slice(1)
  }
  const saved = origins.get(from.key)
  const returning = !item && saved?.key === to.key
  const origin = item ? { key: from.key, item } : returning ? saved : undefined
  if (!origin) return null
  // Opening starts at a link; returning starts at the destination card.
  const start = returning ? surface(true, origin.item) : surface(false, origin.item)
  if (!start || !visible(start)) return null
  consumeSurfaceIntent()
  const source = start
  const sourceRect = source.getBoundingClientRect()
  document.documentElement.style.setProperty('--loft-surface-source-width', `${sourceRect.width}px`)
  document.documentElement.style.setProperty('--loft-surface-source-height', `${sourceRect.height}px`)
  mark(source)
  if (!returning) {
    origins.set(to.key, origin)
    while (origins.size > 60) origins.delete(origins.keys().next().value!)
  }
  return {
    async finish(valid: () => boolean) {
      const target = surface(!returning, origin.item)
      if (!valid() || !target || !visible(target)) return false
      // Detail dialogs keep their source list mounted behind them.
      // Remove its live name before naming the destination snapshot.
      clearProfileNames(true)
      const destination = target
      const targetRect = destination.getBoundingClientRect()
      document.documentElement.style.setProperty('--loft-surface-target-width', `${targetRect.width}px`)
      document.documentElement.style.setProperty('--loft-surface-target-height', `${targetRect.height}px`)
      mark(destination)
      return true
    },
  }
}
