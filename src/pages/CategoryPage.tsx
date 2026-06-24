import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { CATEGORIES } from '../data/categories'
import { ChevronRight, Heart } from 'lucide-react'

export default function CategoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, favorites } = useStore()
  
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">
          {language === 'ru' ? 'Категория не найдена' : 'Kategoriya topilmadi'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ✅ Верхняя панель - только LOFT Store */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="text-gray-600 hover:text-black"
          >
            ← {language === 'ru' ? 'Назад' : 'Orqaga'}
          </button>
          <h1 className="text-xl font-bold text-center flex-1">LOFT Store</h1>
          <button 
            onClick={() => navigate('/favorites')}
            className="relative text-gray-600 hover:text-red-500"
          >
            <Heart size={24} />
            {favorites.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* ✅ Название категории крупным шрифтом слева */}
        <h2 className="text-3xl font-bold mb-1">
          {language === 'ru' ? category.name_ru : category.name_uz}
        </h2>
        {/* ✅ Подпись мелким серым текстом */}
        <p className="text-gray-500 text-base mb-6">
          {language === 'ru' 
            ? 'Выберите подкатегорию' 
            : 'Pastki kategoriyani tanlang'}
        </p>

        {/* Список подкатегорий */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          {category.subcategories.map((sub, index) => (
            <button
              key={sub.id}
              onClick={() => handleSubcategoryClick(sub.id)}
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                index !== category.subcategories.length - 1 ? 'border-b border-gray-100' : ''
              } ${sub.id === 'all' ? 'bg-blue-50 hover:bg-blue-100' : ''}`}
            >
              <div className="flex items-center gap-3">
                {sub.id === 'all' && <span className="text-2xl">📦</span>}
                <span className="font-medium text-base">
                  {language === 'ru' ? sub.name_ru : sub.name_uz}
                </span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-800">
            {language === 'ru' 
              ? '💡 Нажмите "Все товары" чтобы увидеть всю категорию' 
              : '💡 "Barcha mahsulotlar" tugmasini bosing butun kategoriyani ko\'rish uchun'}
          </p>
        </div>
      </div>
    </div>
  )
}