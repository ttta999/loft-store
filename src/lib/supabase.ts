import { createClient } from '@supabase/supabase-js'
import { sendNotificationToManager, sendNotificationToClient } from './telegram'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ✅ In-memory кеш популярности (переживает переходы между страницами)
const popularityCache = {
  data: null as Record<string, number> | null,
  updatedAt: 0,
}
const POPULARITY_CACHE_TTL = 10 * 60 * 1000 // 10 минут

// ✅ Получение реальной популярности товаров через SQL-функцию
export const fetchProductPopularity = async (
  force = false
): Promise<Record<string, number>> => {
  const age = Date.now() - popularityCache.updatedAt
  if (!force && popularityCache.data && age < POPULARITY_CACHE_TTL) {
    return popularityCache.data
  }

  try {
    const { data, error } = await supabase.rpc('get_product_popularity')

    if (error) {
      console.error('❌ Ошибка получения популярности:', error)
      return popularityCache.data || {}
    }

    const map: Record<string, number> = {}
    for (const row of (data as any[]) || []) {
      map[row.product_id] = Number(row.sold_count) || 0
    }

    popularityCache.data = map
    popularityCache.updatedAt = Date.now()
    console.log('✅ Популярность обновлена:', Object.keys(map).length, 'товаров')
    return map
  } catch (error) {
    console.error('❌ Ошибка запроса популярности:', error)
    return popularityCache.data || {}
  }
}

// ✅ Сколько раз конкретный товар был продан (с учётом кеша)
export const getProductSoldCount = async (
  productId: string
): Promise<number> => {
  const map = await fetchProductPopularity()
  return map[productId] || 0
}

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
    .gt('stock', 0)

  if (error) {
    console.error('Ошибка при загрузке размеров:', error)
    return []
  }

  return data || []
}

export const checkProductStock = async (
  productId: string,
  size: string,
  quantity: number
): Promise<{ available: boolean; error?: string }> => {
  const { data: variant, error } = await supabase
    .from('product_variants')
    .select('stock')
    .eq('product_id', productId)
    .eq('size_value', size)
    .single()

  if (error || !variant) {
    return {
      available: false,
      error: `К сожалению, размер "${size}" временно отсутствует`,
    }
  }

  if ((variant.stock || 0) < quantity) {
    if (variant.stock === 0) {
      return {
        available: false,
        error: `Размер "${size}" закончился. Мы уже работаем над пополнением! 🙏`,
      }
    } else {
      return {
        available: false,
        error: `Осталось только ${variant.stock} шт.`,
      }
    }
  }

  return { available: true }
}

const updateStockAfterOrder = async (items: any[]) => {
  console.log('📦 Обновляем остатки после заказа:', items)

  for (const item of items) {
    if (!item.productId || item.isSpecialOrder) continue

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

    const { error: updateError } = await supabase
      .from('product_variants')
      .update({ stock: newStock })
      .eq('id', variant.id)

    if (updateError) {
      console.error('❌ Ошибка обновления остатка:', updateError)
    }
  }
}

const checkStockAvailability = async (
  items: any[]
): Promise<{ available: boolean; error?: string }> => {
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
        error: `К сожалению, размер "${item.size}" товара "${item.name}" временно отсутствует`,
      }
    }

    if ((variants.stock || 0) < item.quantity) {
      if (variants.stock === 0) {
        return {
          available: false,
          error: `Размер "${item.size}" (${item.name}) закончился. Мы уже работаем над пополнением! 🙏`,
        }
      } else {
        return {
          available: false,
          error: `Осталось только ${variants.stock} шт. размера "${item.size}". Попробуйте уменьшить количество.`,
        }
      }
    }
  }

  return { available: true }
}

