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
        subcategory: subcategoryId 
      } 
    })
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white border-b p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="text-gray-600 flex items-center gap-1">
              ← {language === 'ru' ? 'Назад' : 'Orqaga'}
            </button>
            <h1 className="text-xl font-bold text-center flex-1">LOFT Store</h1>
            <div className="w-16"></div>
          </div>
        </div>
        <div className="p-4 text-center text-gray-500 mt-8">
          Категория не найдена
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-600 flex items-center gap-1">
            ← {language === 'ru' ? 'Назад' : 'Orqaga'}
          </button>
          <h1 className="text-xl font-bold text-center flex-1">LOFT Store</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-2xl font-bold mb-2">
          {language === 'ru' ? category.name_ru : category.name_uz}
        </h2>

        <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
          {category.subcategories.map((sub, index) => (
            <button
              key={sub.id}
              onClick={() => handleSubcategoryClick(sub.id)}
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                index !== category.subcategories.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <span className="font-medium text-base">
                {language === 'ru' ? sub.name_ru : sub.name_uz}
              </span>
              <span className="text-gray-400 text-xl">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}