/** Remove press-scale interpolation before the browser takes a shared snapshot. */
export function markSharedElement(element: HTMLElement, name: string) {
  const card = element.closest<HTMLElement>('[data-product-card], [data-profile-link], [data-surface-link]')
  if (card) card.dataset.loftSharedSource = 'true'
  element.getBoundingClientRect()
  element.style.viewTransitionName = name
}
export function clearSharedSources() {
  document.querySelectorAll('[data-loft-shared-source]').forEach(element => element.removeAttribute('data-loft-shared-source'))
}

/** Capture only the visible content on a fixed viewport canvas. Sections slide
 * at their natural size; neither text nor tall offscreen lists are magnified. */
export function captureSurfaceFrame(content: HTMLElement) {
  const rect = content.getBoundingClientRect()
  const header = Array.from(document.querySelectorAll<HTMLElement>('.loft-header')).at(-1)
  const top = Math.max(0, header?.getBoundingClientRect().bottom || 0)
  const bottom = innerHeight
  if (bottom <= top || rect.width <= 0) return null
  const frame = document.createElement('div')
  frame.dataset.loftSurfaceFrame = 'true'
  frame.setAttribute('aria-hidden', 'true')
  frame.inert = true
  Object.assign(frame.style, { position: 'fixed', top: `${top}px`, left: '0px', width: `${innerWidth}px`, height: `${bottom - top}px`, overflow: 'hidden', borderRadius: '0px', pointerEvents: 'none', zIndex: '1000' })
  const clone = content.cloneNode(true) as HTMLElement
  for (const node of [clone, ...clone.querySelectorAll<HTMLElement>('*')]) {
    node.removeAttribute('id')
    for (const attribute of [...node.attributes]) if (attribute.name.startsWith('data-')) node.removeAttribute(attribute.name)
    node.style.removeProperty('view-transition-name')
  }
  Object.assign(clone.style, { position: 'absolute', top: `${rect.top - top}px`, left: `${rect.left}px`, right: 'auto', bottom: 'auto', width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', opacity: '1', transition: 'none' })
  frame.append(clone)
  document.body.append(frame)
  clone.scrollTop = content.scrollTop
  content.dataset.loftSurfaceHidden = 'true'
  return frame
}
export function clearSurfaceFrames() {
  document.querySelectorAll('[data-loft-surface-frame]').forEach(element => element.remove())
  document.querySelectorAll('[data-loft-surface-hidden]').forEach(element => element.removeAttribute('data-loft-surface-hidden'))
}
