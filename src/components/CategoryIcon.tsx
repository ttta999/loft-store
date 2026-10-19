import {
  Footprints, Shirt, Watch, Gem, Backpack, Briefcase, Crown, Wind,
  Dumbbell, Package, Tag, Layers, Scissors, Glasses, ShoppingBag,
  Heart, Star, Zap, Sparkles, Mountain, Sun, Flame, Snowflake, Link,
  BedDouble, Bed, Sofa, Lamp, Utensils, Coffee, Music, Camera,
  Headphones, Smartphone, Laptop, Car, Bike, Plane, Ship, Truck,
  Store, Home, Building2, CloudRain, Leaf, Flower2, TreePine, Moon,
  Clock, Calendar, Bell, Mail, Phone, MapPin, Compass, Globe, Rocket,
  Gamepad2, Puzzle, ToyBrick, Blocks, Umbrella, Baby, Dog, Cat,
  BookOpen, PenTool, Palette, Wallet, Coins, Percent, TrendingUp,
  type LucideProps,
} from 'lucide-react'

/**
 * Реестр иконок для категорий и подкатегорий.
 * Поддерживает имена lucide-иконок (kebab-case) и старые эмодзи (обратная совместимость).
 * Неизвестное значение → Package (безопасный фолбэк).
 */
const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  // === Одежда / обувь ===
  footprints: Footprints,
  shoe: Footprints,
  shoes: Footprints,
  shirt: Shirt,
  tshirt: Shirt,
  t_shirt: Shirt,
  mountain: Mountain,      // ботинки (треккинг)
  sun: Sun,                // сандалии (лето)
  snowflake: Snowflake,    // шапки (зима)
  wind: Wind,              // верхняя одежда
  flame: Flame,            // джемперы (тепло)
  dumbbell: Dumbbell,      // спортивные костюмы
  layers: Layers,          // брюки
  scissors: Scissors,      // джинсы (деним/крой)
  link: Link,              // ремни
  crown: Crown,            // кепки
  glasses: Glasses,
  watch: Watch,
  gem: Gem,                // лоферы (премиум)
  diamond: Gem,

  // === Сумки / дом / прочее ===
  backpack: Backpack,
  briefcase: Briefcase,
  bag: Briefcase,
  'shopping-bag': ShoppingBag,
  shopping_bag: ShoppingBag,
  package: Package,
  box: Package,
  tag: Tag,
  'bed-double': BedDouble, // постельное бельё / комплекты
  bed_double: BedDouble,
  bed: Bed,
  sofa: Sofa,
  lamp: Lamp,
  utensils: Utensils,
  coffee: Coffee,
  music: Music,
  camera: Camera,
  headphones: Headphones,
  smartphone: Smartphone,
  laptop: Laptop,
  car: Car,
  bike: Bike,
  plane: Plane,
  ship: Ship,
  truck: Truck,
  store: Store,
  home: Home,
  building: Building2,

  // === Природа / погода ===
  'cloud-rain': CloudRain,
  cloud_rain: CloudRain,
  leaf: Leaf,
  flower: Flower2,
  tree: TreePine,
  moon: Moon,
  umbrella: Umbrella,

  // === Сервис / маркетинг ===
  clock: Clock,
  calendar: Calendar,
  bell: Bell,
  mail: Mail,
  phone: Phone,
  'map-pin': MapPin,
  map_pin: MapPin,
  compass: Compass,
  globe: Globe,
  rocket: Rocket,
  gamepad: Gamepad2,
  puzzle: Puzzle,
  toy: ToyBrick,
  blocks: Blocks,
  baby: Baby,
  dog: Dog,
  cat: Cat,
  book: BookOpen,
  pen: PenTool,
  palette: Palette,
  wallet: Wallet,
  coins: Coins,
  percent: Percent,
  trending: TrendingUp,
  heart: Heart,
  star: Star,
  zap: Zap,
  sparkles: Sparkles,

  // === Алиасы: старые эмодзи (обратная совместимость с БД) ===
  '👟': Footprints,
  '👞': Footprints,
  '👠': Footprints,
  '🥾': Mountain,
  '👕': Shirt,
  '👔': Briefcase,
  '🧥': Wind,
  '🧢': Crown,
  '🎩': Crown,
  '👒': Sun,
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
  '🛏️': BedDouble,
  '🛏': BedDouble,
}

// ✅ FIX ts2430: убираем конфликт поля name через Omit<LucideProps, 'name'>
interface CategoryIconProps extends Omit<LucideProps, 'name'> {
  name?: string | null
}

export default function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const key = (name || '').toLowerCase().trim()
  const Icon = ICON_MAP[key] || Package
  return <Icon {...props} />
}