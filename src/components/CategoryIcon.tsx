import {
  Footprints, Shirt, Watch, Gem, Backpack, Briefcase, Crown, Wind,
  Dumbbell, Package, Tag, Layers, Scissors, Glasses, ShoppingBag,
  Heart, Star, Zap, Sparkles, type LucideProps,
} from 'lucide-react'

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  footprints: Footprints,      // обувь
  shoe: Footprints,
  shoes: Footprints,
  shirt: Shirt,                // одежда
  tshirt: Shirt,
  t_shirt: Shirt,
  watch: Watch,                // часы
  gem: Gem,                    // аксессуары/премиум
  diamond: Gem,
  backpack: Backpack,          // рюкзаки
  briefcase: Briefcase,        // сумки
  bag: Briefcase,
  crown: Crown,                // кепки/шапки
  hat: Crown,
  cap: Crown,
  wind: Wind,                  // верхняя одежда
  jacket: Wind,
  dumbbell: Dumbbell,          // спортивные костюмы
  sport: Dumbbell,
  package: Package,            // все товары / фолбэк
  box: Package,
  tag: Tag,                    // бренды / скидки
  price_tag: Tag,
  layers: Layers,              // слои / джинсы / брюки
  jeans: Layers,
  pants: Layers,
  scissors: Scissors,          // пошив / ремни
  belt: Scissors,
  glasses: Glasses,            // очки (если будут)
  'shopping-bag': ShoppingBag,
  shopping_bag: ShoppingBag,
  heart: Heart,
  star: Star,
  zap: Zap,                    // быстрая доставка / энергия
  sparkles: Sparkles,          // новые товары

  // === Алиасы: эмодзи (для обратной совместимости со старой БД) ===
  '👟': Footprints,
  '👞': Footprints,
  '👠': Footprints,
  '🥾': Footprints,
  '👕': Shirt,
  '👔': Shirt,
  '🧥': Wind,
  '🧢': Crown,
  '🎩': Crown,
  '👒': Crown,
  '⌚': Watch,
  '👜': Briefcase,
  '🎒': Backpack,
  '💎': Gem,
  '📦': Package,
  '🏷️': Tag,
  '🏷': Tag,
  '🛍️': ShoppingBag,
  '✨': Sparkles,
  '⭐': Star,
  '⚡': Zap,
  '❤️': Heart,
  '💰': Tag,
}

interface CategoryIconProps extends LucideProps {
  name: string
}

export default function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const key = (name || '').toLowerCase().trim()
  const Icon = ICON_MAP[key] || Package
  return <Icon {...props} />
}