import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import BottomNavbar from './components/BottomNavbar'
import IslandHeader from './components/IslandHeader'
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
import { initTelegram, getUserData, getChatId, subscribeUser } from './lib/telegram'
import { useStore } from './store/useStore'

type TabType = 'home' | 'search' | 'cart' | 'china' | 'profile'

interface TelegramUser {
  id: string
  firstName: string
  lastName: string
  username: string
  photoUrl: string
  languageCode: string
}

function AppContent() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
  const [showBackButton, setShowBackButton] = useState(false)
  const [onBackClick, setOnBackClick] = useState<(() => void) | null>(null)

  const location = useLocation()

  // ✅ При смене URL автоматически переключаем активную вкладку
  useEffect(() => {
    const path = location.pathname
    if (path === '/' || path === '/home') {
      setActiveTab('home')
    } else if (path === '/search') {
      setActiveTab('search')
    } else if (path === '/cart') {
      setActiveTab('cart')
    } else if (path === '/china') {
      setActiveTab('china')
    } else if (path === '/profile') {
      setActiveTab('profile')
    }
  }, [location.pathname])

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
  }, [])

  const renderPage = () => {
    switch (activeTab) {
      case 'home': return <HomePage />
      case 'search': return <SearchPage />
      case 'cart': return <CartPage telegramUser={telegramUser} />
      case 'china': return <ChinaPage telegramUser={telegramUser} />
      case 'profile': return (
        <ProfilePage
          telegramUser={telegramUser}
          showBackButton={showBackButton}
          setShowBackButton={setShowBackButton}
          onBackClick={onBackClick}
          setOnBackClick={setOnBackClick}
        />
      )
      default: return <HomePage />
    }
  }

  // ✅ Кнопка «назад» нужна на поиске или во внутренних разделах
  const needsBack = activeTab === 'search' || (showBackButton && !!onBackClick)

  const handleBack = () => {
    if (activeTab === 'search') navigate('/')
    else if (onBackClick) onBackClick()
  }

  const handleSearchClick = () => {
    navigate('/search')
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] pb-24">
      {/* ✅ ОСТРОВОК-ШАПКА */}
      <IslandHeader
        needsBack={needsBack}
        onBack={handleBack}
        showSearch={activeTab === 'home'}
        onSearchClick={handleSearchClick}
      />

      {renderPage()}

      <BottomNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ ГЛАВНЫЕ ВКЛАДКИ — все рендерят AppContent */}
        <Route path="/" element={<AppContent />} />
        <Route path="/home" element={<AppContent />} />
        <Route path="/search" element={<AppContent />} />
        <Route path="/cart" element={<AppContent />} />
        <Route path="/china" element={<AppContent />} />
        <Route path="/profile" element={<AppContent />} />

        {/* ✅ ВНУТРЕННИЕ СТРАНИЦЫ (без нижней навигации и островка) */}
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