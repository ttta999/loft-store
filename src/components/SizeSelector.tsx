import { useState } from 'react'

type SizeType = 'numeric' | 'alphabetical' | 'one_size'

interface SizeSelectorProps {
  sizeType: SizeType
  availableSizes: string[]
  onSelect: (size: string) => void
  language?: 'ru' | 'uz'
}

export default function SizeSelector({ sizeType, availableSizes, onSelect, language = 'ru' }: SizeSelectorProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  const handleSizeClick = (size: string) => {
    setSelectedSize(size)
    onSelect(size)
  }

  if (sizeType === 'one_size') {
    return (
      <div className="mb-4">
        <p className="text-sm text-[#8A8275] mb-2">
          {language === 'ru' ? 'Размер' : 'O\'lcham'}
        </p>
        <div className="inline-block px-6 py-3 bg-[#F5F1E8] text-[#1B2A4A] font-semibold rounded-lg border border-[#E8E2D5]">
          One Size
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <p className="text-sm text-[#8A8275] mb-2">
        {language === 'ru' ? 'Выберите размер' : 'O\'lchamni tanlang'}
      </p>
      <div className="flex flex-wrap gap-2">
        {availableSizes.map((size) => (
          <button
            key={size}
            onClick={() => handleSizeClick(size)}
            className={`px-4 py-2 rounded-lg border font-medium transition-all ${
              selectedSize === size
                ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                : 'bg-[#FBF9F4] text-[#1B2A4A] border-[#E8E2D5] hover:border-[#1B2A4A]'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  )
}