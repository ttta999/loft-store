import React from 'react'

/**
 * Свои иконки в стиле Lucide:
 * viewBox 24x24, без заливки, stroke = currentColor, strokeWidth 2, скруглённые концы.
 * API такое же, как у lucide-react: <ShoesIcon size={24} strokeWidth={2} className="..." />
 */
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
  strokeWidth?: number | string
}

// ✅ FIX ts7006/ts2339/ts2322: типизируем параметры фабрики и дженерики forwardRef
const createIcon = (
  name: string,
  children: React.ReactNode
): React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>> => {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ size = 24, color = 'currentColor', strokeWidth = 2, ...rest }, ref) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    )
  )
  Icon.displayName = name
  return Icon
}

/* ───────────── 4 категории ───────────── */

// Обувь
export const ShoesIcon = createIcon('ShoesIcon', (<>
  <path d="M3 16V9a1 1 0 0 1 1-1h2.5l2 2.5c.8 1 2 1.6 3.2 1.8l5 .8c2.5.4 4.3 1.4 4.3 2.9" />
  <path d="M3 16h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
</>))

// Одежда (вешалка)
export const ClothesIcon = createIcon('ClothesIcon', (<>
  <path d="M10 5a2 2 0 1 1 2 2v1l8.4 6.4A1.5 1.5 0 0 1 19.5 17h-15a1.5 1.5 0 0 1-.9-2.6L12 8" />
  <path d="M5 21h14" />
</>))

// Аксессуары (солнцезащитные очки)
export const AccessoriesIcon = createIcon('AccessoriesIcon', (<>
  <circle cx="6" cy="14" r="4" />
  <circle cx="18" cy="14" r="4" />
  <path d="M10 13.5c1.3-.8 2.7-.8 4 0" />
  <path d="M2 14l1-6" />
  <path d="M22 14l-1-6" />
</>))

// Бренды (корона)
export const BrandsIcon = createIcon('BrandsIcon', (<>
  <path d="M3 7.5l4.5 4L12 5l4.5 6.5L21 7.5 19 18H5z" />
  <path d="M5 21h14" />
</>))

/* ───────────── 2 блока ───────────── */

// Новые товары (искры)
export const NewItemsIcon = createIcon('NewItemsIcon', (<>
  <path d="M10 3c.5 4.5 2.5 6.5 7 7-4.5.5-6.5 2.5-7 7-.5-4.5-2.5-6.5-7-7 4.5-.5 6.5-2.5 7-7z" />
  <path d="M19 15c.2 1.8 1 2.6 3 3-2 .4-2.8 1.2-3 3-.2-1.8-1-2.6-3-3 2-.4 2.8-1.2 3-3z" />
</>))

// Популярные товары (огонь)
export const PopularIcon = createIcon('PopularIcon', (<>
  <path d="M12 3c.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 .8-3.3 2-4.5 0 1.5.7 2.5 2 2.5 0-3-1-5 1-8z" />
</>))

/* ───────────── Общая иконка «Все товары» ───────────── */

export const AllItemsIcon = createIcon('AllItemsIcon', (<>
  <rect x="3" y="3" width="7" height="7" rx="1.5" />
  <rect x="14" y="3" width="7" height="7" rx="1.5" />
  <rect x="3" y="14" width="7" height="7" rx="1.5" />
  <rect x="14" y="14" width="7" height="7" rx="1.5" />
</>))

/* ───────────── Обувь: подкатегории ───────────── */

// Кроссовки
export const SneakersIcon = createIcon('SneakersIcon', (<>
  <path d="M3 16V9a1 1 0 0 1 1-1h2.5l2 2.5c.8 1 2 1.6 3.2 1.8l5 .8c2.5.4 4.3 1.4 4.3 2.9" />
  <path d="M3 16h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  <path d="m9.5 13.5 1.5-1.5" />
  <path d="m12.5 14 1.5-1.5" />
</>))

// Ботинки
export const BootsIcon = createIcon('BootsIcon', (<>
  <path d="M6 3h7v6c0 1.2.7 2.1 1.8 2.6l4 1.8c1.3.6 2.2 1.6 2.2 2.6v3a2 2 0 0 1-2 2H6z" />
  <path d="M6 17h15" />
  <path d="M6 7h7" />
</>))

// Лоферы
export const LoafersIcon = createIcon('LoafersIcon', (<>
  <path d="M3 18v-6a1 1 0 0 1 1-1h3c.8 0 1.5.4 2 1 .8 1 1.9 1.6 3.2 1.9l5.3 1.1c1.5.3 2.5 1.5 2.5 3z" />
  <path d="M3 21h17" />
  <path d="M12 14.2V18" />
</>))

// Сандалии и шлепанцы
export const SandalsIcon = createIcon('SandalsIcon', (<>
  <path d="M12 22c-3.5 0-6-2-6-5.5 0-2.5.6-4 1.2-6.5.5-2 .8-4 .8-6C8 2.5 9.5 2 12 2s4 .5 4 2c0 2 .3 4 .8 6 .6 2.5 1.2 4 1.2 6.5 0 3.5-2.5 5.5-6 5.5z" />
  <path d="M6.8 13.5 12 9l5.2 4.5" />
  <path d="M12 9V5.5" />
</>))

