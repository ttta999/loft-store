/** Every special line retains its request ID; the legacy column remains readable. */
export function specialOrderIds(order: any): string[] {
  let items: any[] = []
  try { items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [] } catch { /* legacy malformed list */ }
  return [...new Set([order.special_order_id, ...(Array.isArray(items) ? items.filter(i => i.isSpecialOrder).map(i => i.specialRequestId) : [])].filter(id => id != null && id !== '').map(String))]
}
