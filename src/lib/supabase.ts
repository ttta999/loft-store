import { createClient } from '@supabase/supabase-js'
import { sendNotification } from './telegram'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Получить все товары
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

// Получить размеры товара
export const getProductSizes = async (productId: string) => {
  const { data, error } = await supabase
    .from('product_variants')
    .select('size_value')
    .eq('product_id', productId)
  
  if (error) {
    console.error('Ошибка при загрузке размеров:', error)
    return []
  }
  
  return data
}

// Создать заказ
export const createOrder = async (orderData: any) => {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
  
  if (error) {
    console.error('Ошибка при создании заказа:', error)
    return { data: null, error }
  }
  
  return { data, error: null }
}

// Функция отправки уведомления о новом заказе
export const notifyNewOrder = async (order: any) => {
  const MANAGER_CHAT_ID = '6150570809' // ← ВСТАВЬ СВОЙ chat_id сюда!
  
  const message = `
🛍 <b>Новый заказ №${order.id}</b>

👤 Клиент: ${order.client_name}
📞 Телефон: ${order.client_phone}
💰 Сумма: $${order.total_price_usd}

📦 Способ получения: ${order.delivery_method === 'pickup' ? 'Самовывоз' : 'Доставка'}
💳 Оплата: ${order.payment_method === 'online_card' ? 'Картой' : 'При получении'}
  `.trim()

  await sendNotification(message, MANAGER_CHAT_ID)
}

// Функция отправки уведомления о новом спецзаказе
export const notifyNewChinaRequest = async (request: any) => {
  const MANAGER_CHAT_ID = '6150570809' // ← ТОТ ЖЕ chat_id!
  
  const message = `
🌍 <b>Новый спецзаказ №${request.id}</b>

📎 Ссылка: ${request.link}
📏 Размер/Цвет: ${request.size_color || 'Не указан'}
💬 Комментарий: ${request.comment || 'Нет'}
  `.trim()

  await sendNotification(message, MANAGER_CHAT_ID)
}