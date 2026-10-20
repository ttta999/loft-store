import React from 'react'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
}

// ==================== 1. КАТЕГОРИИ И ПРОМО ====================

// Обувь (Две подошвы)
export const ShoesIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M7.5 4.5c-1.4 0-2.3 1.2-2.3 3 0 1.8.8 3 1.2 4.8.4 1.8-.4 2.7-.4 4.2 0 1.7 1 3 2.2 3 1.2 0 2.2-1.3 2.2-3 0-1.5-.8-2.4-.4-4.2.4-1.8 1.2-3 1.2-4.8 0-1.8-.9-3-2.3-3z" />
    <path d="M16.5 4.5c-1.4 0-2.3 1.2-2.3 3 0 1.8.8 3 1.2 4.8.4 1.8-.4 2.7-.4 4.2 0 1.7 1 3 2.2 3 1.2 0 2.2-1.3 2.2-3 0-1.5-.8-2.4-.4-4.2.4-1.8 1.2-3 1.2-4.8 0-1.8-.9-3-2.3-3z" />
  </svg>
)

// Одежда (Футболка)
export const ClothingIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 4.5l3.5 1.8a3 3 0 005 0L18 4.5l3 4.5-2.5 2V20H5.5V11L3 9l3-4.5z" />
  </svg>
)

// Аксессуары (Корона с шариками)
export const AccessoriesIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 17.5l-1.5-8.5 5 3.5 4.5-6.5 4.5 6.5 5-3.5-1.5 8.5H4z" />
    <path d="M5 19.5h14" />
    <circle cx="2.5" cy="8.5" r="1" fill="currentColor" />
    <circle cx="7.5" cy="12.5" r="0.8" fill="currentColor" />
    <circle cx="12" cy="5.5" r="1" fill="currentColor" />
    <circle cx="16.5" cy="12.5" r="0.8" fill="currentColor" />
    <circle cx="21.5" cy="8.5" r="1" fill="currentColor" />
  </svg>
)

// Бренды (Бирка с отверстием и точками)
export const BrandsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12.5 3.5H20.5V11.5L11.5 20.5L3.5 12.5L12.5 3.5Z" />
    <circle cx="17" cy="7" r="1.2" fill="currentColor" />
    <circle cx="7.5" cy="15.5" r="0.6" fill="currentColor" />
    <circle cx="9.5" cy="13.5" r="0.6" fill="currentColor" />
    <circle cx="11.5" cy="11.5" r="0.6" fill="currentColor" />
  </svg>
)

// Новые товары (4 звезды-искорки)
export const NewIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10 3l1.5 4.5L16 9l-4.5 1.5L10 15 8.5 10.5 4 9l4.5-1.5L10 3z" />
    <path d="M18 13l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
    <path d="M5 16l.5 1.5L7 18l-1.5.5L5 20l-.5-1.5L3 18l1.5-.5L5 16z" />
  </svg>
)

// Популярные товары (Звезда со стрелкой вверх)
export const PopularIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3l2.4 5 5.6.8-4 4 1 5.6-5-2.6-5 2.6 1-5.6-4-4 5.6-.8L12 3z" />
    <path d="M15 11l6-6m0 0h-4.5M21 5v4.5" />
  </svg>
)

// Скидки (Бирка со знаком процента)
export const DiscountIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20.5 11.5L12.5 19.5C11.7 20.3 10.3 20.3 9.5 19.5L3.5 13.5C2.7 12.7 2.7 11.3 3.5 10.5L11.5 2.5H19.5V10.5L20.5 11.5Z" />
    <line x1="9" y1="15" x2="15" y2="9" />
    <circle cx="10" cy="10" r="1" fill="currentColor" />
    <circle cx="14" cy="14" r="1" fill="currentColor" />
  </svg>
)


// ==================== 2. ПОДКАТЕГОРИИ "ОБУВЬ" ====================

// Все товары (Коробка/куб)
export const AllIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 8L12 13L3 8L12 3L21 8Z" />
    <path d="M3 8V16L12 21V13" />
    <path d="M21 8V16L12 21" />
  </svg>
)

// Кроссовки
export const SneakersIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2.5 17.5h19c0-.8-.5-1.5-1.5-1.5h-17c-1 0-1.5.7-1.5 1.5z" />
    <path d="M3 16c1-3.5 3-5 6-5 2 0 3.5 1 5.5.5l3.5-1.5c1.2-.5 2.5 0 3 1.2l1 3.8H3z" />
    <path d="M10.5 11.5l-1.5 2.5m4-2.5l-1.5 2.5" />
  </svg>
)

