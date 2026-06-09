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

  // Если One Size - показываем статичный блок
  if (sizeType === 'one_size') {
    return (
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">
          {language === 'ru' ? 'Размер' : 'O\'lcham'}
        </p>
        <div className="inline-block px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-lg border border-gray-200">
          One Size
        </div>
      </div>
    )
  }

  // Для обуви и одежды показываем сетку размеров
  return (
    <div className="mb-4">
      <p className="text-sm text-gray-500 mb-2">
        {language === 'ru' ? 'Выберите размер' : 'O\'lchamni tanlang'}
      </p>
      <div className="flex flex-wrap gap-2">
        {availableSizes.map((size) => (
          <button
            key={size}
            onClick={() => handleSizeClick(size)}
            className={`px-4 py-2 rounded-lg border font-medium transition-all ${
              selectedSize === size
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 border-gray-300 hover:border-black'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  )
}