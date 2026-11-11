type Line = { isSpecialOrder?: boolean; specialRequestId?: string | number; quantity: number }
export function cartAdditionError(cart: Line[], item: Line): string | null {
  if (item.quantity < 0) return null
  const special = cart.find(line => line.isSpecialOrder)
  if (special && !item.isSpecialOrder) return 'Спецзаказы оформляются отдельно. Чтобы добавить этот товар, сначала оформите спецзаказ или удалите его из корзины'
  if (item.isSpecialOrder && special) return 'Каждый спецзаказ оформляется отдельно. Сначала завершите оформление текущего спецзаказа'
  if (item.isSpecialOrder && cart.length) return 'Спецзаказы нельзя объединять с обычными товарами. Сначала оформите текущую корзину или очистите её'
  return null
}
export function specialCheckoutError(cart: Line[], payment?: string): string | null {
  if (!cart.some(line => line.isSpecialOrder)) return null
  if (cart.length !== 1 || !cart[0].isSpecialOrder || cart[0].quantity !== 1) return 'Спецзаказы оформляются отдельно, по одному. Удалите остальные позиции из корзины или оформите их отдельно.'
  if (payment && payment !== 'online_card') return 'Для спецзаказа необходима полная предоплата переводом.'
  return null
}
