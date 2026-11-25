import type { prepareTabMotion } from './tabTransition'
import { showReturnPhotos, type takeReturnPhotos } from './productReturnPhotos'
import type { ProductReturnTrace } from './productReturnTrace'
import { motionEaseCSS, motionTiming } from './motion'

const duration = motionTiming.page * 1000
const options = { duration, easing: motionEaseCSS, fill: 'forwards' } as const

/** One photo owns the return, below the stationary header, even when WebKit
 * changes the viewport after releasing a size-sheet or gallery scroll lock. */
export function productReturnMotion(source: HTMLImageElement | null, restore: (valid: () => boolean) => HTMLImageElement | null, prepareSlide: () => ReturnType<typeof prepareTabMotion>, photos: ReturnType<typeof takeReturnPhotos>, trace?: ProductReturnTrace) {
  const origin = source?.getBoundingClientRect()
  const viewport = window.visualViewport
  const headerBottom = document.querySelector('.loft-header')?.getBoundingClientRect().bottom ?? 0
  const viewportTop = viewport?.offsetTop ?? 0
  const viewportBottom = Math.min(innerHeight, viewportTop + (viewport?.height ?? innerHeight))
  const floating = document.querySelector('.loft-navigation, [data-route-floating]')?.getBoundingClientRect()
  const visibleBottom = floating?.height && origin && floating.left < origin.right && floating.right > origin.left
    ? Math.min(floating.top, viewportBottom) : viewportBottom
  const visibleTop = Math.max(viewportTop, headerBottom)
  const sharePhoto = source?.complete && source.naturalWidth && origin?.width && origin.height &&
    Math.min(origin.bottom, visibleBottom) - Math.max(origin.top, visibleTop) >= origin.height * 0.7 &&
    getComputedStyle(source).visibility === 'visible'
  const layer = sharePhoto ? document.createElement('div') : null

  let slide: ReturnType<typeof prepareTabMotion>
  let animation: Animation | undefined
  const companions: Animation[] = []
  let frame = 0
  let target: HTMLImageElement | null = null
  let oldVisibility = ''
  let lastDestination: DOMRect | undefined
  let finishedAlready = false
  let started = 0
  let resizeObserver: ResizeObserver | undefined
  let resolveFinished!: () => void
  const finished = new Promise<void>(resolve => { resolveFinished = resolve })

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; retarget() })
  }
  const cleanup = () => {
    if (finishedAlready) return
    finishedAlready = true
    cancelAnimationFrame(frame)
    resizeObserver?.disconnect()
    animation?.cancel()
    for (const companion of companions) companion.cancel()
    layer?.remove()
    slide?.cleanup()
    if (target) target.style.visibility = oldVisibility
    window.removeEventListener('resize', schedule)
    viewport?.removeEventListener('resize', schedule)
    viewport?.removeEventListener('scroll', schedule)
    resolveFinished()
  }
  function retarget() {
    if (!layer || !target?.isConnected || finishedAlready) return
    const destination = target.getBoundingClientRect()
    const remaining = duration - (performance.now() - started)
    if (!destination.width || remaining <= 0) { cleanup(); return }
    if (lastDestination && (['left', 'top', 'width', 'height'] as const)
      .every(key => Math.abs(destination[key] - lastDestination![key]) < 0.5)) return
    lastDestination = destination
    const transform = getComputedStyle(layer).transform
    const borderRadius = getComputedStyle(layer).borderRadius
    animation?.cancel()
    const scale = destination.width / (origin?.width || layer.offsetWidth)
    const radius = getComputedStyle(target).borderRadius
    const endRadius = (radius === '0px' ? '16px 16px 0px 0px' : radius)
      .replace(/[\d.]+px/g, value => `${parseFloat(value) / scale}px`)
    const destinationX = destination.left - Number.parseFloat(layer.style.left)
    const destinationY = destination.top - Number.parseFloat(layer.style.top)
    animation = layer.animate([
      { transform, borderRadius },
      { transform: `translate3d(${destinationX}px,${destinationY}px,0) scale(${scale},${destination.height / (origin?.height || layer.offsetHeight)})`, borderRadius: endRadius },
    ], { ...options, duration: remaining })
    void animation.finished.then(cleanup).catch(() => {})
  }
  return {
    cancel: cleanup,
    async play(apply: () => void, valid: () => boolean) {
      if (!layer) {
        trace?.mark('preparationStarted')
        slide = prepareSlide()
      }
      if (layer && source && origin) {
        layer.dataset.productReturnOverlay = 'true'
        layer.setAttribute('aria-hidden', 'true')
        layer.inert = true
        Object.assign(layer.style, {
          position: 'fixed', left: `${origin.left}px`, top: `${origin.top}px`,
          width: `${origin.width}px`, height: `${origin.height}px`, zIndex: '39',
          pointerEvents: 'none', overflow: 'hidden', transformOrigin: '0 0',
          willChange: 'transform', transition: 'none', borderRadius: '16px 16px 0 0',
        })
      }
      apply()
      if (slide) trace?.mark('catalogCommitted')
      if (!valid() || finishedAlready) { cleanup(); return }
      // Reuse the old decoded image after React has detached its route. Avoid
      // a second decode or an empty replacement over the restored card.
      if (layer && source && !source.isConnected) {
        source.removeAttribute('style')
        source.removeAttribute('data-product-hero')
        source.alt = ''
        source.className = 'block size-full object-cover'
        layer.append(source)
        document.body.append(layer)
      }
      const destination = restore(valid)
      if (slide) {
        trace?.mark('scrollRestored')
        const visiblePhotos = showReturnPhotos(photos)
        trace?.mark('visiblePhotos', visiblePhotos.visible, visiblePhotos.loaded, visiblePhotos.reused)
        try {
          await slide.run()
        } finally {
          visiblePhotos.release()
        }
        cleanup()
        return
      }
      if (!destination || !layer?.isConnected) {
        // The origin may have been removed or filtered out.
        const fade = { duration: motionTiming.feedback * 1000, easing: motionEaseCSS }
        if (layer?.isConnected) companions.push(layer.animate([{ opacity: 1 }, { opacity: 0 }], fade))
        await Promise.allSettled(companions.map(effect => effect.finished))
        cleanup()
        return
      }

      target = destination
      target.style.removeProperty('view-transition-name')
      oldVisibility = target.style.visibility
      target.style.visibility = 'hidden'
      if (target.complete && target.naturalWidth && (source?.currentSrc || source?.src) !== (target.currentSrc || target.src)) {
        const image = target.cloneNode() as HTMLImageElement
        image.removeAttribute('style')
        image.className = 'absolute inset-0 size-full object-cover'
        image.alt = ''
        image.loading = 'eager'
        if (image.complete && image.naturalWidth) {
          layer.append(image)
          companions.push(image.animate([{ opacity: 0 }, { opacity: 1 }], options))
        }
      }
      started = performance.now()
      window.addEventListener('resize', schedule)
      viewport?.addEventListener('resize', schedule)
      viewport?.addEventListener('scroll', schedule)
      resizeObserver = new ResizeObserver(schedule)
      resizeObserver.observe(target)
      retarget()
      window.dispatchEvent(new CustomEvent('loft:product-return-start', { detail: { finished, duration } }))
      await finished
    },
  }
}
