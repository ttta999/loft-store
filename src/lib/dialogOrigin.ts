type Origin = { element: HTMLElement; rect: DOMRect }
const origins = new Map<string, Origin>()
let lastAction: DOMRect | null = null

export function rememberDialogOrigin(key: string, element: HTMLElement) {
  origins.set(key, { element, rect: element.getBoundingClientRect() })
}
export function installDialogOrigins() {
  const capture = (event: Event) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>('button, [data-dialog-trigger]')
    if (!target) return
    lastAction = target.getBoundingClientRect()
    if (target.dataset.dialogTrigger) rememberDialogOrigin(target.dataset.dialogTrigger, target)
  }
  document.addEventListener('click', capture, true)
  return () => document.removeEventListener('click', capture, true)
}
function visible(rect: DOMRect | null | undefined) {
  return rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight ? rect : null
}
export function dialogOrigin(key: string, closing = false) {
  const origin = origins.get(key)
  const rect = origin?.element.isConnected ? origin.element.getBoundingClientRect() : closing ? null : origin?.rect
  return visible(rect)
}
export function lastDialogAction() { return visible(lastAction) }
export function dialogClip(rect: DOMRect | null) {
  return rect ? `inset(${Math.max(0, rect.top)}px ${Math.max(0, innerWidth - rect.right)}px ${Math.max(0, innerHeight - rect.bottom)}px ${Math.max(0, rect.left)}px round 16px)` : 'inset(0px 0px 0px 0px round 0px)'
}
