import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { CATEGORIES } from '../data/categories'
import { ArrowLeft } from 'lucide-react'

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

  if (!category) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <p className="text-[#8A8275]">
          {language === 'ru' ? 'Категория не найдена' : 'Kategoriya topilmadi'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] pb-24">
      {/* ✅ ШАПКА-ОСТРОВОК (как в App.tsx) */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-2 bg-[#F5F1E8]">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-14 bg-[#FBF9F4] border border-[#E8E2D5] rounded-full shadow-lg relative flex items-center justify-center">
            <button
              onClick={() => navigate(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-[#1B2A4A] hover:bg-[#F5F1E8] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-[#1B2A4A] tracking-wide">LOFT</h1>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-xl font-bold mb-1 text-[#1B2A4A]">
          {language === 'ru' ? category.name_ru : category.name_uz}
        </h2>
        <p className="text-sm text-[#8A8275] mb-4">
          {language === 'ru'
            ? 'Выберите подкатегорию'
            : 'Pastki kategoriyani tanlang'}
        </p>

        <div className="bg-[#FBF9F4] rounded-2xl overflow-hidden shadow-sm border border-[#E8E2D5]">
          {category.subcategories.map((sub, index) => (
            <button
              key={sub.id}
              onClick={() => handleSubcategoryClick(sub.id)}
              className={`w-full flex items-center justify-between p-4 hover:bg-[#F5F1E8] transition-colors ${
                index !== category.subcategories.length - 1 ? 'border-b border-[#E8E2D5]' : ''
              } ${sub.id === 'all' ? 'bg-[#1B2A4A]/5 hover:bg-[#1B2A4A]/10' : ''}`}
            >
              <div className="flex items-center gap-3">
                {sub.id === 'all' && <span className="text-2xl">📦</span>}
                <span className="font-medium text-base text-[#1B2A4A]">
                  {language === 'ru' ? sub.name_ru : sub.name_uz}
                </span>
              </div>
              <span className="text-[#8A8275] text-xl">›</span>
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-[#1B2A4A]/5 rounded-2xl border border-[#E8E2D5]">
          <p className="text-sm text-[#1B2A4A]">
            {language === 'ru'
              ? '💡 Нажмите "Все товары" чтобы увидеть всю категорию'
              : '💡 "Barcha mahsulotlar" tugmasini bosing butun kategoriyani ko\'rish uchun'}
          </p>
        </div>
      </div>
    </div>
  )
}