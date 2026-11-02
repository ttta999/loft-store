import { preloadPage } from '../lib/pagePreload'
import { clearProductNames, installProductIntent, prepareProductTransition } from '../lib/productTransition'
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import ScrollRestoration from './ScrollRestoration'

function RouteFrame() {
  return <><ScrollRestoration /><Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Загрузка"><div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin" /></div>}><Outlet /></Suspense></>
}

/** Chrome stays in the live DOM. Only product photos use document snapshots. */
export default function AnimatedRoutes({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const latest = useRef(location)
  latest.current = location
  const [displayed, setDisplayed] = useState(location)
  const generation = useRef(0)
  const historyIndex = useRef(Number(history.state?.idx) || 0)
  useEffect(() => installProductIntent(() => latest.current), [])

  useLayoutEffect(() => {
    if (displayed === location) return
    const current = ++generation.current
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const index = Number(history.state?.idx) || 0
    const backwards = navigationType === 'POP' && index < historyIndex.current
    historyIndex.current = index
    const samePath = displayed.pathname === location.pathname
    const sectionChanged = new URLSearchParams(displayed.search).get('section') !== new URLSearchParams(location.search).get('section')
    const modalOnly = samePath && !sectionChanged
    let transition: ViewTransition | undefined
    let animations: Animation[] = []
    let frame = 0
    const interrupt = () => transition?.skipTransition()
    const stopListening = () => {
      window.removeEventListener('wheel', interrupt)
      window.removeEventListener('touchstart', interrupt)
      window.removeEventListener('pointerdown', interrupt)
    }
    const apply = () => { if (generation.current === current) flushSync(() => setDisplayed(location)) }
    if (modalOnly || reduced || location.pathname === '/login' || displayed.pathname === '/login') {
      setDisplayed(location)
      return
    }
    void preloadPage(location.pathname).catch(() => {}).then(async () => {
      if (generation.current !== current) return
      const photo = typeof document.startViewTransition === 'function' ? prepareProductTransition(displayed, location) : null
      if (photo) {
        document.documentElement.dataset.loftMotion = 'product'
        transition = document.startViewTransition(async () => {
          apply()
          if (generation.current !== current) return
          const matched = await photo.finish(() => generation.current === current)
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
          delete document.documentElement.dataset.loftMotion
        }).catch(() => {})
        return
      }
      apply()
      frame = requestAnimationFrame(() => {
        if (generation.current !== current) return
        // Never transform ancestors of fixed headers, navigation or dialogs.
        const content = Array.from(document.querySelectorAll<HTMLElement>('[data-loft-content]'))
          .filter(element => !element.querySelector('[data-loft-content], .loft-header, .loft-navigation, .loft-modal'))
        animations = content.map(element => element.animate(
          sectionChanged ? [{ opacity: 0, translate: `${backwards ? -16 : 16}px 0` }, { opacity: 1, translate: '0 0' }] : [{ opacity: 0 }, { opacity: 1 }],
          { duration: sectionChanged ? 230 : 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }))
      })
    })
    return () => {
      generation.current++
      transition?.skipTransition()
      stopListening()
      animations.forEach(animation => animation.cancel())
      cancelAnimationFrame(frame)
      clearProductNames()
      delete document.documentElement.dataset.loftMotion
    }
    // displayed is the last committed route, rather than an animation dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])
  return <Routes location={displayed}><Route element={<RouteFrame />}>{children}</Route></Routes>
}
