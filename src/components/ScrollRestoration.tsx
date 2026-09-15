import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Храним позицию скролла для каждого URL
const scrollPositions: Record<string, number> = {}

export default function ScrollRestoration() {
  const location = useLocation()

  // Сохраняем скролл при скролле страницы
  useEffect(() => {
    const handleScroll = () => {
      scrollPositions[location.pathname] = window.scrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  // Восстанавливаем скролл при входе на страницу
  useEffect(() => {
    const savedPosition = scrollPositions[location.pathname]
    
    // Даём React время отрендерить контент
    const raf = requestAnimationFrame(() => {
      if (savedPosition !== undefined && savedPosition > 0) {
        window.scrollTo({ top: savedPosition, behavior: 'instant' as ScrollBehavior })
      } else {
        window.scrollTo(0, 0)
      }
    })
    
    return () => cancelAnimationFrame(raf)
  }, [location.pathname, location.key])

  return null
}