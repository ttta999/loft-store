import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// ✅ Отключаем нативное восстановление скролла браузера — управляем сами
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

const STORAGE_KEY = 'loft-scroll-positions'

/**
 * Ключ кеша = pathname + search + state.
 * Различает /brands и /brands?brand=hermes, /category с разными state и т.д.
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
    // игнорируем ошибки sessionStorage
  }
}

/**
 * ✅ Безопасное восстановление: ждём (retry через rAF), пока document
 * дорастёт до нужной высоты, затем скроллим с clamp в [0, maxScroll].
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
  const prevLocationRef = useRef(location)
  const locationRef = useRef(location)
  const lastInteractionRef = useRef(0)

  // Держим актуальный location для scroll-listener'а
  useEffect(() => {
    locationRef.current = location
  }, [location])

  // ✅ Отслеживаем ручное взаимодействие пользователя (чтобы не дёргать скролл)
  useEffect(() => {
    const mark = () => {
      lastInteractionRef.current = Date.now()
    }
    window.addEventListener('touchstart', mark, { passive: true })
    window.addEventListener('wheel', mark, { passive: true })
    return () => {
      window.removeEventListener('touchstart', mark)
      window.removeEventListener('wheel', mark)
    }
  }, [])

  // ✅ 1) ПОСТОЯННОЕ сохранение позиции (debounce 80мс).
  // Позиция страницы всегда актуальна в кеше, независимо от жизненного цикла React.
  useEffect(() => {
    let timeoutId: number

    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        // Не сохраняем, если открыта фуллскрин-модалка (body заблокирован)
        if (document.body.style.overflow === 'hidden') return
        const loc = locationRef.current
        savePosition(getCacheKey(loc.pathname, loc.search, loc.state), window.scrollY)
      }, 80)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [])

  // ✅ 2) В момент смены URL сразу дописываем позицию ПРЕДЫДУЩЕЙ страницы.
  // window.scrollY в этот момент ещё равен офсету старой страницы.
  useEffect(() => {
    const prev = prevLocationRef.current
    const changed =
      prev.pathname !== location.pathname ||
      prev.search !== location.search ||
      prev.key !== location.key

    if (changed && document.body.style.overflow !== 'hidden') {
      savePosition(getCacheKey(prev.pathname, prev.search, prev.state), window.scrollY)
    }
    prevLocationRef.current = location
  }, [location])

  // ✅ 3) Восстановление / сброс скролла
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      window.scrollTo(0, 0)
      return
    }

    // PUSH / REPLACE (переход вперёд, например в карточку) — всегда сверху
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0)
      return
    }

    // POP («назад») — восстанавливаем позицию, на которой покинули страницу
    const saved =
      getSavedPositions()[getCacheKey(location.pathname, location.search, location.state)]

    if (saved !== undefined && saved > 0) {
      restoreScroll(saved)
      // ✅ Повторная установка: iOS WebView может асинхронно «своим» механизмом
      // подставить чужой скролл — страхуемся двумя ре-ассертами
      window.setTimeout(() => {
        if (Date.now() - lastInteractionRef.current < 400) return
        restoreScroll(saved, 5)
      }, 120)
      window.setTimeout(() => {
        if (Date.now() - lastInteractionRef.current < 600) return
        restoreScroll(saved, 5)
      }, 350)
    } else {
      window.scrollTo(0, 0)
      // ✅ Защита от нативного восстановления чужой позиции WebView
      window.setTimeout(() => {
        if (Date.now() - lastInteractionRef.current < 400) return
        if (window.scrollY > 0) window.scrollTo(0, 0)
      }, 120)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.key, navigationType, location.state])

  return null
}