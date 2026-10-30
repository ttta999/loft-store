export interface StoredItem {
  productId: string
  name: string
  size: string
  quantity: number
  colorName?: string | null
  image?: string | null
  isSpecialOrder?: boolean
}
export interface StoredRecord {
  id: string | number
  items?: StoredItem[]
  payment_screenshot_url?: string | null
  client_name?: string
  client_phone?: string
  total_price_uzs?: number
  delivery_method?: string
  delivery_address?: string | null
  payment_method?: string
  product_name?: string
  link?: string
  size_color?: string
  comment?: string
}
