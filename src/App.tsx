import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Search, ArrowLeft } from 'lucide-react'
import BottomNavbar from './components/BottomNavbar'
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
  const { language } = useStore()
  const location = useLocation()

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

  return (
    <div className="min-h-screen bg-[#F5F1E8] pb-24">
      {/* ✅ ВЕРХНИЙ БАР — «ОСТРОВОК» КАК ВНИЗУ */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-2 bg-[#F5F1E8]">
        <div className="flex items-center gap-3">
          {/* Островок с названием */}
          <div className="flex-1 h-14 bg-[#FBF9F4] border border-[#E8E2D5] rounded-full shadow-lg relative flex items-center justify-center">
            {needsBack && (
              <button
                onClick={handleBack}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-[#1B2A4A] hover:bg-[#F5F1E8] transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-lg font-bold text-[#1B2A4A] tracking-wide">LOFT</h1>
          </div>

          {/* Отдельная круглая кнопка поиска — только на главной (как профиль внизу) */}
          {activeTab === 'home' && (
            <button
              onClick={() => navigate('/search')}
              className="w-14 h-14 shrink-0 rounded-full bg-[#FBF9F4] border border-[#E8E2D5] shadow-lg flex items-center justify-center text-[#1B2A4A] hover:text-[#C9A961] transition-colors"
            >
              <Search size={22} />
            </button>
          )}
        </div>
      </div>

      {renderPage()}

      <BottomNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
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