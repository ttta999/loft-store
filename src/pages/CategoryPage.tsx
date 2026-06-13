import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { ArrowLeft } from 'lucide-react'
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
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-600">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">LOFT Store</h1>
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
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">LOFT Store</h1>
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-2xl font-bold mb-6">
          {language === 'ru' ? category.name_ru : category.name_uz}
        </h2>

        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
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