import { useState, useEffect } from 'react'
import { Ruler, Check, ChevronDown, X } from 'lucide-react'

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
  const [open, setOpen] = useState(false)

  // ✅ Блокируем скролл страницы, пока открыт sheet
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // ✅ Выбрал размер → отметился → sheet ЗАКРЫВАЕТСЯ сам
  const handleSizeClick = (size: string) => {
    setSelectedSize(size)
    onSelect(size)
    setOpen(false)
  }

  const title = language === 'ru' ? 'Выберите размер' : 'O\'lchamni tanlang'

  // ✅ ONE SIZE — статичная строка (открывать нечего)
  if (sizeType === 'one_size') {
    return (
      <div className="mb-4">
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Ruler size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8A8275] dark:text-gray-300">
                {language === 'ru' ? 'Размер' : 'O\'lcham'}
              </p>
              <p className="text-sm font-bold text-[#1B2A4A] dark:text-white">One Size</p>
            </div>
            <span className="w-5 h-5 rounded-full bg-[#1B2A4A] dark:bg-gold flex items-center justify-center flex-shrink-0">
              <Check size={12} className="text-white dark:text-[#1B2A4A]" />
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      {/* ✅ ЗАКРЫТАЯ СТРОКА — как строка «Size» на карточке товара */}
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border flex items-center gap-3 p-3.5 text-left hover:bg-[#F5F1E8] dark:hover:bg-dark-accent transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
          <Ruler size={16} className="text-[#1B2A4A] dark:text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#8A8275] dark:text-gray-300">
            {language === 'ru' ? 'Размер' : 'O\'lcham'}
          </p>
          <p className={`text-sm truncate ${
            selectedSize
              ? 'font-bold text-[#1B2A4A] dark:text-white'
              : 'font-medium text-[#8A8275] dark:text-gray-400'
          }`}>
            {selectedSize || title}
          </p>
        </div>
        <ChevronDown size={18} className="text-[#8A8275] dark:text-gray-300 flex-shrink-0" />
      </button>

      {/* ✅ BOTTOM-SHEET со списком размеров (открывается по тапу) */}
      {open && (
        <div className="fixed inset-0 z-[90]">
          {/* Затемнение — клик закрывает */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Панель снизу */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#FBF9F4] dark:bg-dark-card rounded-t-2xl border-t border-[#E8E2D5] dark:border-dark-border shadow-2xl flex flex-col max-h-[70vh]">
            {/* Ручка + заголовок + крестик */}
            <div className="relative flex-shrink-0 px-4 pt-2 pb-3 border-b border-[#E8E2D5] dark:border-dark-border">
              <div className="w-10 h-1 rounded-full bg-[#E8E2D5] dark:bg-dark-border mx-auto mb-2" />
              <h3 className="text-base font-bold text-[#1B2A4A] dark:text-white text-center">
                {title}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 w-8 h-8 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center text-[#8A8275] dark:text-gray-300"
              >
                <X size={16} />
              </button>
            </div>

            {/* Строки размеров с divide-y + радио-галочка */}
            <div className="overflow-y-auto divide-y divide-[#E8E2D5] dark:divide-dark-border pb-6">
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size
                return (
                  <button
                    key={size}
                    onClick={() => handleSizeClick(size)}
                    className={`w-full flex items-center justify-between gap-3 p-4 text-left transition-colors ${
                      isSelected
                        ? 'bg-[#F5F1E8] dark:bg-dark-accent'
                        : 'hover:bg-[#F5F1E8] dark:hover:bg-dark-accent'
                    }`}
                  >
                    <span className={`text-sm ${
                      isSelected
                        ? 'font-bold text-[#1B2A4A] dark:text-white'
                        : 'font-medium text-[#1B2A4A] dark:text-white'
                    }`}>
                      {size}
                    </span>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#1B2A4A] dark:bg-gold border-[#1B2A4A] dark:border-gold'
                        : 'border-[#E8E2D5] dark:border-dark-border bg-white dark:bg-dark-card'
                    }`}>
                      {isSelected && <Check size={12} className="text-white dark:text-[#1B2A4A]" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}