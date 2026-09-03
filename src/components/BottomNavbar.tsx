import { Home, ShoppingCart, Globe, User } from 'lucide-react'
import { useStore } from '../store/useStore'

type TabType = 'home' | 'search' | 'cart' | 'china' | 'profile'

interface BottomNavbarProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}

export default function BottomNavbar({ activeTab, setActiveTab }: BottomNavbarProps) {
  const { language, cart } = useStore()

  // ✅ СЛЕВА ТОЛЬКО 3 КНОПКИ (поиск ушёл наверх)
  const tabs = [
    {
      id: 'home' as TabType,
      label: language === 'ru' ? 'Главная' : 'Bosh sahifa',
      icon: Home
    },
    {
      id: 'cart' as TabType,
      label: language === 'ru' ? 'Корзина' : 'Savat',
      icon: ShoppingCart
    },
    {
      id: 'china' as TabType,
      label: language === 'ru' ? 'Спецзаказ' : 'Maxsus',
      icon: Globe
    },
  ]

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* ✅ ЛЕВАЯ «ПИЛЮЛЯ» — 3 кнопки, как на фото */}
        <div className="flex-1 bg-[#FBF9F4] border border-[#E8E2D5] rounded-full shadow-lg flex items-center justify-around py-2 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-all ${
                  isActive ? 'bg-[#E8E2D5]' : ''
                }`}
              >
                <div className="relative">
                  <Icon
                    size={22}
                    className={isActive ? 'text-[#1B2A4A]' : 'text-[#8A8275]'}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {tab.id === 'cart' && cartItemsCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-[#9B3B3B] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] ${
                    isActive ? 'text-[#1B2A4A] font-semibold' : 'text-[#8A8275]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* ✅ СПРАВА — отдельная круглая кнопка Профиль */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`w-14 h-14 shrink-0 rounded-full border shadow-lg flex items-center justify-center transition-all ${
            activeTab === 'profile'
              ? 'bg-[#E8E2D5] border-[#E8E2D5] text-[#1B2A4A]'
              : 'bg-[#FBF9F4] border-[#E8E2D5] text-[#8A8275]'
          }`}
        >
          <User size={24} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
        </button>
      </div>
    </div>
  )
}