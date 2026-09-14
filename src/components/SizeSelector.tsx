import { useState } from 'react'

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

  if (sizeType === 'one_size') {
    return (
      <div className="mb-4">
        <p className="text-sm text-[#8A8275] dark:text-gray-300 mb-2">
          {language === 'ru' ? 'Размер' : 'O\'lcham'}
        </p>

        <div className="inline-block px-6 py-3 bg-[#F5F1E8] dark:bg-dark-card text-[#1B2A4A] dark:text-white font-semibold rounded-lg border border-[#E8E2D5] dark:border-dark-border">
          One Size
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <p className="text-sm text-[#8A8275] dark:text-gray-300 mb-2">
        {language === 'ru' ? 'Выберите размер' : 'O\'lchamni tanlang'}
      </p>

      <div className="flex flex-wrap gap-2">
        {availableSizes.map((size) => (
          <button
            key={size}
            onClick={() => handleSizeClick(size)}
            className={`px-4 py-2 rounded-lg border font-medium transition-all ${
              selectedSize === size
                ? 'bg-[#1B2A4A] dark:bg-[#C9A961] text-white dark:text-[#1B2A4A] border-[#1B2A4A] dark:border-[#C9A961]'
                : 'bg-[#FBF9F4] dark:bg-dark-card text-[#1B2A4A] dark:text-white border-[#E8E2D5] dark:border-dark-border hover:border-[#1B2A4A] dark:hover:border-[#C9A961]'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  )
}