import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { CATEGORIES } from '../data/categories'
import { ChevronRight, AlertCircle } from 'lucide-react'
import IslandHeader from '../components/IslandHeader'

// ✅ Склонение «подкатегорий» для русского
const getSubcategoriesLabelRu = (count: number): string => {
  const lastTwo = count % 100
  const lastOne = count % 10
  if (lastTwo >= 11 && lastTwo <= 19) return 'подкатегорий'
  if (lastOne === 1) return 'подкатегория'
  if (lastOne >= 2 && lastOne <= 4) return 'подкатегории'
  return 'подкатегорий'
}

export default function CategoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language } = useStore()

  const categoryId = location.state?.categoryId
  const category = CATEGORIES.find(c => c.id === categoryId)

  const handleSubcategoryClick = (subcategoryId: string) => {
    navigate('/catalog', {
      state: {
        category: categoryId,
        subcategory: subcategoryId === 'all' ? undefined : subcategoryId
      }
    })
  }

  // ✅ Пустое состояние — в стиле карточки заказа
  if (!category) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg flex flex-col">
        <IslandHeader
          needsBack={true}
          onBack={() => navigate(-1)}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center max-w-sm w-full">
            <div className="w-14 h-14 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border mx-auto mb-3 flex items-center justify-center">
              <AlertCircle size={24} className="text-[#8A8275] dark:text-gray-300" />
            </div>
            <p className="text-sm font-medium text-[#1B2A4A] dark:text-white mb-1">
              {language === 'ru' ? 'Категория не найдена' : 'Kategoriya topilmadi'}
            </p>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mb-4">
              {language === 'ru' ? 'Попробуйте выбрать другую' : 'Boshqasini tanlab ko\'ring'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] text-sm font-bold hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors"
            >
              {language === 'ru' ? 'На главную' : 'Asosiyga'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <IslandHeader
        needsBack={true}
        onBack={() => navigate(-1)}
      />

      <div className="p-4">
        {/* ✅ Шапка-карточка: эмодзи категории + название + счётчик (как шапка заказа) */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <span className="text-2xl leading-none">{category.icon}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">
                {language === 'ru' ? category.name_ru : category.name_uz}
              </h1>
              <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                {category.subcategories.length} {
                  language === 'ru'
                    ? getSubcategoriesLabelRu(category.subcategories.length)
                    : 'ta pastki kategoriya'
                }
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#C9A961]/15 text-[#C9A961] whitespace-nowrap flex-shrink-0">
            {category.subcategories.length}
          </span>
        </div>

        {/* ✅ Единая карточка подкатегорий: строки с круглыми иконками и разделителями */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 overflow-hidden divide-y divide-[#E8E2D5] dark:divide-dark-border">
          {category.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => handleSubcategoryClick(sub.id)}
              className={`w-full flex items-center gap-3 p-3.5 hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors text-left ${
                sub.id === 'all' ? 'bg-[#1B2A4A]/5 dark:bg-gold/10 hover:bg-[#1B2A4A]/10 dark:hover:bg-gold/20' : ''
              }`}
            >
              <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${
                sub.id === 'all'
                  ? 'bg-[#1B2A4A] dark:bg-gold border-[#1B2A4A] dark:border-gold'
                  : 'bg-[#F5F1E8] dark:bg-dark-accent border-[#E8E2D5] dark:border-dark-border'
              }`}>
                <span className={`text-lg leading-none ${sub.id === 'all' ? '' : ''}`}>
                  {sub.id === 'all' ? '📦' : category.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  sub.id === 'all'
                    ? 'text-[#1B2A4A] dark:text-white'
                    : 'text-[#1B2A4A] dark:text-white'
                }`}>
                  {language === 'ru' ? sub.name_ru : sub.name_uz}
                </p>
                {sub.id === 'all' && (
                  <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                    {language === 'ru' ? 'Вся категория сразу' : 'Butun kategoriya birdaniga'}
                  </p>
                )}
              </div>
              <ChevronRight size={18} className="text-[#8A8275] dark:text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* ✅ Инфо-примечание — строка с круглой иконкой (как в деталях заказа) */}
        <div className="flex items-center gap-3 p-4 bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border rounded-2xl">
          <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            <span className="text-base leading-none">💡</span>
          </div>
          <p className="text-xs text-[#8A8275] dark:text-gray-300 leading-relaxed">
            {language === 'ru'
              ? 'Нажмите «Все товары», чтобы увидеть всю категорию сразу'
              : '"Barcha mahsulotlar" tugmasini bosing butun kategoriyani ko\'rish uchun'}
          </p>
        </div>
      </div>
    </div>
  )
}