// Ботинки (Челси/высокий ботинок)
export const BootsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 18.5h15.5c.8 0 1.5-.7 1.5-1.5v-1l-3.5-3.5c-.8-.8-1.2-1.8-1.2-2.9V4.5c0-.8-.7-1.5-1.5-1.5h-4c-.8 0-1.5.7-1.5 1.5v4c0 1.5-.8 2.8-2 3.5L4 16.5v2z" />
    <path d="M10.8 7v4.5c0 .8-.5 1.5-1.3 1.8" />
    <path d="M3 18.5h18" />
  </svg>
)

// Лоферы
export const LoafersIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 17.5h19.5c.6 0 1-.5 1-1v-1.5l-2.5-.5c-1.5 0-2.5-1-3.5-2.5l-2-2.5c-.8-1-2-1.5-3.2-1.5H8.5C6.5 8 4.5 9.5 3.5 11.5L2 14.5v3z" />
    <path d="M10 11h4.5v2H10z" />
    <path d="M2 17.5h20" />
  </svg>
)

// Сандали и Шлепанцы (Слайды)
export const SandalsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 17.5h19.5c.6 0 1-.5 1-1v-1H2v1c0 .5.4 1 1 1z" />
    <path d="M6.5 15.5c.5-3.5 2.5-6 6-6s5.5 2.5 6 6H6.5z" />
  </svg>
)


// ==================== 3. ПОДКАТЕГОРИИ "ОДЕЖДА" ====================

// Футболки
export const TshirtsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 4.5l3.5 1.8a3 3 0 005 0L18 4.5l3 4.5-2.5 2V20H5.5V11L3 9l3-4.5z" />
  </svg>
)

// Рубашки (С воротником и карманом)
export const ShirtsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 4.5l3.5 1.8a3 3 0 005 0L18 4.5l3 4.5-2.5 2V20H5.5V11L3 9l3-4.5z" />
    <path d="M6 4.5l6 4 6-4" />
    <path d="M12 8.5V20" />
    <path d="M14.5 10.5h3.5v4h-3.5z" />
  </svg>
)

// Джемперы и Кардиганы
export const JumpersIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M7 4.5h10l3.5 7.5-2.5 1.5L16 8.5V20H8V8.5L6 13.5l-2.5-1.5L7 4.5z" />
    <path d="M9.5 4.5c0 1.5 1.1 2.5 2.5 2.5s2.5-1 2.5-2.5" />
    <path d="M8 18.5h8" />
  </svg>
)

// Брюки (Классика)
export const TrousersIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 3.5h12l1 17h-5.5l-1.5-9-1.5 9H5L6 3.5z" />
    <path d="M6 6.5h12" />
    <path d="M12 3.5v3" />
  </svg>
)

// Джинсы (С карманами)
export const JeansIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5.5 3.5h13l1.5 17.5-5.5.5-2.5-5-2.5 5-5.5-.5L5.5 3.5z" />
    <path d="M5.5 6.5h13" />
    <path d="M12 3.5v8" />
    <path d="M5.5 9.5c2 0 3-.5 3-1.5" />
    <path d="M18.5 9.5c-2 0-3-.5-3-1.5" />
  </svg>
)

// Спортивные костюмы (Олимпийка + штаны)
export const TracksuitsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* Верх */}
    <path d="M7 3h10l1.5 5-3 1V12H8.5V9L5.5 8 7 3z" />
    <path d="M12 3v9" />
    {/* Штаны */}
    <path d="M8.5 13.5h7l1 7.5h-3.5l-1-4-1 4H8.5l1-7.5z" />
  </svg>
)

// Верхняя одежда (Куртка с капюшоном)
export const OuterwearIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 7.5h12l2.5 6.5-2.5 1.5V20.5H6V15.5L3.5 14 6 7.5z" />
    <path d="M9 7.5V4a3 3 0 016 0v3.5" />
    <path d="M12 7.5v13" />
    <path d="M8 11.5h8" />
    <path d="M8 15.5h8" />
  </svg>
)


// ==================== 4. ПОДКАТЕГОРИИ "АКСЕССУАРЫ" ====================

