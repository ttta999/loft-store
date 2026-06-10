import { Home, Search, ShoppingCart, Globe, User } from 'lucide-react'
import { useStore } from '../store/useStore'

type TabType = 'home' | 'search' | 'cart' | 'china' | 'profile'

interface BottomNavbarProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}

export default function BottomNavbar({ activeTab, setActiveTab }: BottomNavbarProps) {
  const { language, cart } = useStore()

  const tabs = [
    { 
      id: 'home' as TabType, 
      label: language === 'ru' ? 'Главная' : 'Bosh sahifa', 
      icon: Home 
    },
    { 
      id: 'search' as TabType, 
      label: language === 'ru' ? 'Поиск' : 'Qidiruv', 
      icon: Search 
    },
    { 
      id: 'cart' as TabType, 
      label: language === 'ru' ? 'Корзина' : 'Savat', 
      icon: ShoppingCart 
    },
    { 
      id: 'china' as TabType, 
      label: language === 'ru' ? 'Спецзаказ' : 'Maxsus buyurtma', 
      icon: Globe 
    },
    { 
      id: 'profile' as TabType, 
      label: language === 'ru' ? 'Профиль' : 'Profil', 
      icon: User 
    },
  ]

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-6 pt-2 px-2 z-50">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-1 px-2 py-1 relative"
            >
              <Icon
                size={24}
                className={isActive ? 'text-black' : 'text-gray-400'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-xs ${
                  isActive ? 'text-black font-semibold' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </span>
              {tab.id === 'cart' && cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}