import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../data/categories'
import { useState, useEffect } from 'react'

export default function CatalogPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, currency, exchangeRate } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const categoryId = location.state?.category
  const subcategoryId = location.state?.subcategory
  
  const category = CATEGORIES.find(c => c.id === categoryId)
  const subcategory = category?.subcategories.find(s => s.id === subcategoryId)

  useEffect(() => {
    if (categoryId && subcategoryId) {
      loadProducts()
    }
  }, [categoryId, subcategoryId])

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('category', categoryId)
      .eq('subcategory', subcategoryId)
    
    setProducts(data || [])
    setLoading(false)
  }

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
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
        {category && (
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              {language === 'ru' ? category.name_ru : category.name_uz}
              {subcategory && ` / ${language === 'ru' ? subcategory.name_ru : subcategory.name_uz}`}
            </p>
          </div>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {language === 'ru' ? 'В этой категории пока нет товаров' : 'Bu kategoriyada hali mahsulotlar yo\'q'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(product => (
              <div
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer"
              >
                {product.images?.[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.name_ru}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-3">
                  <p className="font-medium text-sm truncate">
                    {language === 'ru' ? product.name_ru : product.name_uz}
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {formatPrice(product.price_usd)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}