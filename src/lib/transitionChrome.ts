/** Capture only destination chrome. Unmatched snapshots never interpolate from
 * a previous sticky position, and stay above shared photos/content. */
export function captureTransitionChrome() {
  clearTransitionChrome()
  const headers = Array.from(document.querySelectorAll<HTMLElement>('.loft-header'))
  const header = headers.filter(element => {
    const rect = element.getBoundingClientRect()
    return rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight
  }).at(-1)
  const navigation = document.querySelector<HTMLElement>('.loft-navigation')
  for (const [element, name] of [[header, 'loft-static-header'], [navigation, 'loft-static-navigation']] as const) {
    if (!element) continue
    element.dataset.loftChrome = 'true'
    element.style.viewTransitionName = name
  }
}
export function clearTransitionChrome() {
  document.querySelectorAll<HTMLElement>('[data-loft-chrome]').forEach(element => {
    element.style.removeProperty('view-transition-name')
    delete element.dataset.loftChrome
  })
}
