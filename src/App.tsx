import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
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
import { initTelegram, getUserData, getChatId, subscribeUser } from './lib/telegram'
import { Heart } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
  const [showBackButton, setShowBackButton] = useState(false)
  const [onBackClick, setOnBackClick] = useState<(() => void) | null>(null)
  const { language, favorites } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  // ✅ Инициализация Telegram
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

  // ✅ Синхронизация activeTab с URL - ВАЖНО для возврата из товара в корзину
  useEffect(() => {
    const path = location.pathname
    
    // Определяем таб по пути
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
    // Для /product/:id, /catalog, /brands, /category, /favorites - оставляем текущий таб
  }, [location.pathname])

  // Обработка переключения табов
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    
    // Навигация по табам
    switch (tab) {
      case 'home':
        navigate('/')
        break
      case 'search':
        navigate('/search')
        break
      case 'cart':
        navigate('/cart')
        break
      case 'china':
        navigate('/china')
        break
      case 'profile':
        navigate('/profile')
        break
    }
  }

  // Рендер страницы в зависимости от activeTab
  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />
      case 'search':
        return <SearchPage />
      case 'cart':
        return <CartPage telegramUser={telegramUser} />
      case 'china':
        return <ChinaPage telegramUser={telegramUser} />
      case 'profile':
        return (
          <ProfilePage 
            telegramUser={telegramUser}
            showBackButton={showBackButton}
            setShowBackButton={setShowBackButton}
            onBackClick={onBackClick}
            setOnBackClick={setOnBackClick}
          />
        )
      default:
        return <HomePage />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Шапка с LOFT Store */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          {showBackButton && onBackClick ? (
            <button 
              onClick={onBackClick} 
              className="text-gray-600 hover:text-black"
            >
              ← {language === 'ru' ? 'Назад' : 'Orqaga'}
            </button>
          ) : (
            <div className="w-16"></div>
          )}
          <h1 className="text-xl font-bold text-center flex-1">LOFT Store</h1>
          <button 
            onClick={() => navigate('/favorites')}
            className="relative text-gray-600 hover:text-red-500"
          >
            <Heart size={24} />
            {favorites.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Контент страницы */}
      {renderPage()}

      {/* Нижняя навигация */}
      <BottomNavbar activeTab={activeTab} setActiveTab={handleTabChange} />
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
      </Routes>
    </BrowserRouter>
  )
}

export default App