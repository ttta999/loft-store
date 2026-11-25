import { visibleGridCards } from './transitionGrid'

type Photos = Map<string, HTMLImageElement>
const retained = new Map<string, Photos>()
const gridSelector = '[data-transition-product-grid]'
const photoKey = (card: Element, image: HTMLImageElement) =>
  [card.getAttribute('data-product-placement') ?? card.getAttribute('data-product-card'), image.currentSrc || image.src].join('\n')

function viewportPhotos() {
  const viewport = window.visualViewport
  const top = Math.max(viewport?.offsetTop ?? 0, document.querySelector('.loft-header')?.getBoundingClientRect().bottom ?? 0)
  const chrome = document.querySelector('.loft-navigation')?.getBoundingClientRect().top ?? innerHeight
  const bottom = Math.min(chrome, (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight))
  return Array.from(document.querySelectorAll<HTMLElement>(gridSelector)).flatMap(grid =>
    visibleGridCards(grid, grid.getBoundingClientRect(), top, bottom).flatMap(({ card }) => {
      const image = card.querySelector<HTMLImageElement>('img')
      if (!card.hasAttribute('data-product-card') || !image?.parentElement?.classList.contains('relative')) return []
      const rect = image.getBoundingClientRect()
      return rect.width && rect.left < innerWidth && rect.right > 0 && rect.bottom > top && rect.top < bottom
        ? [{ card, image }] : []
    }),
  )
}

export function captureReturnPhotos(): Photos {
  const result: Photos = new Map()
  for (const { card, image } of viewportPhotos()) {
    if (image.complete && image.naturalWidth) result.set(photoKey(card, image), image)
    if (result.size >= 12) break
  }
  return result
}

export function retainReturnPhotos(key: string, photos: Photos) {
  const detached: Photos = new Map()
  for (const [match, image] of photos) {
    if (image.isConnected) continue
    // Leave the old React tree available for collection while holding its photo.
    image.remove()
    detached.set(match, image)
  }
  if (!detached.size) return
  retained.set(key, detached)
  // Allow a nested product to retain the parent view's recommendations.
  while (retained.size > 2) retained.delete(retained.keys().next().value!)
}

export function takeReturnPhotos(key: string) {
  const photos = retained.get(key)
  retained.delete(key)
  return photos
}

export function showReturnPhotos(photos: Photos | undefined) {
  const mounted: { retained: HTMLImageElement; ready: Promise<void> }[] = []
  let visible = 0
  let loaded = 0
  if (photos?.size) for (const { card, image } of viewportPhotos()) {
    visible++
    if (image.complete && image.naturalWidth) loaded++
    const key = photoKey(card, image)
    const previous = photos.get(key)
    if (!previous) continue
    photos.delete(key)
    previous.removeAttribute('style')
    previous.dataset.loftReturnPhoto = ''
    previous.alt = ''
    previous.setAttribute('aria-hidden', 'true')
    previous.className = `${image.className} absolute inset-0 pointer-events-none`
    image.after(previous)
    image.loading = 'eager'
    mounted.push({ retained: previous, ready: image.decode().catch(() => {}) })
  }
  photos?.clear()
  return {
    visible, loaded, reused: mounted.length,
    release() {
      for (const { retained, ready } of mounted) void ready.then(() => retained.remove())
    },
  }
}