export const createOrder = async (orderData: any) => {
  console.log('Создаём заказ:', orderData)

  if (orderData.items && orderData.items.length > 0) {
    const stockCheck = await checkStockAvailability(orderData.items)
    if (!stockCheck.available) {
      console.error('❌ Недостаточно товара:', stockCheck.error)
      return {
        data: null,
        error: { message: stockCheck.error },
        stockError: true,
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

  if (orderData.items && orderData.items.length > 0) {
    await updateStockAfterOrder(orderData.items)
    // ✅ Инвалидируем кеш популярности — появились новые продажи
    popularityCache.updatedAt = 0
  }

  return { data, error: null }
}

export const createOrderFromSpecial = async (
  specialRequestId: string,
  orderData: any
) => {
  console.log('Создаём заказ из спецзаказа:', {
    specialRequestId,
    type: typeof specialRequestId,
    orderData,
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
    return { data: null, error }
  }

  const createdOrder = Array.isArray(data) ? data[0] : data
  console.log('✅ Заказ создан:', createdOrder)

  const { error: updateError } = await supabase
    .from('china_requests')
    .update({
      status: 'Оплачен',
      converted_to_order_id: createdOrder.id.toString(),
    })
    .eq('id', specialRequestId)

  if (updateError) {
    console.error('❌ Ошибка обновления спецзаказа:', updateError)
  } else {
    console.log('✅ Спецзаказ обновлён на "Оплачен"')
  }

  return { data, error: null }
}

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
  }
}

export const updateChinaRequestStatus = async (
  requestId: string,
  status: string,
  extraData?: any
) => {
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
  const isUZS = order.total_price_uzs && order.total_price_uzs > 0
  const exchangeRate = order.exchange_rate_at_order || 12100

  const itemsList = order.items
    .map((item: any, index: number) => {
      const priceText = isUZS
        ? `${item.priceUzs ? Number(item.priceUzs).toLocaleString() : Math.round(item.priceUsd * exchangeRate).toLocaleString()} сум`
        : `$${item.priceUsd}`

      return `${index + 1}. ${item.name}
Размер: ${item.size}
Количество: ${item.quantity} шт.
Цена: ${priceText}`
    })
    .join('\n\n')

  const deliveryAddress =
    order.delivery_method === 'delivery' && order.delivery_address
      ? `\n📍 Адрес доставки: ${order.delivery_address}`
      : ''

  const specialMark = order.special_order_id
    ? `\n🌍 Это заказ из спецзаказа №${order.special_order_id}`
    : ''

  const totalText = isUZS
    ? `${order.total_price_uzs ? Number(order.total_price_uzs).toLocaleString() : Math.round(order.total_price_usd * exchangeRate).toLocaleString()} сум`
    : `$${order.total_price_usd}`

  const paymentText = order.payment_method === 'online_card' ? 'Переводом' : 'При получении'

  const managerMessage = `
🛍 <b>Новый заказ №${order.id}</b>${specialMark}
👤 Клиент: ${order.client_name}
📞 Телефон: ${order.client_phone}
💰 Сумма: ${totalText}

📦 <b>Товары:</b>
${itemsList}

🚚 Способ получения: ${order.delivery_method === 'pickup' ? 'Самовывоз' : 'Доставка'}${deliveryAddress}
💳 Оплата: ${paymentText}
`.trim()

  await sendNotificationToManager(managerMessage)

  const clientChatId = order.user_chat_id || order.user_id

  if (clientChatId && clientChatId !== 'guest-user') {
    const clientMessage = `
✅ <b>Ваш заказ №${order.id} принят!</b>

💰 Сумма: ${totalText}

📦 <b>Товары:</b>
${itemsList}

🚚 ${order.delivery_method === 'pickup' ? 'Самовывоз' : 'Доставка'}
💳 ${paymentText === 'Переводом' ? 'Оплата переводом' : 'Оплата при получении'}

📍 Адрес магазина: ТЦ Mercato, 2 этаж, магазин 34
🕐 Режим работы: ежедневно 10:00 - 20:00

Спасибо за заказ! 🙏
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

export const sendClientNotification = async (
  clientChatId: string,
  message: string
): Promise<boolean> => {
  if (!clientChatId) return false
  return sendNotificationToClient(message, clientChatId)
}