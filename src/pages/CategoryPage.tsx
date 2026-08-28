import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { CATEGORIES } from '../data/categories'

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
      <div className="bg-[#FBF9F4] p-4 shadow-sm sticky top-0 z-40 border-b border-[#E8E2D5]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-[#1B2A4A] hover:text-[#C9A961] flex items-center gap-1"
          >
            ← {language === 'ru' ? 'Назад' : 'Orqaga'}
          </button>
          <h1 className="text-xl font-bold text-center flex-1 text-[#1B2A4A] tracking-wide">LOFT</h1>
          <div className="w-16"></div>
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

        <div className="bg-[#FBF9F4] rounded-xl overflow-hidden shadow-sm border border-[#E8E2D5]">
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

        <div className="mt-6 p-4 bg-[#1B2A4A]/5 rounded-xl border border-[#E8E2D5]">
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