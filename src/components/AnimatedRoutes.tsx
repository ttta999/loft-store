import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import ScrollRestoration from './ScrollRestoration'

const tabs = new Set(['/', '/home', '/search', '/cart', '/china', '/profile'])

function RouteFrame() {
  return <><ScrollRestoration /><Outlet /></>
}

/** Animate browser snapshots, never transform the live page or its fixed overlays. */
export default function AnimatedRoutes({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [displayed, setDisplayed] = useState(location)
  const generation = useRef(0)
  const active = useRef<ViewTransition | null>(null)
  const previousIndex = useRef<number | undefined>(window.history.state?.idx)

  useLayoutEffect(() => {
    if (displayed === location) return
    const current = ++generation.current
    const previousPath = displayed.pathname
    const nextIndex: number | undefined = window.history.state?.idx
    const back = nextIndex !== undefined && previousIndex.current !== undefined
      ? nextIndex < previousIndex.current : navigationType === 'POP'
    previousIndex.current = nextIndex
    active.current?.skipTransition()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Query changes (filters, order details) do not animate the entire page.
    const authBoundary = previousPath === '/login' || location.pathname === '/login'
    if (reduced || authBoundary || previousPath === location.pathname || typeof document.startViewTransition !== 'function') {
      setDisplayed(location)
      if (!reduced && previousPath !== location.pathname) {
        document.getElementById('root')?.animate?.([{ opacity: 0.88 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' })
      }
      return
    }

    document.documentElement.dataset.routeMotion = tabs.has(previousPath) && tabs.has(location.pathname)
      ? 'tab' : back ? 'back' : 'forward'
    const transition = document.startViewTransition(() => {
      if (generation.current === current) flushSync(() => setDisplayed(location))
    })
    active.current = transition
    // Skipped/superseded snapshots must never block navigation or reject unhandled.
    void transition.ready.catch(() => {})
    void transition.updateCallbackDone.catch(() => {
      if (generation.current === current) setDisplayed(location)
    })
    void transition.finished.catch(() => {}).finally(() => {
      if (generation.current === current) {
        active.current = null
        delete document.documentElement.dataset.routeMotion
      }
    })
    return () => {
      generation.current++
      transition.skipTransition()
      delete document.documentElement.dataset.routeMotion
    }
    // displayed is deliberately a snapshot, not a second navigation trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, navigationType])

  return <Routes location={displayed}><Route element={<RouteFrame />}>{children}</Route></Routes>
}