/* ───────────── Одежда: подкатегории ───────────── */

// Футболки
export const TShirtIcon = createIcon('TShirtIcon', (<>
  <path d="M8 3 3 6l2 4 3-1.5V20a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8.5l3 1.5 2-4-5-3a4 4 0 0 1-8 0z" />
</>))

// Рубашки
export const ShirtIcon = createIcon('ShirtIcon', (<>
  <path d="M8 3 3 6l1.5 6L8 11v10h8V11l3.5 1L21 6l-5-3-4 4z" />
  <path d="M12 11h.01" />
  <path d="M12 15h.01" />
  <path d="M12 19h.01" />
</>))

// Джемперы и кардиганы
export const SweaterIcon = createIcon('SweaterIcon', (<>
  <path d="M9 3 4.5 4.5 2 16l3.5 1 .5-4V21h12v-8l.5 4 3.5-1-2.5-11.5L15 3a3 3 0 0 1-6 0z" />
  <path d="M6 8v5" />
  <path d="M18 8v5" />
  <path d="M6 18h12" />
</>))

// Брюки
export const TrousersIcon = createIcon('TrousersIcon', (<>
  <path d="M7 3h10l1 18h-4.5L12 9l-1.5 12H6z" />
  <path d="M6.8 7h10.4" />
</>))

// Джинсы
export const JeansIcon = createIcon('JeansIcon', (<>
  <path d="M6 3h12l2 18h-5.5L12 12l-2.5 9H4z" />
  <path d="M12 3v9" />
  <path d="M6 6.5c2.5 0 4 1 4.8 3" />
  <path d="M18 6.5c-2.5 0-4 1-4.8 3" />
</>))

// Спортивные костюмы
export const TracksuitIcon = createIcon('TracksuitIcon', (<>
  <path d="M9 3 4.5 4.5 2 16l3.5 1 .5-4V21h12v-8l.5 4 3.5-1-2.5-11.5L15 3l-3 2.5z" />
  <path d="M12 5.5V21" />
  <path d="M8.5 15v3" />
  <path d="M15.5 15v3" />
</>))

// Верхняя одежда
export const OuterwearIcon = createIcon('OuterwearIcon', (<>
  <path d="M9 3 4 5 2.5 18l3 .5L6 11v10h12V11l.5 8.5 3-.5L20 5l-5-2-3 5z" />
  <path d="M12 8v13" />
  <path d="M14.5 13h.01" />
  <path d="M14.5 17h.01" />
</>))

/* ───────────── Аксессуары: подкатегории ───────────── */

// Ремни
export const BeltIcon = createIcon('BeltIcon', (<>
  <path d="M12 8h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-8" />
  <path d="M6 8H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2" />
  <rect x="6" y="6" width="6" height="12" rx="1.5" />
  <path d="M9 12h6" />
  <path d="M18 12h.01" />
</>))

// Кепки
export const CapIcon = createIcon('CapIcon', (<>
  <path d="M3 14a7 7 0 0 1 14 0c2.5 0 4.2.7 5 2.2-.2 1.2-1.5 1.8-3.5 1.8H4a1 1 0 0 1-1-1z" />
  <path d="M10 7v7" />
</>))

// Шапки
export const BeanieIcon = createIcon('BeanieIcon', (<>
  <path d="M5 15a7 7 0 0 1 14 0" />
  <path d="M4 15h16v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
  <circle cx="12" cy="5.5" r="2" />
  <path d="M9 15v5" />
  <path d="M15 15v5" />
</>))

// Сумки и рюкзаки
export const BagIcon = createIcon('BagIcon', (<>
  <path d="M6 8a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
  <path d="M10 4v-.5a2 2 0 0 1 4 0V4" />
  <path d="M6 10h12" />
  <path d="M12 10v3" />
  <path d="M6 15H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2" />
  <path d="M18 15h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2" />
</>))

/* ───────────── Карты «ключ → иконка» ───────────── */

export const CATEGORY_ICONS = {
  shoes: ShoesIcon,
  clothes: ClothesIcon,
  accessories: AccessoriesIcon,
  brands: BrandsIcon,
}

export const BLOCK_ICONS = {
  new: NewItemsIcon,
  popular: PopularIcon,
}

export const SUBCATEGORY_ICONS = {
  // обувь
  'shoes-all': AllItemsIcon,
  sneakers: SneakersIcon,
  boots: BootsIcon,
  loafers: LoafersIcon,
  sandals: SandalsIcon,
  // одежда
  'clothes-all': AllItemsIcon,
  tshirts: TShirtIcon,
  shirts: ShirtIcon,
  sweaters: SweaterIcon,
  trousers: TrousersIcon,
  jeans: JeansIcon,
  tracksuits: TracksuitIcon,
  outerwear: OuterwearIcon,
  // аксессуары
  'accessories-all': AllItemsIcon,
  belts: BeltIcon,
  caps: CapIcon,
  beanies: BeanieIcon,
  bags: BagIcon,
}