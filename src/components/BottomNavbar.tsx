import { Home, Search, ShoppingCart, Globe, User } from 'lucide-react'
import { useStore } from '../store/useStore'

type TabType = 'home' | 'search' | 'cart' | 'china' | 'profile'

interface BottomNavbarProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}

export default function BottomNavbar({ activeTab, setActiveTab }: BottomNavbarProps) {
  const { language } = useStore()
  
  const tabs = [
    { id: 'home' as TabType, label: language === 'ru' ? 'Главная' : 'Bosh sahifa', icon: Home },
    { id: 'search' as TabType, label: language === 'ru' ? 'Поиск' : 'Qidiruv', icon: Search },
    { id: 'cart' as TabType, label: language === 'ru' ? 'Корзина' : 'Savat', icon: ShoppingCart },
    { id: 'china' as TabType, label: language === 'ru' ? 'Спецзаказ' : 'Maxsus buyurtma', icon: Globe },
    { id: 'profile' as TabType, label: language === 'ru' ? 'Профиль' : 'Profil', icon: User },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 pb-4 z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-16 ${
              isActive ? 'text-black' : 'text-gray-400'
            }`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}