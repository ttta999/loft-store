import { useState, useEffect } from 'react'
import { Ruler, Check, ChevronDown, X } from 'lucide-react'

type SizeType = 'numeric' | 'alphabetical' | 'one_size'

interface SizeSelectorProps {
  sizeType: SizeType
  availableSizes: string[]
  onSelect: (size: string) => void
  language?: 'ru' | 'uz'
}

// ✅ Склонение «размер / размера / размеров»
const getSizesLabelRu = (count: number): string => {
  const lastTwo = count % 100
  const lastOne = count % 10
  if (lastTwo >= 11 && lastTwo <= 19) return 'размеров'
  if (lastOne === 1) return 'размер'
  if (lastOne >= 2 && lastOne <= 4) return 'размера'
  return 'размеров'
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

  // ✅ ONE SIZE — статичная строка-карточка (открывать нечего)
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
      {/* ✅ ЗАКРЫТАЯ СТРОКА — как строка на странице заказа */}
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

      {/* ✅ BOTTOM-SHEET в стиле страницы заказа */}
      {open && (
        <div className="fixed inset-0 z-[90]">
          {/* Затемнение — клик закрывает */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Панель: бежевый фон страницы, контент — карточками */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#F5F1E8] dark:bg-dark-bg rounded-t-2xl shadow-2xl flex flex-col max-h-[75vh]">
            {/* Ручка */}
            <div className="flex-shrink-0 pt-2 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-[#E8E2D5] dark:bg-dark-border" />
            </div>

            {/* ✅ Шапка как у страницы заказа: заголовок + счётчик слева, круглый крестик справа */}
            <div className="flex-shrink-0 px-4 pb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[#1B2A4A] dark:text-white truncate">
                  {title}
                </h3>
                <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">
                  {availableSizes.length} {
                    language === 'ru'
                      ? getSizesLabelRu(availableSizes.length) + ' в наличии'
                      : 'ta o\'lcham mavjud'
                  }
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center text-[#8A8275] dark:text-gray-300 flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* ✅ Карточка со строками размеров (как карточка «Телефон/Получение/Оплата») */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border overflow-hidden divide-y divide-[#E8E2D5] dark:divide-dark-border">
                {availableSizes.map((size) => {
                  const isSelected = selectedSize === size
                  return (
                    <button
                      key={size}
                      onClick={() => handleSizeClick(size)}
                      className={`w-full flex items-center gap-3 p-3.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-[#F5F1E8] dark:bg-dark-accent'
                          : 'hover:bg-[#F5F1E8] dark:hover:bg-dark-accent'
                      }`}
                    >
                      {/* Круглый контейнер: галочка если выбран, линейка если нет */}
                      <span className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#1B2A4A] dark:bg-gold border-[#1B2A4A] dark:border-gold'
                          : 'bg-[#F5F1E8] dark:bg-dark-accent border-[#E8E2D5] dark:border-dark-border'
                      }`}>
                        {isSelected ? (
                          <Check size={16} className="text-white dark:text-[#1B2A4A]" />
                        ) : (
                          <Ruler size={14} className="text-[#8A8275] dark:text-gray-300" />
                        )}
                      </span>

                      <span className={`flex-1 min-w-0 text-sm ${
                        isSelected
                          ? 'font-bold text-[#1B2A4A] dark:text-white'
                          : 'font-medium text-[#1B2A4A] dark:text-white'
                      }`}>
                        {size}
                      </span>

                      {isSelected && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] whitespace-nowrap flex-shrink-0">
                          {language === 'ru' ? 'Выбран' : 'Tanlandi'}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}