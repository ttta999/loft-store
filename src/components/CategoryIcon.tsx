import React from 'react'
import {
  CATEGORY_ICONS,
  BLOCK_ICONS,
  SUBCATEGORY_ICONS,
  PackageIcon,
  type IconProps,
} from '../lib/customIcons'

/**
 * Карта «ключ из БД / алиас / эмодзи → компонент иконки».
 * Фолбэк для неизвестных ключей — PackageIcon (коробка).
 */
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  // ===== Категории =====
  shoes: CATEGORY_ICONS.shoes,
  clothes: CATEGORY_ICONS.clothes,
  clothing: CATEGORY_ICONS.clothes,        // старый ключ
  accessories: CATEGORY_ICONS.accessories,
  brands: CATEGORY_ICONS.brands,
  brand: CATEGORY_ICONS.brands,

  // ===== Блоки главной =====
  new: BLOCK_ICONS.new,
  'new-items': BLOCK_ICONS.new,
  popular: BLOCK_ICONS.popular,
  'popular-items': BLOCK_ICONS.popular,

  // ===== Подкатегории (новые ключи) =====
  sneakers: SUBCATEGORY_ICONS.sneakers,
  boots: SUBCATEGORY_ICONS.boots,
  loafers: SUBCATEGORY_ICONS.loafers,
  sandals: SUBCATEGORY_ICONS.sandals,
  tshirts: SUBCATEGORY_ICONS.tshirts,
  shirts: SUBCATEGORY_ICONS.shirts,
  sweaters: SUBCATEGORY_ICONS.sweaters,
  trousers: SUBCATEGORY_ICONS.trousers,
  jeans: SUBCATEGORY_ICONS.jeans,
  tracksuits: SUBCATEGORY_ICONS.tracksuits,
  outerwear: SUBCATEGORY_ICONS.outerwear,
  belts: SUBCATEGORY_ICONS.belts,
  caps: SUBCATEGORY_ICONS.caps,
  beanies: SUBCATEGORY_ICONS.beanies,
  bags: SUBCATEGORY_ICONS.bags,

  // ===== Старые ключи БД (алиасы) =====
  jumpers: SUBCATEGORY_ICONS.sweaters,
  'sweaters-cardigans': SUBCATEGORY_ICONS.sweaters,
  hats: SUBCATEGORY_ICONS.beanies,
  pants: SUBCATEGORY_ICONS.trousers,
  'sandals-shlapantsy': SUBCATEGORY_ICONS.sandals,
  't-shirts': SUBCATEGORY_ICONS.tshirts,
  'bags-backpacks': SUBCATEGORY_ICONS.bags,
  backpack: SUBCATEGORY_ICONS.bags,

  // ===== «Все товары» =====
  all: PackageIcon,
  package: PackageIcon,
  'shoes-all': PackageIcon,
  'clothes-all': PackageIcon,
  'accessories-all': PackageIcon,

  // ===== Эмодзи из старой БД =====
  '👟': SUBCATEGORY_ICONS.sneakers,
  '👞': SUBCATEGORY_ICONS.loafers,
  '🥾': SUBCATEGORY_ICONS.boots,
  '👕': SUBCATEGORY_ICONS.tshirts,
  '👔': SUBCATEGORY_ICONS.shirts,
  '🧥': SUBCATEGORY_ICONS.outerwear,
  '🧢': SUBCATEGORY_ICONS.caps,
  '🎩': SUBCATEGORY_ICONS.beanies,
  '': CATEGORY_ICONS.accessories,
  '🎒': SUBCATEGORY_ICONS.bags,
  '📦': PackageIcon,
  '🏷️': CATEGORY_ICONS.brands,
  '🏷': CATEGORY_ICONS.brands,
  '🛏️': PackageIcon,
  '🛏': PackageIcon,
}

interface CategoryIconProps {
  /** Ключ из БД (categories.icon / subcategories.icon), алиас или эмодзи */
  name?: string | null
  size?: number
  className?: string
  color?: string
  strokeWidth?: number
}

export default function CategoryIcon({
  name,
  size = 24,
  className,
  color,
  strokeWidth,
}: CategoryIconProps) {
  const key = (name || '').toLowerCase().trim()
  const Component = (ICON_MAP[key] || PackageIcon) as React.ComponentType<IconProps>
  return <Component size={size} className={className} color={color} strokeWidth={strokeWidth} />
}