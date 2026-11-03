type Page = { key: string; pathname: string; search: string }
type Origin = { key: string; item: string }
const origins = new Map<string, Origin>()
const surfaceName = 'loft-profile-surface'
const iconName = 'loft-profile-icon'

function find(attribute: string, value: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[${attribute}]`)).find(element => element.getAttribute(attribute) === value)
}
function visible(element?: HTMLElement) {
  if (!element?.isConnected) return false
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0 && rect.bottom > 72 && rect.top < innerHeight - 90
}
function markContent() {
  document.querySelectorAll('[data-profile-snapshot]').forEach(element => element.removeAttribute('data-profile-snapshot'))
  const content = document.querySelector<HTMLElement>('[data-profile-detail-content]') ||
    Array.from(document.querySelectorAll<HTMLElement>('[data-loft-content]')).find(element => !element.querySelector('[data-loft-content], .loft-header, .loft-navigation, .loft-modal'))
  content?.setAttribute('data-profile-snapshot', 'true')
}
function mark(element: HTMLElement) {
  element.style.viewTransitionName = surfaceName
  const icon = element.querySelector<HTMLElement>('[data-profile-icon]')
  if (icon) icon.style.viewTransitionName = iconName
  markContent()
}
export function clearProfileNames() {
  document.querySelectorAll<HTMLElement>('[style*="loft-profile-"]').forEach(element => element.style.removeProperty('view-transition-name'))
  document.querySelectorAll('[data-profile-snapshot]').forEach(element => element.removeAttribute('data-profile-snapshot'))
}

/** Pair the selected tile/row with its destination card, never the fixed app chrome. */
export function prepareProfileTransition(from: Page, to: Page) {
  clearProfileNames()
  const previous = new URLSearchParams(from.search)
  const next = new URLSearchParams(to.search)
  let item: string | undefined
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
  const source = find(returning ? 'data-profile-surface' : 'data-profile-link', origin.item)
  if (!source || !visible(source)) return null
  mark(source)
  if (!returning) {
    origins.set(to.key, origin)
    while (origins.size > 60) origins.delete(origins.keys().next().value!)
  }
  return {
    async finish(valid: () => boolean) {
      const target = find(returning ? 'data-profile-link' : 'data-profile-surface', origin.item)
      if (!valid() || !target || !visible(target)) return false
      // Detail dialogs keep their source list mounted behind them.
      // Remove its live name before naming the destination snapshot.
      clearProfileNames()
      mark(target)
      return true
    },
  }
}
