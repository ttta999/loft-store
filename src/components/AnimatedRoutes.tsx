import { preloadPage } from '../lib/pagePreload'
import { Suspense, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import ScrollRestoration from './ScrollRestoration'

function RouteFrame() {
  return <><ScrollRestoration /><Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Загрузка"><div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin" /></div>}><Outlet /></Suspense></>
}

/** Commit immediately; snapshots slide without waiting for an exit animation. */
export default function AnimatedRoutes({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const historyIndex = useRef(Number(window.history.state?.idx) || 0)
  const [displayed, setDisplayed] = useState(location)
  const generation = useRef(0)

  useLayoutEffect(() => {
    if (displayed === location) return
    const current = ++generation.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nextIndex = Number(window.history.state?.idx) || 0
    const backwards = navigationType === 'POP' && nextIndex < historyIndex.current
    historyIndex.current = nextIndex
    const samePage = displayed.pathname === location.pathname
    const sameSection = new URLSearchParams(displayed.search).get('section') === new URLSearchParams(location.search).get('section')
    const detailNavigation = samePage && sameSection && location.pathname === '/profile'
      && ['order', 'request'].some(key => new URLSearchParams(displayed.search).get(key) !== new URLSearchParams(location.search).get(key))
    delete document.documentElement.dataset.loftDetailTransition
    const authBoundary = displayed.pathname === '/login' || location.pathname === '/login'
    if (reduced || authBoundary || (samePage && sameSection && !detailNavigation)) {
      setDisplayed(location)
      return
    }
    const apply = () => {
      if (generation.current === current) flushSync(() => setDisplayed(location))
    }
    document.documentElement.dataset.loftDirection = backwards ? 'back' : 'forward'
    if (typeof document.startViewTransition === 'function') {
      if (detailNavigation) document.documentElement.dataset.loftDetailTransition = 'true'
      const transition = document.startViewTransition(async () => {
        await preloadPage(location.pathname)
        apply()
      })
      void transition.ready.catch(() => {})
      void transition.updateCallbackDone.catch(() => {
        if (generation.current === current) setDisplayed(location)
      })
      void transition.finished.finally(() => {
        if (generation.current === current) delete document.documentElement.dataset.loftDetailTransition
      }).catch(() => {})
      return () => { generation.current++; transition.skipTransition() }
    }

    // Older WebViews also switch immediately, then slide content only.
    // Fixed navigation and headers never gain a transformed ancestor.
    let frame = 0
    void preloadPage(location.pathname).catch(() => {}).then(() => {
      if (generation.current !== current) return
      apply()
      frame = requestAnimationFrame(() => {
        if (generation.current !== current) return
        const detail = document.querySelector<HTMLElement>('.loft-detail')
        const elements = detailNavigation ? (detail ? [detail] : []) : Array.from(document.querySelectorAll<HTMLElement>('[data-loft-content]'))
        animations = elements.map(element =>
          element.animate([{ translate: detailNavigation ? '100% 0' : `${backwards ? -32 : 32}px 0` }, { translate: '0 0' }],
          { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }))
      })
    })
    let animations: Animation[] = []
    return () => { generation.current++; cancelAnimationFrame(frame); animations.forEach(animation => animation.cancel()) }
    // displayed is a snapshot; only actual navigation starts a transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  return <Routes location={displayed}><Route element={<RouteFrame />}>{children}</Route></Routes>
}
