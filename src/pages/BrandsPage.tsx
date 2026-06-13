import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { ArrowLeft } from 'lucide-react'
import { BRANDS } from '../data/categories'
import { useState } from 'react'

export default function BrandsPage() {
  const navigate = useNavigate()
  const { language, currency, exchangeRate } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const formatPrice = (usd: number) => {
    if (currency === 'USD') return `$${usd}`
    return `${(usd * exchangeRate).toLocaleString()} сум`
  }

  const handleBrandClick = async (brandId: string) => {
    setSelectedBrand(brandId)
    setLoading(true)
    
    const brand = BRANDS.find(b => b.id === brandId)
    if (!brand) return
    
    const { data } = await supabase
      .from('products')
      .select('*')
      .ilike('name_ru', `%${brand.name}%`)
    
    setProducts(data || [])
    setLoading(false)
  }

  const handleBack = () => {
    if (selectedBrand) {
      setSelectedBrand(null)
      setProducts([])
    } else {
      navigate(-1)
    }
  }

  const brand = selectedBrand ? BRANDS.find(b => b.id === selectedBrand) : null

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="text-gray-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">LOFT Store</h1>
        </div>
      </div>

      <div className="p-4">
        {!selectedBrand ? (
          <>
            <h2 className="text-2xl font-bold mb-6">
              {language === 'ru' ? 'Бренды' : 'Brendlar'}
            </h2>
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              {BRANDS.map((brand, index) => (
                <button
                  key={brand.id}
                  onClick={() => handleBrandClick(brand.id)}
                  className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                    index !== BRANDS.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span className="font-medium text-base">{brand.name}</span>
                  <span className="text-gray-400 text-xl">›</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold">{brand?.name}</h2>
              <p className="text-sm text-gray-500">
                {products.length} {language === 'ru' ? 'товаров' : 'mahsulotlar'}
              </p>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {language === 'ru' 
                  ? 'Товары этого бренда пока недоступны' 
                  : 'Bu brendning mahsulotlari hali yo\'q'}
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
          </>
        )}
      </div>
    </div>
  )
}