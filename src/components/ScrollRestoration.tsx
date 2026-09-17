import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

const STORAGE_KEY = 'loft-scroll-positions'

const getSavedPositions = (): Record<string, number> => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

const savePosition = (key: string, position: number) => {
  try {
    const positions = getSavedPositions()
    positions[key] = position
    
    // Очистка старых записей, чтобы не раздувать память
    const keys = Object.keys(positions)
    if (keys.length > 50) {
      delete positions[keys[0]]
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
  } catch {
    // игнорируем
  }
}

export default function ScrollRestoration() {
  const location = useLocation()
  const navigationType = useNavigationType()
  
  // Храним актуальный скролл независимо от рендера
  const currentScrollY = useRef(0)

  // 1. Трекаем текущий скролл
  useEffect(() => {
    const handleScroll = () => {
      currentScrollY.current = window.scrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 2. Сохраняем позицию СТРОГО перед размонтированием текущего маршрута
  useEffect(() => {
    const key = location.key
    return () => {
      // Функция cleanup срабатывает прямо перед сменой страницы
      savePosition(key, currentScrollY.current)
    }
  }, [location.key])

  // 3. Восстанавливаем скролл (useLayoutEffect работает синхронно перед Paint)
  useLayoutEffect(() => {
    if (navigationType !== 'POP') {
      // Переход вперед (PUSH / REPLACE) — всегда наверх
      window.scrollTo(0, 0)
      return
    }

    const savedPosition = getSavedPositions()[location.key]

    if (savedPosition !== undefined && savedPosition > 0) {
      // Пытаемся восстановить сразу (для статических страниц)
      window.scrollTo(0, savedPosition)

      // Если данные асинхронные, ждем, пока высота DOM не увеличится до нужного значения
      const observer = new ResizeObserver(() => {
        if (document.documentElement.scrollHeight >= savedPosition) {
          window.scrollTo(0, savedPosition)
        }
      })
      observer.observe(document.documentElement)

      // Выключаем observer через 500мс, чтобы не висел в памяти, если страница короткая
      const timer = setTimeout(() => observer.disconnect(), 500)

      return () => {
        observer.disconnect()
        clearTimeout(timer)
      }
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.key, navigationType])

  return null
}