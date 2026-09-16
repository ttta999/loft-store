import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// ✅ sessionStorage переживает reload (F5)
const STORAGE_KEY = 'loft-scroll-positions'

/**
 * Ключ кеша = pathname + state.
 * Это позволяет различать:
 *  - /category с { categoryId: 'shoes' }
 *  - /category с { categoryId: 'jackets' }
 *  - /all-products с { sortBy: 'popular' }
 */
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

    // ✅ POP (кнопка "назад") — восстанавливаем сохранённую позицию
    const savedPosition = getSavedPositions()[currentKey]

    if (savedPosition !== undefined && savedPosition > 0) {
      // Двойной RAF — ждём пока React отрендерит DOM с данными из кеша
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedPosition, behavior: 'instant' as ScrollBehavior })
        })
      })
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.key, navigationType, location.state])

  return null
}