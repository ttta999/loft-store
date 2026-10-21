import React from 'react'

/**
 * Дизайн-система LOFT — тонкие контурные иконки (как на референсе).
 * viewBox 24x24, без заливки, stroke = currentColor, strokeWidth 1.5, скруглённые концы.
 * API как у lucide-react: <ShirtIcon size={24} strokeWidth={1.5} className="..." />
 */

// ✅ Добавляем интерфейс для пропсов иконок
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
  strokeWidth?: number | string
}

// ✅ Типизируем фабрику createIcon
const createIcon = (
  name: string,
  children: React.ReactNode
): React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>> => {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ size = 24, color = 'currentColor', strokeWidth = 1.5, ...rest }, ref) => (
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

// ✅ Типизируем IconBadge
interface IconBadgeProps {
  icon: React.ComponentType<any>
  size?: number
  iconSize?: number
  bg?: string
  color?: string
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}

export const IconBadge: React.FC<IconBadgeProps> = ({
  icon: Icon,
  size = 64,
  iconSize,
  bg = '#F1E8DB',
  color = '#1F2A52',
  strokeWidth = 1.5,
  className,
  style,
}) => (
  <span
    className={className}
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
      color,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...style,
    }}
  >
    <Icon size={iconSize || Math.round(size * 0.5)} strokeWidth={strokeWidth} />
  </span>
)

/* ───────────── Категории ───────────── */

// Обувь — следы
export const FootprintsIcon = createIcon('FootprintsIcon', (<>
  <path d="M7.5 2.5c2 0 3.2 1.6 3.2 4 0 2-.9 3.4-1.7 5H6c-.8-1.6-1.7-3-1.7-5 0-2.4 1.2-4 3.2-4z" />
  <path d="M5.8 14.5c0-1 .7-1.5 1.7-1.5s1.7.5 1.7 1.5v1.5c0 1-.7 1.8-1.7 1.8S5.8 17 5.8 16z" />
  <g transform="translate(24 4) scale(-1 1)">
    <path d="M7.5 2.5c2 0 3.2 1.6 3.2 4 0 2-.9 3.4-1.7 5H6c-.8-1.6-1.7-3-1.7-5 0-2.4 1.2-4 3.2-4z" />
    <path d="M5.8 14.5c0-1 .7-1.5 1.7-1.5s1.7.5 1.7 1.5v1.5c0 1-.7 1.8-1.7 1.8S5.8 17 5.8 16z" />
  </g>
</>))

// Одежда — футболка
export const TShirtIcon = createIcon('TShirtIcon', (<>
  <path d="M8.5 3 3 5.5 4.5 10 8 8.8v11.7h8V8.8l3.5 1.2L21 5.5 15.5 3c-.5 1.3-1.9 2-3.5 2s-3-.7-3.5-2z" />
</>))

// Аксессуары — корона
export const CrownIcon = createIcon('CrownIcon', (<>
  <path d="M3.5 8l4 3.5L12 5.5l4.5 6 4-3.5L19 17.5H5z" />
  <path d="M5 20.5h14" />
  <circle cx="3.5" cy="6.5" r="1" />
  <circle cx="12" cy="3.5" r="1" />
  <circle cx="20.5" cy="6.5" r="1" />
</>))

// Бренды — ярлык
export const TagIcon = createIcon('TagIcon', (<>
  <g transform="rotate(45 12 12)">
    <path d="M8 8 12 3.5 16 8v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" />
    <circle cx="12" cy="8.5" r="1.2" />
    <path d="M10 14h4" />
    <path d="M10 17h2.5" />
  </g>
</>))

/* ───────────── Промо-блоки ───────────── */

// Новые товары — искры
export const SparklesIcon = createIcon('SparklesIcon', (<>
  <path d="M10 7c.4 3.8 2.2 5.6 6 6-3.8.4-5.6 2.2-6 6-.4-3.8-2.2-5.6-6-6 3.8-.4 5.6-2.2 6-6z" />
  <path d="M18 3c.2 1.8 1 2.6 3 3-2 .4-2.8 1.2-3 3-.2-1.8-1-2.6-3-3 2-.4 2.8-1.2 3-3z" />
  <path d="M19 14.5c.2 1.5.8 2.1 2.5 2.5-1.7.4-2.3 1-2.5 2.5-.2-1.5-.8-2.1-2.5-2.5 1.7-.4 2.3-1 2.5-2.5z" />
</>))

