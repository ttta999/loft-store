import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import ScrollRestoration from './ScrollRestoration'

function RouteFrame() {
  return <><ScrollRestoration /><Outlet /></>
}

/** Crossfade snapshots without moving or scaling the page. */
export default function AnimatedRoutes({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [displayed, setDisplayed] = useState(location)
  const generation = useRef(0)

  useLayoutEffect(() => {
    if (displayed === location) return
    const current = ++generation.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const authBoundary = displayed.pathname === '/login' || location.pathname === '/login'
    if (reduced || authBoundary || displayed.pathname === location.pathname) {
      setDisplayed(location)
      return
    }
    const apply = () => {
      if (generation.current === current) flushSync(() => setDisplayed(location))
    }
    if (typeof document.startViewTransition === 'function') {
      const transition = document.startViewTransition(apply)
      void transition.ready.catch(() => {})
      void transition.updateCallbackDone.catch(() => {
        if (generation.current === current) setDisplayed(location)
      })
      void transition.finished.catch(() => {})
      return () => { generation.current++; transition.skipTransition() }
    }

    // Older WebViews fade the old page out before replacing it, avoiding a flash.
    const root = document.getElementById('root')
    if (!root?.animate) { setDisplayed(location); return }
    const easing = 'cubic-bezier(0.4, 0, 0.2, 1)'
    const out = root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing, fill: 'forwards' })
    let incoming: Animation | undefined
    void out.finished.then(async () => {
      if (generation.current !== current) return
      apply()
      incoming = root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing, fill: 'forwards' })
      await incoming.finished
      out.cancel()
      incoming.cancel()
    }).catch(() => {})
    return () => { generation.current++; out.cancel(); incoming?.cancel() }
    // displayed is a snapshot; only actual navigation starts a transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  return <Routes location={displayed}><Route element={<RouteFrame />}>{children}</Route></Routes>
}
