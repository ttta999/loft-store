import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// ✅ sessionStorage для переживания reload страницы (F5)
const STORAGE_KEY = 'loft-scroll-positions'

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
    // ✅ Храним только последние 50 позиций, чтобы не раздувать storage
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

  // ✅ Сохраняем скролл при прокрутке (с дебаунсом 100мс)
  useEffect(() => {
    let timeoutId: number

    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        savePosition(location.pathname, window.scrollY)
      }, 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [location.pathname])

  // ✅ Восстанавливаем скролл при навигации
  useEffect(() => {
    // ✅ Первый рендер приложения — всегда наверх
    if (isFirstRender.current) {
      isFirstRender.current = false
      window.scrollTo(0, 0)
      return
    }

    // ✅ При обычном переходе вперёд (PUSH) — скроллим наверх
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0)
      return
    }

    // ✅ При возврате назад (POP) — восстанавливаем сохранённую позицию
    const savedPosition = getSavedPositions()[location.pathname]

    if (savedPosition !== undefined && savedPosition > 0) {
      // ✅ Два requestAnimationFrame — ждём пока React отрендерит DOM с данными из кеша
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedPosition, behavior: 'instant' as ScrollBehavior })
        })
      })
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.key, navigationType])

  return null
}