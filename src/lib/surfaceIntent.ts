import { warmPage } from './pagePreload'
type Page = { key: string; pathname: string }
let intent: { key: string; item: string; path: string } | null = null

export function installSurfaceIntent(location: () => Page) {
  const capture = (event: Event) => {
    const source = (event.target as Element | null)?.closest<HTMLElement>('[data-surface-link]')
    if (!source?.dataset.surfaceTo) return
    warmPage(source.dataset.surfaceTo)
    if (event.type !== 'click') return
    intent = { key: location().key, item: source.dataset.surfaceLink!, path: source.dataset.surfaceTo }
  }
  document.addEventListener('click', capture, true)
  document.addEventListener('pointerover', capture, { passive: true })
  document.addEventListener('focusin', capture)
  return () => { document.removeEventListener('click', capture, true); document.removeEventListener('pointerover', capture); document.removeEventListener('focusin', capture) }
}
export function getSurfaceIntent(from: Page, to: Page) {
  return intent?.key === from.key && intent.path === to.pathname && from.key !== to.key ? intent.item : undefined
}
export function consumeSurfaceIntent() { intent = null }
