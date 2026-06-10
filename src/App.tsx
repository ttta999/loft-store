import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNavbar from './components/BottomNavbar'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import CartPage from './pages/CartPage'
import ChinaPage from './pages/ChinaPage'
import ProfilePage from './pages/ProfilePage'
import ProductPage from './pages/ProductPage'
import { initTelegram, getUserData } from './lib/telegram'

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

  useEffect(() => {
    const tg = initTelegram()
    
    if (tg) {
      const userData = getUserData()
      if (userData) {
        setTelegramUser(userData)
        console.log('Telegram пользователь:', userData)
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
          setShowBackButton={setShowBackButton}
          setOnBackClick={setOnBackClick}
        />
      )
      default: return <HomePage />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          {showBackButton && onBackClick ? (
            <button 
              onClick={onBackClick} 
              className="text-gray-600 hover:text-black"
            >
              ← Назад
            </button>
          ) : (
            <div className="w-16"></div>
          )}
          <h1 className="text-xl font-bold text-center flex-1">LOFT Store</h1>
          <div className="w-16"></div>
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
      </Routes>
    </BrowserRouter>
  )
}

export default App