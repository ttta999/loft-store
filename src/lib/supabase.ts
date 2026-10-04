import { createClient } from '@supabase/supabase-js'
import { sendNotificationToManager, sendNotificationToClient } from './telegram'
import { cacheProducts, cacheSizes } from './productCache'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ========== ПОПУЛЯРНОСТЬ ==========
const popularityCache = {
  data: null as Record<string, number> | null,
  updatedAt: 0,
}
const POPULARITY_CACHE_TTL = 10 * 60 * 1000

export const fetchProductPopularity = async (force = false): Promise<Record<string, number>> => {
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
    return map
  } catch (error) {
    console.error('❌ Ошибка запроса популярности:', error)
    return popularityCache.data || {}
  }
}

export const getProductSoldCount = async (productId: string): Promise<number> => {
  const map = await fetchProductPopularity()
  return map[productId] || 0
}

// ========== ТОВАРЫ ==========
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

  cacheProducts(data)
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

  const rows = data || []
  cacheSizes(productId, rows.map((v: any) => v.size_value))
  return rows
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
    return { available: false, error: `К сожалению, размер "${size}" временно отсутствует` }
  }

  if ((variant.stock || 0) < quantity) {
    if (variant.stock === 0) {
      return { available: false, error: `Размер "${size}" закончился. Мы уже работаем над пополнением! 🙏` }
    } else {
      return { available: false, error: `Осталось только ${variant.stock} шт.` }
    }
  }

  return { available: true }
}

// ========== КАТЕГОРИИ (из БД, с учётом is_active) ==========
export interface CategoryTree {
  id: string
  name_ru: string
  name_uz: string
  icon: string
  sort_order: number
  is_active: boolean
  subcategories: SubcategoryRow[]
}

export interface SubcategoryRow {
  id: string
  category_id: string
  name_ru: string
  name_uz: string
  size_type: string
  sizes: string[]
  sort_order: number
  is_active: boolean
}

/**
 * Загружает дерево активных категорий с активными подкатегориями.
 * В каждую категорию в начало подкатегорий добавляется виртуальная «Все товары».
 * Отключённые категории и подкатегории НЕ возвращаются — приложение их не видит.
 * ✅ Возвращает null при ошибке (сеть/RLS), чтобы НЕ затирать кеш мусором.
 */
export const getCategoriesTree = async (): Promise<CategoryTree[] | null> => {
  try {
    const [{ data: cats, error: catsErr }, { data: subs, error: subsErr }] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('subcategories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ])

    if (catsErr || subsErr) {
      console.error('❌ Ошибка загрузки категорий:', catsErr || subsErr)
      return null // ✅ null = ошибка → кеш не трогаем
    }

    const subsByCategory = new Map<string, SubcategoryRow[]>()
    for (const s of (subs || []) as any[]) {
      const row: SubcategoryRow = {
        ...s,
        sizes: Array.isArray(s.sizes) ? s.sizes : [],
      }
      const list = subsByCategory.get(s.category_id) || []
      list.push(row)
      subsByCategory.set(s.category_id, list)
    }

    const allSub: SubcategoryRow = {
      id: 'all',
      category_id: '',
      name_ru: 'Все товары',
      name_uz: 'Barcha mahsulotlar',
      size_type: 'all',
      sizes: [],
      sort_order: -1,
      is_active: true,
    }

    return ((cats || []) as any[]).map((c) => ({
      ...c,
      subcategories: [allSub, ...(subsByCategory.get(c.id) || [])],
    }))
  } catch (error) {
    console.error('❌ Ошибка getCategoriesTree:', error)
    return null // ✅ null = ошибка → кеш не трогаем
  }
}

// ========== ЗАКАЗЫ ==========
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
      return { data: null, error: { message: stockCheck.error }, stockError: true }
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
    popularityCache.updatedAt = 0
  }

  return { data, error: null }
}

export const createOrderFromSpecial = async (specialRequestId: string, orderData: any) => {
  const specialOrderIdStr = specialRequestId.toString()

  const { data, error } = await supabase
    .from('orders')
    .insert({ ...orderData, special_order_id: specialOrderIdStr })
    .select()

  if (error) {
    console.error('❌ Ошибка создания заказа из спецзаказа:', error)
    return { data: null, error }
  }

  const createdOrder = Array.isArray(data) ? data[0] : data

  const { error: updateError } = await supabase
    .from('china_requests')
    .update({ status: 'Оплачен', converted_to_order_id: createdOrder.id.toString() })
    .eq('id', specialRequestId)

  if (updateError) {
    console.error('❌ Ошибка обновления спецзаказа:', updateError)
  }

  return { data, error: null }
}

export const restoreStockAfterCancel = async (items: any[]) => {
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

    await supabase
      .from('product_variants')
      .update({ stock: newStock })
      .eq('id', variant.id)
  }
}

export const deleteUnpaidOrder = async (orderId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('delete_unpaid_order', {
      p_order_id: Number(orderId),
    })
    if (!error) {
      return Boolean(data)
    }
    console.warn('⚠️ RPC delete_unpaid_order недоступна, пробуем клиентское удаление:', error.message)
  } catch (err) {
    console.warn('⚠️ Ошибка RPC delete_unpaid_order:', err)
  }

  try {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) return false

    if (order.payment_status && order.payment_status !== 'pending') return false

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    if (Array.isArray(items)) {
      await restoreStockAfterCancel(items)
    }

    if (order.special_order_id) {
      await supabase
        .from('china_requests')
        .update({ status: 'Оценён', converted_to_order_id: null })
        .eq('id', order.special_order_id)
    }

    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)

    if (deleteError) return false
    return true
  } catch (error) {
    console.error('❌ Ошибка клиентского удаления заказа:', error)
    return false
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

      return `${index + 1}. ${item.name}\nРазмер: ${item.size}\nКоличество: ${item.quantity} шт.\nЦена: ${priceText}`
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
  const nameLine = request.product_name ? `\n📦 Название: ${request.product_name}` : ''
  const linkLine = request.link ? `\n🔗 Ссылка: ${request.link}` : ''
  const message = `
🌍 <b>Новый спецзаказ №${request.id}</b>${nameLine}${linkLine}

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