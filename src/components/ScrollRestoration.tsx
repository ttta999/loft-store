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

export default function ScrollRestoration() {
  const location = useLocation()
  const navigationType = useNavigationType()
  
  // Храним актуальный скролл вне зависимости от циклов рендера
  const scrollPosRef = useRef(0)
  const prevLocRef = useRef(location)

  // 1. Непрерывно трекаем скролл (самое точное значение)
  useEffect(() => {
    const handleScroll = () => {
      scrollPosRef.current = window.scrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 2. СИНХРОННО обрабатываем смену URL до отрисовки интерфейса (до Paint)
  useLayoutEffect(() => {
    const prev = prevLocRef.current
    
    // Если URL изменился
    if (prev.key !== location.key) {
      // СОХРАНЯЕМ позицию старой страницы до того, как сбросим её
      const positions = getSavedPositions()
      positions[prev.key] = scrollPosRef.current
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions))

      // ВОССТАНАВЛИВАЕМ или СБРАСЫВАЕМ для новой страницы
      if (navigationType === 'POP') {
        const saved = positions[location.key]
        
        if (saved !== undefined && saved > 0) {
          // Применяем скролл
          window.scrollTo(0, saved)

          // Страховка для списков, которые рендерятся асинхронно
          const observer = new ResizeObserver(() => {
            if (document.documentElement.scrollHeight >= saved + window.innerHeight) {
              window.scrollTo(0, saved)
              observer.disconnect()
            }
          })
          // Stop restoring as soon as the user starts scrolling themselves.
          const stop = () => observer.disconnect()
          window.addEventListener('wheel', stop, { passive: true, once: true })
          window.addEventListener('touchstart', stop, { passive: true, once: true })
          window.addEventListener('keydown', stop, { once: true })
          if (document.documentElement.scrollHeight >= saved + window.innerHeight) observer.disconnect()
          else observer.observe(document.documentElement)
          
          // Отключаем обсервер через 400мс
          const timer = setTimeout(() => observer.disconnect(), 400)
          
          prevLocRef.current = location
          return () => {
            observer.disconnect()
            window.removeEventListener('wheel', stop)
            window.removeEventListener('touchstart', stop)
            window.removeEventListener('keydown', stop)
            clearTimeout(timer)
          }
        } else {
          window.scrollTo(0, 0)
        }
      } else {
        // Если это PUSH (переход вперед) - всегда наверх
        window.scrollTo(0, 0)
      }
    }
    
    prevLocRef.current = location
  }, [location, navigationType])

  return null
}