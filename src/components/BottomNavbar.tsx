import { useNavigate } from 'react-router-dom'
import { Home, ShoppingCart, Globe, User } from 'lucide-react'
import { useStore } from '../store/useStore'

type TabType = 'home' | 'search' | 'cart' | 'china' | 'profile'

interface BottomNavbarProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}

// ✅ Соответствие вкладка → URL (используется для навигации)
const TAB_PATHS: Record<TabType, string> = {
  home: '/',
  search: '/search',
  cart: '/cart',
  china: '/china',
  profile: '/profile',
}

export default function BottomNavbar({ activeTab, setActiveTab }: BottomNavbarProps) {
  const navigate = useNavigate()
  const { language, cart } = useStore()

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // ✅ Меняем и state, и URL
  const handleTabClick = (tab: TabType) => {
    if (tab === activeTab) return // не делаем лишних переходов
    setActiveTab(tab)
    navigate(TAB_PATHS[tab])
  }

  // ✅ Все 4 вкладки в одном ряду — равного размера
  const tabs = [
    {
      id: 'home' as TabType,
      label: language === 'ru' ? 'Главная' : 'Bosh sahifa',
      icon: Home,
    },
    {
      id: 'cart' as TabType,
      label: language === 'ru' ? 'Корзина' : 'Savat',
      icon: ShoppingCart,
    },
    {
      id: 'china' as TabType,
      label: language === 'ru' ? 'Спецзаказ' : 'Maxsus',
      icon: Globe,
    },
    {
      id: 'profile' as TabType,
      label: language === 'ru' ? 'Профиль' : 'Profil',
      icon: User,
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
      {/* ✅ Единая карточка в стиле страницы заказа: 4 равные колонки с круглыми иконками */}
      <div className="pointer-events-auto bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border rounded-2xl shadow-lg p-2 grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="flex flex-col items-center gap-1 py-1.5 rounded-xl transition-colors hover:bg-[#F5F1E8] dark:hover:bg-dark-accent"
            >
              {/* ✅ Круглый контейнер иконки — как строки-иконки на странице заказа */}
              <div
                className={`relative w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
                  isActive
                    ? 'bg-[#1B2A4A] dark:bg-gold border-[#1B2A4A] dark:border-gold text-white dark:text-[#1B2A4A]'
                    : 'bg-[#F5F1E8] dark:bg-dark-accent border-[#E8E2D5] dark:border-dark-border text-[#8A8275] dark:text-gray-300'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {tab.id === 'cart' && cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#9B3B3B] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-[#FBF9F4] dark:border-dark-card">
                    {cartItemsCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] leading-none ${
                  isActive
                    ? 'text-[#1B2A4A] dark:text-white font-semibold'
                    : 'text-[#8A8275] dark:text-gray-300'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}