// Популярные товары — звезда с растущей стрелкой
export const TrendStarIcon = createIcon('TrendStarIcon', (<>
  <g transform="translate(-.5 -.5) scale(.85)">
    <path d="M11 3l2.4 5 5.5.8-4 3.9.9 5.5L11 15.5 6.2 18.2l.9-5.5-4-3.9 5.5-.8z" />
  </g>
  <path d="M11 21.5l4-4 2.5 2.5 4.5-4.5" />
  <path d="M17.5 15.5H22V20" />
</>))

/* ───────────── Общая «Все товары» — коробка ───────────── */

export const PackageIcon = createIcon('PackageIcon', (<>
  <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z" />
  <path d="M4 7.5 12 12l8-4.5" />
  <path d="M12 12v9" />
  <path d="M8 5.250 16 9.750" />
</>))

/* ───────────── Обувь ───────────── */

// Кроссовки
export const SneakerIcon = createIcon('SneakerIcon', (<>
  <path d="M3 17V8.5c0-.5.4-.9.9-.8l2.6.5c.8 1.5 2.2 2.4 3.8 2.6l5 .8c2.5.4 4.2 1.6 5 3.5l.7 1.9" />
  <path d="M3 17h18.5v1.2a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 18.2z" />
  <path d="M10.5 12.5l1.2-1.5" />
  <path d="M13 13l1.2-1.5" />
</>))

// Ботинки (челси)
export const BootIcon = createIcon('BootIcon', (<>
  <path d="M7 3h7v7.5c0 1 .6 1.8 1.6 2.2l3.4 1.4c1.2.5 2 1.5 2 2.7v2.7a1.5 1.5 0 0 1-1.5 1.5H7z" />
  <path d="M7 18h14" />
  <path d="M8.5 3V2" />
  <path d="M7 9.5c2 0 5 .5 7 2" />
</>))

// Лоферы
export const LoaferIcon = createIcon('LoaferIcon', (<>
  <path d="M3 17.5v-6.2c0-.5.4-.8.9-.8H6c.8 0 1.3.5 1.8 1.1.9 1.2 2.1 1.9 3.6 2.1l5.2.8c2 .3 3.5 1.2 4.2 3" />
  <path d="M3 17.5h17.8v1a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18.5z" />
  <path d="M11.4 13.7v3.8" />
</>))

// Сандалии и шлепанцы (слайды)
export const SlideIcon = createIcon('SlideIcon', (<>
  <path d="M2.5 16.5h19v1a2 2 0 0 1-2 2H4.5a2 2 0 0 1-2-2z" />
  <path d="M5 16.5c.5-3.5 3-5.5 6-5.5 3 0 5.5 2 6.5 5.5" />
  <path d="M7.5 16.5c.4-2 1.8-3.2 3.5-3.2s3.2 1.2 4 3.2" />
</>))

/* ───────────── Одежда ───────────── */

// Рубашки
export const ShirtIcon = createIcon('ShirtIcon', (<>
  <path d="M8.5 3 4 5.5 2.5 16.5l3 .5.5-6V21h12V11l.5 6 3-.5L20 5.5 15.5 3" />
  <path d="M8.5 3 12 7l3.5-4" />
  <path d="M12 7v14" />
  <path d="M14.5 11H17v3h-2.5z" />
</>))

// Джемперы и кардиганы
export const SweaterIcon = createIcon('SweaterIcon', (<>
  <path d="M9.5 3 5 4.5 2.5 15.5l3.5 1 .5-4v8h11v-8l.5 4 3.5-1L19 4.5 14.5 3a2.5 2.5 0 0 1-5 0z" />
  <path d="M6.5 8v4.5" />
  <path d="M17.5 8v4.5" />
  <path d="M6.5 17.5h11" />
</>))

// Брюки
export const TrousersIcon = createIcon('TrousersIcon', (<>
  <path d="M7 3h10l1.2 18h-4.6L12 10.5 10.4 21H5.8z" />
  <path d="M6.8 6.5h10.4" />
  <path d="M12 6.5v4" />
</>))