// Ремни (Пряжка)
export const BeltsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="10" width="13" height="4" rx="1" />
    <rect x="15" y="8" width="7" height="8" rx="1" strokeWidth={2} />
    <path d="M18.5 10v4" />
    <circle cx="5" cy="12" r="0.6" fill="currentColor" />
    <circle cx="8" cy="12" r="0.6" fill="currentColor" />
    <circle cx="11" cy="12" r="0.6" fill="currentColor" />
  </svg>
)

// Кепки (Бейсболка)
export const CapsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3.5 14.5a7.5 7.5 0 0115 0H3.5z" />
    <path d="M15 14.5c1.2 0 4.5.5 4.5 2.5H3.5" />
    <circle cx="11" cy="7" r="1" fill="currentColor" />
  </svg>
)

// Шапки (Вязаная шапка с помпоном)
export const HatsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 14.5a7 7 0 0114 0" />
    <rect x="4" y="14.5" width="16" height="4.5" rx="1" />
    <circle cx="12" cy="5" r="1.5" />
    <path d="M7.5 14.5v4.5m3-4.5v4.5m3-4.5v4.5m3-4.5v4.5" />
  </svg>
)

// Сумки и рюкзаки
export const BagsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="5" y="8" width="14" height="12.5" rx="3" />
    <path d="M9.5 8V5.5a2.5 2.5 0 015 0V8" />
    <rect x="8.5" y="12" width="7" height="5" rx="1" />
  </svg>
)


// ==================== 5. МАППИНГ КЛЮЧЕЙ И АЛИАСОВ ====================

const ICON_MAP: Record<string, React.FC<IconProps>> = {
  // Главные категории
  shoes: ShoesIcon,
  обувь: ShoesIcon,
  clothing: ClothingIcon,
  одежда: ClothingIcon,
  accessories: AccessoriesIcon,
  аксессуары: AccessoriesIcon,
  brands: BrandsIcon,
  бренды: BrandsIcon,

  // Промо
  new: NewIcon,
  'новые товары': NewIcon,
  popular: PopularIcon,
  'популярные товары': PopularIcon,
  discount: DiscountIcon,
  discounts: DiscountIcon,
  sale: DiscountIcon,
  скидки: DiscountIcon,

  // Обувь
  all: AllIcon,
  'все товары': AllIcon,
  sneakers: SneakersIcon,
  кроссовки: SneakersIcon,
  boots: BootsIcon,
  ботинки: BootsIcon,
  loafers: LoafersIcon,
  лоферы: LoafersIcon,
  sandals: SandalsIcon,
  'сандали и шлепанцы': SandalsIcon,
  'сандали и шлёпанцы': SandalsIcon,
  slides: SandalsIcon,

  // Одежда
  tshirts: TshirtsIcon,
  tshirt: TshirtsIcon,
  футболки: TshirtsIcon,
  shirts: ShirtsIcon,
  shirt: ShirtsIcon,
  рубашки: ShirtsIcon,
  jumpers: JumpersIcon,
  'джемперы и кардиганы': JumpersIcon,
  джемперы: JumpersIcon,
  trousers: TrousersIcon,
  брюки: TrousersIcon,
  jeans: JeansIcon,
  джинсы: JeansIcon,
  tracksuits: TracksuitsIcon,
  'спортивные костюмы': TracksuitsIcon,
  outerwear: OuterwearIcon,
  'верхняя одежда': OuterwearIcon,

  // Аксессуары
  belts: BeltsIcon,
  ремни: BeltsIcon,
  caps: CapsIcon,
  кепки: CapsIcon,
  hats: HatsIcon,
  шапки: HatsIcon,
  bags: BagsIcon,
  'сумки и рюкзаки': BagsIcon,
  backpack: BagsIcon,

  // Эмодзи-алиасы для БД
  '👟': SneakersIcon,
  '👞': LoafersIcon,
  '🥾': BootsIcon,
  '👕': TshirtsIcon,
  '👔': ShirtsIcon,
  '🧥': OuterwearIcon,
  '🧢': CapsIcon,
  '👑': AccessoriesIcon,
  '🎒': BagsIcon,
  '📦': AllIcon,
  '🏷️': BrandsIcon,
  '🏷': BrandsIcon,
}

// ==================== 6. ГЛАВНЫЙ КОМПОНЕНТ ====================

interface CategoryIconProps extends Omit<IconProps, 'name'> {
  name?: string | null
}

export default function CategoryIcon({ name, size = 24, ...props }: CategoryIconProps) {
  const key = (name || '').toLowerCase().trim()
  const IconComponent = ICON_MAP[key] || AllIcon
  return <IconComponent size={size} {...props} />
}