import { createClient } from '@supabase/supabase-js'
import { sendNotificationToManager, sendNotificationToClient } from './telegram'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Ошибка при загрузке товаров:', error)
    return []
  }
  
  return data || []
}

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

export const createOrder = async (orderData: any) => {
  console.log('Создаём заказ:', orderData)
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

export const createOrderFromSpecial = async (specialRequestId: string, orderData: any) => {
  console.log('Создаём заказ из спецзаказа:', { 
    specialRequestId, 
    type: typeof specialRequestId,
    orderData 
  })
  
  const specialOrderIdStr = specialRequestId.toString()
  
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...orderData,
      special_order_id: specialOrderIdStr,
    })
    .select()
  
  if (error) {
    console.error('❌ Ошибка создания заказа из спецзаказа:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    return { data: null, error }
  }

  const createdOrder = Array.isArray(data) ? data[0] : data
  console.log('✅ Заказ создан:', createdOrder)
  
  const { error: updateError } = await supabase
    .from('china_requests')
    .update({ 
      status: 'Оплачен',
      converted_to_order_id: createdOrder.id.toString()
    })
    .eq('id', specialRequestId)

  if (updateError) {
    console.error('❌ Ошибка обновления спецзаказа:', updateError)
  } else {
    console.log('✅ Спецзаказ обновлён на "Оплачен"')
  }

  return { data, error: null }
}

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

export const notifyNewOrder = async (order: any) => {
  const itemsList = order.items.map((item: any, index: number) => {
    return `${index + 1}. ${item.name}
   Размер: ${item.size}
   Количество: ${item.quantity} шт.
   Цена: $${item.priceUsd}`
  }).join('\n\n')

  const deliveryAddress = order.delivery_method === 'delivery' && order.delivery_address
    ? `\n📍 Адрес доставки: ${order.delivery_address}`
    : ''

  const specialMark = order.special_order_id ? `\n🌍 Это заказ из спецзаказа №${order.special_order_id}` : ''

  // ✅ СООБЩЕНИЕ МЕНЕДЖЕРУ (через БОТА МЕНЕДЖЕРА)
  const managerMessage = `
🛍 <b>Новый заказ №${order.id}</b>${specialMark}

👤 Клиент: ${order.client_name}
📞 Телефон: ${order.client_phone}
💰 Сумма: $${order.total_price_usd}

📦 <b>Товары:</b>
${itemsList}

🚚 Способ получения: ${order.delivery_method === 'pickup' ? 'Самовывоз' : 'Доставка'}${deliveryAddress}
💳 Оплата: ${order.payment_method === 'online_card' ? 'Картой' : 'При получении'}
  `.trim()

  // Отправляем менеджеру через БОТА МЕНЕДЖЕРА
  await sendNotificationToManager(managerMessage)

  // ✅ СООБЩЕНИЕ КЛИЕНТУ (через ОТДЕЛЬНЫЙ БОТ КЛИЕНТОВ)
  const clientChatId = order.user_chat_id || order.user_id
  if (clientChatId && clientChatId !== 'guest-user') {
    const clientMessage = `
✅ <b>Ваш заказ №${order.id} принят!</b>

💰 Сумма: $${order.total_price_usd}

📦 <b>Товары:</b>
${itemsList}

🚚 ${order.delivery_method === 'pickup' ? 'Самовывоз' : 'Доставка'}
💳 ${order.payment_method === 'online_card' ? 'Оплата картой' : 'Оплата при получении'}

📞 Менеджер свяжется с вами в ближайшее время
    `.trim()

    // ✅ Отправляем клиенту через БОТА КЛИЕНТОВ
    await sendNotificationToClient(clientMessage, clientChatId)
  }
}

export const notifyNewChinaRequest = async (request: any) => {
  const message = `
🌍 <b>Новый спецзаказ №${request.id}</b>

📎 Ссылка: ${request.link}
📏 Размер/Цвет: ${request.size_color || 'Не указан'}
💬 Комментарий: ${request.comment || 'Нет'}
  `.trim()

  // ✅ Отправляем ТОЛЬКО менеджеру
  await sendNotificationToManager(message)
}

// ✅ ФУНКЦИЯ ДЛЯ ОТПРАВКИ УВЕДОМЛЕНИЯ КЛИЕНТУ ИЗ АДМИНКИ
export const sendClientNotification = async (clientChatId: string, message: string): Promise<boolean> => {
  if (!clientChatId) return false
  return sendNotificationToClient(message, clientChatId)
}