// Джинсы
export const JeansIcon = createIcon('JeansIcon', (<>
  <path d="M6 3h12l2 18h-5.5L12 12l-2.5 9H4z" />
  <path d="M12 3v9" />
  <path d="M6 6.5c2.5 0 4 1 4.8 3" />
  <path d="M18 6.5c-2.5 0-4 1-4.8 3" />
</>))

// Спортивные костюмы (олимпийка на молнии)
export const TracksuitIcon = createIcon('TracksuitIcon', (<>
  <path d="M9 3 4.5 4.5 2.5 15.5l3.5 1 .5-4V21h11v-8.5l.5 4 3.5-1-2-11L15 3" />
  <path d="M9 3v2l3 2 3-2V3" />
  <path d="M12 7v14" />
  <path d="M8.5 15v3" />
  <path d="M15.5 15v3" />
  <path d="M6.5 8v4.5" />
  <path d="M17.5 8v4.5" />
</>))

// Верхняя одежда (куртка с капюшоном)
export const OuterwearIcon = createIcon('OuterwearIcon', (<>
  <path d="M8.5 4.5 4 6 2.5 18l3 .5.5-6.5V21h12v-9l.5 6.5 3-.5L20 6l-4.5-1.5" />
  <path d="M8.5 4.5C8.5 2.8 10 2 12 2s3.5.8 3.5 2.5" />
  <path d="M9 5.5c.5 1.5 1.5 2.5 3 2.5s2.5-1 3-2.5" />
  <path d="M12 8v13" />
  <path d="M8.5 16.5h2" />
  <path d="M13.5 16.5h2" />
</>))

/* ───────────── Аксессуары ───────────── */

// Ремни
export const BeltIcon = createIcon('BeltIcon', (<>
  <path d="M12 8h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-8" />
  <path d="M6 8H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2" />
  <rect x="6" y="6" width="6" height="12" rx="1.5" />
  <path d="M9 12h6" />
  <path d="M17.5 12h.01" />
  <path d="M20 12h.01" />
</>))

// Кепки
export const CapIcon = createIcon('CapIcon', (<>
  <path d="M3 14a7 7 0 0 1 14 0c2.5 0 4.2.7 5 2.2-.2 1.2-1.5 1.8-3.5 1.8H4a1 1 0 0 1-1-1z" />
  <path d="M10 7v7" />
  <path d="M10 5.8V5.5" />
</>))

// Шапки
export const BeanieIcon = createIcon('BeanieIcon', (<>
  <path d="M5 15a7 7 0 0 1 14 0" />
  <path d="M4 15h16v4.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
  <circle cx="12" cy="4.5" r="2" />
  <path d="M8 15v5.5" />
  <path d="M12 15v5.5" />
  <path d="M16 15v5.5" />
  <path d="M9 9.5V15" />
  <path d="M15 9.5V15" />
</>))

// Сумки и рюкзаки
export const BackpackIcon = createIcon('BackpackIcon', (<>
  <path d="M6 8a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
  <path d="M10 4v-.5a2 2 0 0 1 4 0V4" />
  <path d="M6 10h12" />
  <path d="M9 14h6v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" />
  <path d="M6 15H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2" />
  <path d="M18 15h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2" />
</>))

/* ───────────── Карты «ключ → иконка» ───────────── */
// Ключи замени на свои id из данных каталога.

export const CATEGORY_ICONS = {
  shoes: FootprintsIcon,
  clothes: TShirtIcon,
  accessories: CrownIcon,
  brands: TagIcon,
}

export const BLOCK_ICONS = {
  new: SparklesIcon,
  popular: TrendStarIcon,
}

export const SUBCATEGORY_ICONS = {
  // обувь
  'shoes-all': PackageIcon,
  sneakers: SneakerIcon,
  boots: BootIcon,
  loafers: LoaferIcon,
  sandals: SlideIcon,
  // одежда
  'clothes-all': PackageIcon,
  tshirts: TShirtIcon,
  shirts: ShirtIcon,
  sweaters: SweaterIcon,
  trousers: TrousersIcon,
  jeans: JeansIcon,
  tracksuits: TracksuitIcon,
  outerwear: OuterwearIcon,
  // аксессуары
  'accessories-all': PackageIcon,
  belts: BeltIcon,
  caps: CapIcon,
  beanies: BeanieIcon,
  bags: BackpackIcon,
}