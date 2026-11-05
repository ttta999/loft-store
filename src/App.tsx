import { SearchPage, CartPage, ChinaPage, ProfilePage, ProductPage, FavoritesPage, CatalogPage, BrandsPage, CategoryPage, AllProductsPage, PrivacyPage, TermsPage } from './lib/pagePreload'
import AnimatedRoutes from './components/AnimatedRoutes'
import AppToaster from './components/AppToaster'
import { useState, useEffect, useLayoutEffect } from 'react'
import { BrowserRouter, Route, useLocation, useNavigate, Outlet } from 'react-router-dom'
import BottomNavbar from './components/BottomNavbar'
import IslandHeader from './components/IslandHeader'
import HomePage from './pages/HomePage'
import {
  initTelegram,
  getUserData,
  subscribeUser,
  setupTelegramBackButton,
  hideTelegramBackButton,
} from './lib/telegram'
import { useStore } from './store/useStore'

type TabType = 'home' | 'search' | 'cart' | 'china' | 'profile'

// ✅ Пути основных вкладок — на них системной кнопкой управляет AppLayout
const MAIN_TAB_PATHS = new Set(['/', '/home', '/search', '/cart', '/china', '/profile'])

// ✅ МЕНЕДЖЕР системной кнопки «назад» Telegram (работает поверх всех роутов)
function TelegramBackButtonManager() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const path = location.pathname

    // ✅ На основных вкладках кнопкой управляет AppLayout — гасим остаточное состояние
    if (MAIN_TAB_PATHS.has(path)) {
      hideTelegramBackButton()
      return
    }

    // ✅ На внутренних страницах показываем системную кнопку и вешаем history.pop()
    const handleBack = () => {
      const dismiss = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-loft-dismiss]')).at(-1)
      if (dismiss) { dismiss.click(); return }
      const idx = (window.history.state as any)?.idx
      if (typeof idx === 'number' && idx === 0) {
        // ✅ Если в стеке больше нет страниц — возвращаемся на главную
        navigate('/')
      } else {
        navigate(-1)
      }
    }

    const cleanup = setupTelegramBackButton(true, handleBack)
    return cleanup
  }, [location.pathname, navigate])

  return null
}

// ✅ LAYOUT — персистентный, не размонтируется между вкладками
function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname
  const activeTab: TabType = path === '/search' ? 'search' : path === '/cart' ? 'cart' : path === '/china' ? 'china' : path === '/profile' ? 'profile' : 'home'
  const [showBackButton, setShowBackButton] = useState(false)
  const [onBackClick, setOnBackClick] = useState<(() => void) | null>(null)
  const [dialogCount, setDialogCount] = useState(0)
  useEffect(() => {
    const scan = () => setDialogCount(document.querySelectorAll('[data-surface-dialog]').length)
    scan()
    window.addEventListener('loft:dialog-change', scan)
    return () => window.removeEventListener('loft:dialog-change', scan)
  }, [])

  const setTelegramUser = useStore((state) => state.setTelegramUser)

  // ✅ Telegram инициализация — один раз, сохраняем в store
  useEffect(() => {
    const tg = initTelegram()
    if (!tg) return
    let active = true
    getUserData().then(user => {
      if (!active) return
      setTelegramUser(user)
      useStore.getState().setChatId(user.id)
      subscribeUser().catch(() => {})
    }).catch(() => {
      if (active) { setTelegramUser(null); useStore.getState().setChatId(null) }
    })
    return () => { active = false }
  }, [setTelegramUser])

  // ✅ Системная кнопка «назад» Telegram на вкладках
  // (поиск и внутренние разделы профиля: заказы / спецзаказы / избранное / настройки)
  useEffect(() => {
    const needsBackNow = dialogCount > 0 || activeTab === 'search' || (showBackButton && !!onBackClick)

    if (!needsBackNow) {
      hideTelegramBackButton()
      return
    }

    const handler = () => {
      const dismiss = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-loft-dismiss]')).at(-1)
      if (dismiss) { dismiss.click(); return }
      if (activeTab === 'search') navigate('/')
      else if (onBackClick) onBackClick()
    }

    const cleanup = setupTelegramBackButton(true, handler)
    return cleanup
  }, [activeTab, showBackButton, onBackClick, navigate, dialogCount])

  // ✅ Кнопка «назад» для островка-шапки
  const needsBack = activeTab === 'search' || (showBackButton && !!onBackClick)

  const handleBack = () => {
    if (activeTab === 'search') navigate('/')
    else if (onBackClick) onBackClick()
  }

  const handleSearchClick = () => {
    navigate('/search')
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24 transition-colors duration-300">
      <IslandHeader
        needsBack={needsBack}
        onBack={handleBack}
        showSearch={activeTab === 'home'}
        onSearchClick={handleSearchClick}
      />

      {/* ✅ Outlet рендерит страницу БЕЗ размонтирования layout */}
      <main data-loft-content><Outlet context={{ showBackButton, setShowBackButton, onBackClick, setOnBackClick }} /></main>

      <BottomNavbar activeTab={activeTab} />
    </div>
  )
}

function ThemeManager() {
  const theme = useStore(state => state.theme)
  useLayoutEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches))
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
  return null
}

function App() {
  return (
    <BrowserRouter>
      <ThemeManager />
      <AppToaster />

      {/* ✅ Менеджер системной кнопки Telegram — тоже над Routes */}
      <TelegramBackButtonManager />

      <AnimatedRoutes>
        {/* ✅ LAYOUT ROUTE — основные вкладки */}
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/china" element={<ChinaPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* ✅ ВНУТРЕННИЕ СТРАНИЦЫ (со своим IslandHeader) */}
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/brands" element={<BrandsPage />} />
        <Route path="/category" element={<CategoryPage />} />
        <Route path="/all-products" element={<AllProductsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </AnimatedRoutes>
    </BrowserRouter>
  )
}

export default App
