import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

const STORAGE_KEY = 'loft-scroll-positions'

const getCacheKey = (pathname: string, state: any): string => {
  if (state && typeof state === 'object' && Object.keys(state).length > 0) {
    try {
      return `${pathname}?s=${JSON.stringify(state)}`
    } catch {
      return pathname
    }
  }
  return pathname
}

const getSavedPositions = (): Record<string, number> => {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

const savePosition = (key: string, position: number) => {
  try {
    const positions = getSavedPositions()
    positions[key] = position
    const keys = Object.keys(positions)
    if (keys.length > 50) {
      delete positions[keys[0]]
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
  } catch {
    // Игнорируем ошибки sessionStorage
  }
}

/**
 * ✅ БЕЗОПАСНОЕ восстановление скролла.
 *
 * Ждём (retry через rAF), пока document дорастёт до нужной высоты,
 * затем скроллим с clamp в допустимый диапазон [0, maxScroll].
 * Это исключает overscroll / «белую область сверху» на iOS WebView,
 * а также случаи когда контент ещё не отрендерился в момент scrollTo.
 */
const restoreScroll = (target: number, attemptsLeft = 15) => {
  const scrollHeight = document.documentElement.scrollHeight
  const maxScroll = Math.max(0, scrollHeight - window.innerHeight)
  const enoughHeight = maxScroll >= target - 4

  if (enoughHeight || attemptsLeft <= 0) {
    const clamped = Math.max(0, Math.min(target, maxScroll))
    window.scrollTo({ top: clamped, behavior: 'instant' as ScrollBehavior })
    return
  }

  // Контент ещё не дорендерился — пробуем в следующем кадре
  requestAnimationFrame(() => restoreScroll(target, attemptsLeft - 1))
}

export default function ScrollRestoration() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const isFirstRender = useRef(true)

  // ✅ Сохраняем позицию ПЕРЕД переходом (через cleanup).
  // Cleanup вызывается когда location меняется = "перед unmount старой страницы".
  useEffect(() => {
    const currentKey = getCacheKey(location.pathname, location.state)

    return () => {
      // ❗ Не сохраняем позицию, если открыта модалка — body сейчас не виден
      if (document.body.style.overflow === 'hidden') return
      savePosition(currentKey, window.scrollY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.key])

  // ✅ Восстанавливаем скролл при навигации
  useEffect(() => {
    // Первый рендер приложения — всегда наверх
    if (isFirstRender.current) {
      isFirstRender.current = false
      window.scrollTo(0, 0)
      return
    }

    const currentKey = getCacheKey(location.pathname, location.state)

    // ✅ PUSH / REPLACE — всегда в начало (новая страница)
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0)
      return
    }

    // ✅ POP (кнопка "назад") — восстанавливаем сохранённую позицию БЕЗОПАСНО
    const savedPosition = getSavedPositions()[currentKey]

    if (savedPosition !== undefined && savedPosition > 0) {
      restoreScroll(savedPosition)
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.key, navigationType, location.state])

  return null
}