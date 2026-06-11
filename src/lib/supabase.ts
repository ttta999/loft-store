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

// Создать заказ из спецзаказа (с привязкой special_order_id)
export const createOrderFromSpecial = async (specialRequestId: string, orderData: any) => {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...orderData,
      special_order_id: specialRequestId,
    })
    .select()
  
  if (error) {
    console.error('Ошибка создания заказа из спецзаказа:', error)
    return { data: null, error }
  }

  // Обновляем статус спецзаказа на "Оплачен" и привязываем к заказу
  const createdOrder = Array.isArray(data) ? data[0] : data
  await supabase
    .from('china_requests')
    .update({ 
      status: 'Оплачен',
      converted_to_order_id: createdOrder.id 
    })
    .eq('id', specialRequestId)

  return { data, error: null }
}

// Обновить статус спецзаказа
export const updateChinaRequestStatus = async (requestId: string, status: string, extraData?: any) => {
  const { data, error } = await supabase
    .from('china_requests')
    .update({ status, ...extraData })
    .eq('id', requestId)
    .select()
  
  if (error) {
    console.error('Ошибка обновления статуса спецзаказа:', error)
    return null
  }
  
  return Array.isArray(data) ? data[0] : data
}

// Функция отправки уведомления о новом заказе
export const notifyNewOrder = async (order: any) => {
  const MANAGER_CHAT_ID = '6150570809'
  
  // Формируем список товаров
  const itemsList = order.items.map((item: any, index: number) => {
    return `${index + 1}. ${item.name}
   Размер: ${item.size}
   Количество: ${item.quantity} шт.
   Цена: $${item.priceUsd}`
  }).join('\n\n')

  // Адрес доставки (если есть)
  const deliveryAddress = order.delivery_method === 'delivery' && order.delivery_address
    ? `\n📍 Адрес доставки: ${order.delivery_address}`
    : ''

  // Пометка если это спецзаказ
  const specialMark = order.special_order_id ? `\n🌍 Это заказ из спецзаказа №${order.special_order_id}` : ''

  const message = `
🛍 <b>Новый заказ №${order.id}</b>${specialMark}

👤 Клиент: ${order.client_name}
📞 Телефон: ${order.client_phone}
💰 Сумма: $${order.total_price_usd}

📦 <b>Товары:</b>
${itemsList}

🚚 Способ получения: ${order.delivery_method === 'pickup' ? 'Самовывоз' : 'Доставка'}${deliveryAddress}
💳 Оплата: ${order.payment_method === 'online_card' ? 'Картой' : 'При получении'}
  `.trim()

  await sendNotification(message, MANAGER_CHAT_ID)
}

// Функция отправки уведомления о новом спецзаказе
export const notifyNewChinaRequest = async (request: any) => {
  const MANAGER_CHAT_ID = '6150570809'
  
  const message = `
🌍 <b>Новый спецзаказ №${request.id}</b>

📎 Ссылка: ${request.link}
📏 Размер/Цвет: ${request.size_color || 'Не указан'}
💬 Комментарий: ${request.comment || 'Нет'}
  `.trim()

  await sendNotification(message, MANAGER_CHAT_ID)
}