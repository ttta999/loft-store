import { useState } from 'react'
import { Ruler } from 'lucide-react'

type SizeType = 'numeric' | 'alphabetical' | 'one_size'

interface SizeSelectorProps {
  sizeType: SizeType
  availableSizes: string[]
  onSelect: (size: string) => void
  language?: 'ru' | 'uz'
}

export default function SizeSelector({
  sizeType,
  availableSizes,
  onSelect,
  language = 'ru'
}: SizeSelectorProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  const handleSizeClick = (size: string) => {
    setSelectedSize(size)
    onSelect(size)
  }

  return (
    <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-3.5 mb-4">
      {/* ✅ Заголовок строки: круглая иконка + подпись (как в фильтрах заказа) */}
      <div className="flex items-center gap-3 mb-2.5">
        <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
          <Ruler size={16} className="text-[#1B2A4A] dark:text-white" />
        </div>
        <p className="text-xs text-[#8A8275] dark:text-gray-300 font-medium">
          {sizeType === 'one_size'
            ? (language === 'ru' ? 'Размер' : 'O\'lcham')
            : (language === 'ru' ? 'Выберите размер' : 'O\'lchamni tanlang')}
        </p>
      </div>

      {sizeType === 'one_size' ? (
        <div className="ml-12">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border text-[#1B2A4A] dark:text-white font-semibold rounded-lg">
            <span className="text-base">📏</span>
            One Size
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 ml-12">
          {availableSizes.map((size) => (
            <button
              key={size}
              onClick={() => handleSizeClick(size)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedSize === size
                  ? 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] border border-[#1B2A4A] dark:border-gold'
                  : 'bg-[#F5F1E8] dark:bg-dark-accent text-[#8A8275] dark:text-gray-300 border border-[#E8E2D5] dark:border-dark-border hover:border-[#1B2A4A] dark:hover:border-gold'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}