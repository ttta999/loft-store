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
