import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { mockProducts } from '../data/mockProducts'

export default function SearchPage() {
  const { language, currency, exchangeRate } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSubcategory, setActiveSubcategory] = useState<string>('all')

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  // Получаем все уникальные подкатегории
  const subcategories = useMemo(() => {
    const subs = new Set(mockProducts.map(p => p.subcategory))
    return ['all', ...Array.from(subs)]
  }, [])

  // Фильтрация товаров
  const filteredProducts = useMemo(() => {
    return mockProducts.filter(product => {
      const matchesSearch = 
        product.name_ru.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.name_uz.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.subcategory.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesSubcategory = 
        activeSubcategory === 'all' || 
        product.subcategory === activeSubcategory
      
      return matchesSearch && matchesSubcategory
    })
  }, [searchQuery, activeSubcategory])

  // Перевод подкатегорий
  const getSubcategoryName = (sub: string) => {
    const names: Record<string, string> = {
      'all': language === 'ru' ? 'Все' : 'Barchasi',
      'sneakers': language === 'ru' ? 'Кроссовки' : 'Krossovkalar',
      't-shirts': language === 'ru' ? 'Футболки' : 'Futbolkalar',
      'hoodies': language === 'ru' ? 'Худи' : 'Xudilar',
      'caps': language === 'ru' ? 'Кепки' : 'Kepkalar',
      'belts': language === 'ru' ? 'Ремни' : 'Kamarlar',
    }
    return names[sub] || sub
  }

  return (
    <div className="p-4 pb-20">
      {/* Поисковая строка */}
      <div className="relative mb-4">
        <SearchIcon 
          size={20} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'ru' ? 'Поиск товаров...' : 'Mahsulotlarni qidirish...'}
          className="w-full pl-10 pr-10 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Быстрые теги подкатегорий */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        {subcategories.map((sub) => (
          <button
            key={sub}
            onClick={() => setActiveSubcategory(sub)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeSubcategory === sub
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {getSubcategoryName(sub)}
          </button>
        ))}
      </div>

      {/* Результаты поиска */}
      <div className="mb-2">
        <p className="text-sm text-gray-500">
          {filteredProducts.length} 
          {language === 'ru' ? ' товаров найдено' : ' mahsulot topildi'}
        </p>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            {language === 'ru' ? 'Ничего не найдено' : 'Hech narsa topilmadi'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {language === 'ru' ? 'Попробуйте другой запрос' : 'Boshqa so\'z bilan qidiring'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => (
            <Link key={product.id} to={`/product/${product.id}`}>
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                <div className="aspect-square bg-gray-100">
                  <img
                    src={product.images[0]}
                    alt={product.name_ru}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">
                    {language === 'ru' ? product.name_ru : product.name_uz}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {getSubcategoryName(product.subcategory)}
                  </p>
                  <p className="text-black font-bold mt-1">
                    {formatPrice(product.price_usd)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}