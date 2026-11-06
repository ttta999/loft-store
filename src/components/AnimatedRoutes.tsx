import { motionDistance, motionEaseCSS, motionTiming } from '../lib/motion'
import { preloadPage } from '../lib/pagePreload'
import { clearProductNames, installProductIntent, prepareProductTransition } from '../lib/productTransition'
import { clearProfileNames, hasSurfaceNavigation, inheritSurfaceOrigin, prepareProfileTransition } from '../lib/profileTransition'
import { installSurfaceIntent } from '../lib/surfaceIntent'
import { installDialogOrigins } from '../lib/dialogOrigin'
import { prepareTabMotion, tabDirection } from '../lib/tabTransition'
import { captureTransitionChrome, clearTransitionChrome } from '../lib/transitionChrome'
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import ScrollRestoration, { captureScrollPosition } from './ScrollRestoration'

function RouteFrame() {
  return <><ScrollRestoration /><Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Загрузка"><div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin" /></div>}><Outlet /></Suspense></>
}

/** Shared elements move; destination chrome has static, unmatched snapshots. */
export default function AnimatedRoutes({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const latest = useRef(location)
  latest.current = location
  const [displayed, setDisplayed] = useState(location)
  const generation = useRef(0)
  const historyIndex = useRef(Number(history.state?.idx) || 0)
  useEffect(() => installProductIntent(() => latest.current), [])
  useEffect(() => installSurfaceIntent(() => latest.current), [])
  useEffect(() => installDialogOrigins(), [])

  useLayoutEffect(() => {
    if (displayed === location) return
    const current = ++generation.current
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const index = Number(history.state?.idx) || 0
    const backwards = navigationType === 'POP' && index < historyIndex.current
    historyIndex.current = index
    const samePath = displayed.pathname === location.pathname
    if (navigationType === 'REPLACE') inheritSurfaceOrigin(displayed, location)
    const sectionChanged = new URLSearchParams(displayed.search).get('section') !== new URLSearchParams(location.search).get('section')
    const detailChanged = samePath && location.pathname === '/profile' && displayed.search !== location.search
    const modalOnly = samePath && !sectionChanged && !detailChanged && !hasSurfaceNavigation(displayed, location)
    let transition: ViewTransition | undefined
    let animations: Animation[] = []
    let clearTabs: (() => void) | undefined
    const interrupt = () => { transition?.skipTransition(); clearTabs?.() }
    const stopListening = () => {
      window.removeEventListener('wheel', interrupt)
      window.removeEventListener('touchstart', interrupt)
      window.removeEventListener('pointerdown', interrupt)
    }
    let applied = false
    const apply = () => {
      if (generation.current !== current || applied) return
      applied = true
      captureScrollPosition(displayed.key)
      flushSync(() => setDisplayed(location))
    }
    if (modalOnly || reduced || location.pathname === '/login' || displayed.pathname === '/login') {
      captureScrollPosition(displayed.key)
      setDisplayed(location)
      return
    }
    void preloadPage(location.pathname).catch(() => {}).then(async () => {
      if (generation.current !== current) return
      const tabMotion = prepareTabMotion(displayed, location)
      if (tabMotion) {
        clearTabs = tabMotion.cleanup
        apply()
        if (generation.current !== current) { clearTabs(); return }
        const finished = tabMotion.run()
        window.addEventListener('wheel', interrupt, { passive: true })
        window.addEventListener('touchstart', interrupt, { passive: true })
        window.addEventListener('pointerdown', interrupt, { passive: true })
        void finished.finally(stopListening)
        return
      }
      const photo = typeof document.startViewTransition === 'function' ? prepareProductTransition(displayed, location) : null
      const profile = !photo && typeof document.startViewTransition === 'function' ? prepareProfileTransition(displayed, location) : null
      const shared = photo || profile
      if (shared) {
        // Pair the header on both sides: Safari can delay an unmatched new
        // header layer. Its group has no geometry animation in either case.
        captureTransitionChrome(true)
        document.documentElement.dataset.loftMotion = photo ? 'product' : 'profile'
        transition = document.startViewTransition(async () => {
          apply()
          if (generation.current !== current) return
          const matched = await shared.finish(() => generation.current === current)
          if (generation.current === current) captureTransitionChrome()
          if (generation.current === current && !matched) document.documentElement.dataset.loftMotion = 'dissolve'
        })
        window.addEventListener('wheel', interrupt, { passive: true })
        window.addEventListener('touchstart', interrupt, { passive: true })
        window.addEventListener('pointerdown', interrupt, { passive: true })
        void transition.ready.catch(() => {})
        void transition.updateCallbackDone.catch(apply)
        void transition.finished.finally(() => {
          stopListening()
          if (generation.current !== current) return
          clearProductNames()
          clearProfileNames()
          clearTransitionChrome()
          delete document.documentElement.dataset.loftMotion
          window.dispatchEvent(new Event('loft:transition-end'))
        }).catch(() => {})
        return
      }
      apply()
      if (generation.current !== current) return
      // Never transform ancestors of fixed headers, navigation or dialogs.
      const content = Array.from(document.querySelectorAll<HTMLElement>('[data-loft-content]'))
        .filter(element => !element.querySelector('[data-loft-content], .loft-header, .loft-navigation, .loft-modal'))
      const detail = document.querySelector<HTMLElement>('[data-profile-detail-content]')
      if (detail) content.splice(0, content.length, detail)
      animations = content.map(element => {
        const opacity = 1
        // A transform changes the containing block of fixed descendants.
        // Keep unknown fixed/sticky surfaces anchored even if a page omits a leaf marker.
        const fixed = element.querySelector('.fixed, .sticky')
        const direction = tabDirection(displayed, location) || (backwards ? -1 : 1)
        const distance = tabDirection(displayed, location) ? innerWidth : motionDistance.section
        const frames = fixed ? [{ opacity: 0.9 }, { opacity }] : [{ opacity, translate: `${direction * distance}px 0` }, { opacity, translate: '0 0' }]
        return element.animate(frames, { duration: motionTiming.page * 1000, easing: motionEaseCSS })
      })
    })
    return () => {
      generation.current++
      transition?.skipTransition()
      stopListening()
      animations.forEach(animation => animation.cancel())
      clearProductNames()
      clearProfileNames()
      clearTransitionChrome()
      clearTabs?.()
      delete document.documentElement.dataset.loftMotion
      window.dispatchEvent(new Event('loft:transition-end'))
    }
    // displayed is the last committed route, rather than an animation dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])
  return <Routes location={displayed}><Route element={<RouteFrame />}>{children}</Route></Routes>
}
