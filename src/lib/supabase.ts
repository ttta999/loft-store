import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kmbmsbydxnxxiwypaxwm.supabase.co'
const supabaseAnonKey = 'sb_publishable_AHafjKFu3UCrUdefb0uRpQ_7i-AFyf1'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Получение всех товаров
export const getProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Ошибка при загрузке товаров:', error)
    return []
  }
  
  return data
}

// Получение размеров для товара
export const getProductSizes = async (productId: string) => {
  const { data, error } = await supabase
    .from('product_variants')
    .select('size_value, stock')
    .eq('product_id', productId)
  
  if (error) {
    console.error('Ошибка при загрузке размеров:', error)
    return []
  }
  
  return data
}

// Создание заказа
export const createOrder = async (orderData: any) => {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
  
  if (error) {
    console.error('Ошибка при создании заказа:', error)
    throw error
  }
  
  return data
}

// Создание спецзаказа
export const createChinaRequest = async (requestData: any) => {
  const { data, error } = await supabase
    .from('china_requests')
    .insert(requestData)
    .select()
  
  if (error) {
    console.error('Ошибка при создании спецзаказа:', error)
    throw error
  }
  
  return data
}