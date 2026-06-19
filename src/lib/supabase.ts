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

// ✅ НОВАЯ ФУНКЦИЯ: Проверка наличия товара и уменьшение остатков
const updateStockAfterOrder = async (items: any[]) => {
  console.log('📦 Обновляем остатки после заказа:', items)
  
  for (const item of items) {
    // Пропускаем спецзаказы (у них нет productId)
    if (!item.productId || item.isSpecialOrder) continue
    
    // Находим вариант товара
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', item.productId)
      .eq('size_value', item.size)
    
    if (variantsError) {
      console.error('❌ Ошибка поиска варианта:', variantsError)
      continue
    }
    
    if (!variants || variants.length === 0) {
      console.warn(`⚠️ Вариант не найден: товар ${item.productId}, размер ${item.size}`)
      continue
    }
    
    const variant = variants[0]
    const newStock = Math.max(0, (variant.stock || 0) - item.quantity)
    
    console.log(`📉 Товар ${item.productId} (${item.size}): ${variant.stock} → ${newStock}`)
    
    // Обновляем остаток
    const { error: updateError } = await supabase
      .from('product_variants')
      .update({ stock: newStock })
      .eq('id', variant.id)
    
    if (updateError) {
      console.error('❌ Ошибка обновления остатка:', updateError)
    }
    
    // ✅ Если остаток стал 0 — скрываем товар
    if (newStock === 0) {
      console.log(`🙈 Товар ${item.productId} закончился, скрываем`)
      await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', item.productId)
    }
  }
}

// ✅ НОВАЯ ФУНКЦИЯ: Проверка наличия товара перед заказом
const checkStockAvailability = async (items: any[]): Promise<{ available: boolean; error?: string }> => {
  for (const item of items) {
    if (!item.productId || item.isSpecialOrder) continue
    
    const { data: variants, error } = await supabase
      .from('product_variants')
      .select('stock')
      .eq('product_id', item.productId)
      .eq('size_value', item.size)
      .single()
    
    if (error || !variants) {
      return { 
        available: false, 
        error: `Товар "${item.name}" (${item.size}) не найден` 
      }
    }
    
    if ((variants.stock || 0) < item.quantity) {
      return { 
        available: false, 
        error: `Недостаточно товара "${item.name}" (${item.size}). Осталось: ${variants.stock} шт.` 
      }
    }
  }
  
  return { available: true }
}

export const createOrder = async (orderData: any) => {
  console.log('Создаём заказ:', orderData)
  
  // ✅ Проверяем наличие товара перед созданием заказа
  if (orderData.items && orderData.items.length > 0) {
    const stockCheck = await checkStockAvailability(orderData.items)
    if (!stockCheck.available) {
      console.error('❌ Недостаточно товара:', stockCheck.error)
      return { 
        data: null, 
        error: { message: stockCheck.error },
        stockError: true
      }
    }
  }
  
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
  
  if (error) {
    console.error('Ошибка при создании заказа:', error)
    return { data: null, error }
  }
  
  // ✅ Уменьшаем остатки после успешного создания заказа
  if (orderData.items && orderData.items.length > 0) {
    await updateStockAfterOrder(orderData.items)
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
  
  // ✅ Для спецзаказов НЕ проверяем остатки (товар из Китая)
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...orderData,
      special_order_id: specialOrderIdStr,
    })
    .select()
  
  if (error) {
    console.error('❌ Ошибка создания заказа из спецзаказа:', error)
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

// ✅ НОВАЯ ФУНКЦИЯ: Возврат остатков при отмене заказа
export const restoreStockAfterCancel = async (items: any[]) => {
  console.log('📈 Возвращаем остатки после отмены:', items)
  
  for (const item of items) {
    if (!item.productId || item.isSpecialOrder) continue
    
    const { data: variants } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', item.productId)
      .eq('size_value', item.size)
    
    if (!variants || variants.length === 0) continue
    
    const variant = variants[0]
    const newStock = (variant.stock || 0) + item.quantity
    
    console.log(`📈 Товар ${item.productId} (${item.size}): ${variant.stock} → ${newStock}`)
    
    await supabase
      .from('product_variants')
      .update({ stock: newStock })
      .eq('id', variant.id)
    
    // ✅ Если товар был скрыт — снова показываем
    if (variant.stock === 0 && newStock > 0) {
      await supabase
        .from('products')
        .update({ is_active: true })
        .eq('id', item.productId)
    }
  }
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

  await sendNotificationToManager(managerMessage)

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

  await sendNotificationToManager(message)
}

export const sendClientNotification = async (clientChatId: string, message: string): Promise<boolean> => {
  if (!clientChatId) return false
  return sendNotificationToClient(message, clientChatId)
}