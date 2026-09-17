import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Outlet } from 'react-router-dom'
import BottomNavbar from './components/BottomNavbar'
import IslandHeader from './components/IslandHeader'
import ScrollRestoration from './components/ScrollRestoration'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import CartPage from './pages/CartPage'
import ChinaPage from './pages/ChinaPage'
import ProfilePage from './pages/ProfilePage'
import ProductPage from './pages/ProductPage'
import FavoritesPage from './pages/FavoritesPage'
import CatalogPage from './pages/CatalogPage'
import BrandsPage from './pages/BrandsPage'
import CategoryPage from './pages/CategoryPage'
import AllProductsPage from './pages/AllProductsPage'
import {
  initTelegram,
  getUserData,
  getChatId,
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
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [showBackButton, setShowBackButton] = useState(false)
  const [onBackClick, setOnBackClick] = useState<(() => void) | null>(null)

  const theme = useStore((state) => state.theme)
  const setTelegramUser = useStore((state) => state.setTelegramUser)

  // ✅ Применение тёмной темы к <html>
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [theme])

  // ✅ Следим за изменением системной темы
  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      if (e.matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // ✅ Синхронизируем activeTab с URL
  useEffect(() => {
    const path = location.pathname
    let newTab: TabType | null = null
    if (path === '/' || path === '/home') newTab = 'home'
    else if (path === '/search') newTab = 'search'
    else if (path === '/cart') newTab = 'cart'
    else if (path === '/china') newTab = 'china'
    else if (path === '/profile') newTab = 'profile'

    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }, [location.pathname, activeTab])

  // ✅ Telegram инициализация — один раз, сохраняем в store
  useEffect(() => {
    const tg = initTelegram()
    if (tg) {
      const userData = getUserData()
      if (userData) {
        setTelegramUser(userData)
        console.log('Telegram пользователь:', userData)
        const chatId = getChatId()
        if (chatId && chatId !== useStore.getState().chatId) {
          useStore.getState().setChatId(chatId)
          console.log('Chat ID сохранён:', chatId)
          subscribeUser()
        }
      }
    } else {
      console.log('Приложение открыто в браузере (не в Telegram)')
    }
  }, [setTelegramUser])

  // ✅ Системная кнопка «назад» Telegram на вкладках
  // (поиск и внутренние разделы профиля: заказы / спецзаказы / избранное)
  useEffect(() => {
    const needsBackNow = activeTab === 'search' || (showBackButton && !!onBackClick)

    if (!needsBackNow) {
      hideTelegramBackButton()
      return
    }

    const handler = () => {
      if (activeTab === 'search') navigate('/')
      else if (onBackClick) onBackClick()
    }

    const cleanup = setupTelegramBackButton(true, handler)
    return cleanup
  }, [activeTab, showBackButton, onBackClick, navigate])

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
      {/* ❌ ScrollRestoration убран отсюда — теперь живёт в App(), над Routes,
          чтобы работать на ВСЕХ страницах, включая /product/:id (вне layout) */}

      <IslandHeader
        needsBack={needsBack}
        onBack={handleBack}
        showSearch={activeTab === 'home'}
        onSearchClick={handleSearchClick}
      />

      {/* ✅ Outlet рендерит страницу БЕЗ размонтирования layout */}
      <Outlet context={{ showBackButton, setShowBackButton, onBackClick, setOnBackClick }} />

      <BottomNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      {/* ✅ ScrollRestoration живёт НАД Routes — работает на всех страницах,
          включая внутренние (/product/:id, /catalog, /brands, ...).
          Это критично: раньше при возврате с карточки товара он монтировался
          заново с isFirstRender=true и восстановление позиции ломалось. */}
      <ScrollRestoration />

      {/* ✅ Менеджер системной кнопки Telegram — тоже над Routes */}
      <TelegramBackButtonManager />

      <Routes>
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
      </Routes>
    </BrowserRouter>
  )
}

export default App