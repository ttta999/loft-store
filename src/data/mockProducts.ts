export type Product = {
  id: string
  name_ru: string
  name_uz: string
  category: 'shoes' | 'clothes' | 'caps' | 'accessories'
  subcategory: string
  price_usd: number
  images: string[]
  size_type: 'numeric' | 'alphabetical' | 'one_size'
}

export const mockProducts: Product[] = [
  {
    id: '1',
    name_ru: 'Nike Air Force 1',
    name_uz: 'Nike Air Force 1',
    category: 'shoes',
    subcategory: 'sneakers',
    price_usd: 120,
    images: ['https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500'],
    size_type: 'numeric',
  },
  {
    id: '2',
    name_ru: 'Adidas Samba',
    name_uz: 'Adidas Samba',
    category: 'shoes',
    subcategory: 'sneakers',
    price_usd: 95,
    images: ['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500'],
    size_type: 'numeric',
  },
  {
    id: '3',
    name_ru: 'Футболка Oversize',
    name_uz: 'Futbolka Oversize',
    category: 'clothes',
    subcategory: 't-shirts',
    price_usd: 35,
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500'],
    size_type: 'alphabetical',
  },
  {
    id: '4',
    name_ru: 'Худи черное',
    name_uz: 'Xudi qora',
    category: 'clothes',
    subcategory: 'hoodies',
    price_usd: 65,
    images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500'],
    size_type: 'alphabetical',
  },
  {
    id: '5',
    name_ru: 'Кепка NY Yankees',
    name_uz: 'Kepka NY Yankees',
    category: 'caps',
    subcategory: 'caps',
    price_usd: 30,
    images: ['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500'],
    size_type: 'one_size',
  },
  {
    id: '6',
    name_ru: 'Ремень кожаный',
    name_uz: 'Kamar charm',
    category: 'accessories',
    subcategory: 'belts',
    price_usd: 45,
    images: ['https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=500'],
    size_type: 'numeric',
  },
]

export const categories = [
  { id: 'shoes', name_ru: 'Обувь', name_uz: 'Oyoq kiyim', icon: '👟' },
  { id: 'clothes', name_ru: 'Одежда', name_uz: 'Kiyim', icon: '' },
  { id: 'caps', name_ru: 'Кепки', name_uz: 'Kepkalar', icon: '🧢' },
  { id: 'accessories', name_ru: 'Аксессуары', name_uz: 'Aksessuarlar', icon: '⌚' },
]