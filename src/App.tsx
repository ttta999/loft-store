import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-[#F5F1E8] pb-24">
      <div className="bg-[#FBF9F4] p-4 shadow-sm sticky top-0 z-40 border-b border-[#E8E2D5]">
        <div className="flex items-center justify-between">
          {/* СЛЕВА: назад (на поиске или когда нужна кнопка назад) */}
          {activeTab === 'search' ? (
            <button
              onClick={() => navigate('/')}
              className="text-[#1B2A4A] hover:text-[#C9A961] transition-colors"
            >
              ← {language === 'ru' ? 'Назад' : 'Orqaga'}
            </button>
          ) : showBackButton && onBackClick ? (
            <button
              onClick={onBackClick}
              className="text-[#1B2A4A] hover:text-[#C9A961] transition-colors"
            >
              ← {language === 'ru' ? 'Назад' : 'Orqaga'}
            </button>
          ) : (
            <div className="w-10"></div>
          )}

          <h1 className="text-xl font-bold text-center flex-1 text-[#1B2A4A] tracking-wide">LOFT</h1>

          {/* ✅ СПРАВА: поиск ТОЛЬКО на главной */}
          {activeTab === 'home' ? (
            <button
              onClick={() => navigate('/search')}
              className="w-10 h-10 rounded-full bg-[#FBF9F4] border border-[#E8E2D5] shadow-sm flex items-center justify-center text-[#1B2A4A] hover:text-[#C9A961] transition-colors"
            >
              <Search size={20} />
            </button>
          ) : (
            <div className="w-10"></div>
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