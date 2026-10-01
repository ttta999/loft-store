import { useState } from 'react'
import { Ruler, Check } from 'lucide-react'

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

  // ✅ ONE SIZE — карточка с одной строкой (как строка заказа)
  if (sizeType === 'one_size') {
    return (
      <div className="mb-4">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border overflow-hidden">
          {/* Шапка-строка с круглой иконкой */}
          <div className="flex items-center gap-3 p-3.5 border-b border-[#E8E2D5] dark:border-dark-border">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Ruler size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <p className="text-sm font-medium text-[#1B2A4A] dark:text-white">
              {language === 'ru' ? 'Размер' : 'O\'lcham'}
            </p>
          </div>
          {/* Единственная строка размера */}
          <div className="flex items-center justify-between p-3.5">
            <span className="text-sm font-bold text-[#1B2A4A] dark:text-white">One Size</span>
            <span className="w-5 h-5 rounded-full bg-[#1B2A4A] dark:bg-gold border border-[#1B2A4A] dark:border-gold flex items-center justify-center flex-shrink-0">
              <Check size={12} className="text-white dark:text-[#1B2A4A]" />
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ✅ СПИСОК РАЗМЕРОВ — строки с разделителями (логика как у Mammut, стиль — как у страницы заказа)
  return (
    <div className="mb-4">
      <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border overflow-hidden">
        {/* Шапка-строка с круглой иконкой */}
        <div className="flex items-center gap-3 p-3.5 border-b border-[#E8E2D5] dark:border-dark-border">
          <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            <Ruler size={16} className="text-[#1B2A4A] dark:text-white" />
          </div>
          <p className="text-sm font-medium text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? 'Выберите размер' : 'O\'lchamni tanlang'}
          </p>
          {selectedSize && (
            <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A]">
              {selectedSize}
            </span>
          )}
        </div>

        {/* Строки размеров с divide-y (скролл если много) */}
        <div className="divide-y divide-[#E8E2D5] dark:divide-dark-border max-h-72 overflow-y-auto">
          {availableSizes.map((size) => {
            const isSelected = selectedSize === size
            return (
              <button
                key={size}
                onClick={() => handleSizeClick(size)}
                className={`w-full flex items-center justify-between gap-3 p-3.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-[#F5F1E8] dark:bg-dark-accent'
                    : 'hover:bg-[#F5F1E8] dark:hover:bg-dark-accent'
                }`}
              >
                <span className={`text-sm ${isSelected ? 'font-bold text-[#1B2A4A] dark:text-white' : 'font-medium text-[#1B2A4A] dark:text-white'}`}>
                  {size}
                </span>
                {/* Радио-кружок выбора */}
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#1B2A4A] dark:bg-gold border-[#1B2A4A] dark:border-gold'
                      : 'border-[#E8E2D5] dark:border-dark-border bg-white dark:bg-dark-card'
                  }`}
                >
                  {isSelected && <Check size={12} className="text-white dark:text-[#1B2A4A]" />}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}