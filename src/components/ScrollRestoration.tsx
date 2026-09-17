import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

const STORAGE_KEY = 'loft-scroll-positions'

/**
 * ✅ Ключ кеша = pathname + search + state.
 * Различает:
 *  - /brands и /brands?brand=hermes
 *  - /category с разными categoryId в state
 *  - /all-products с sortBy в state
 */
const getCacheKey = (pathname: string, search: string, state: any): string => {
  let key = pathname + (search || '')
  if (state && typeof state === 'object' && Object.keys(state).length > 0) {
    try {
      key += `&s=${JSON.stringify(state)}`
    } catch {
      // игнорируем
    }
  }
  return key
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
 * Ждём (retry через rAF), пока document дорастёт до нужной высоты,
 * затем скроллим с clamp в допустимый диапазон [0, maxScroll].
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

  requestAnimationFrame(() => restoreScroll(target, attemptsLeft - 1))
}

export default function ScrollRestoration() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const isFirstRender = useRef(true)

  // ✅ Сохраняем позицию ПЕРЕД переходом (через cleanup)
  useEffect(() => {
    const currentKey = getCacheKey(location.pathname, location.search, location.state)

    return () => {
      // ❗ Не сохраняем, если открыта фуллскрин-модалка (body заблокирован)
      if (document.body.style.overflow === 'hidden') return
      savePosition(currentKey, window.scrollY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.key])

  // ✅ Восстанавливаем / сбрасываем скролл при навигации
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      window.scrollTo(0, 0)
      return
    }

    const currentKey = getCacheKey(location.pathname, location.search, location.state)

    // PUSH / REPLACE — новая страница, всегда наверх
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0)
      return
    }

    // POP («назад») — восстанавливаем сохранённую позицию БЕЗОПАСНО
    const savedPosition = getSavedPositions()[currentKey]

    if (savedPosition !== undefined && savedPosition > 0) {
      restoreScroll(savedPosition)
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.search, location.key, navigationType, location.state])

  return null
}