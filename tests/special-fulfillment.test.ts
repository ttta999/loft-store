import test from 'node:test'
import assert from 'node:assert/strict'
import { specialOrderNotification } from '../server/specialOrderNotifications.ts'
import { SPECIAL_PICKUP, SPECIAL_DELIVERY, nextSpecialStatuses, specialOrderIds } from '../src/lib/specialOrders.ts'
import { cartAdditionError, specialCheckoutError } from '../src/lib/specialCheckout.ts'

test('all fulfillment messages use the real order, HTML, amount and deep link; tracking is escaped', () => {
 for (const status of new Set([...SPECIAL_PICKUP,...SPECIAL_DELIVERY,'Отменён'])) {
  const message=specialOrderNotification({id:147,status,amount:100.25,currency:'USD',delivery_method:'pickup',courier_link:'https://example.com/?a=1&b="test"'})
  assert.ok(message.message.includes('№147')); assert.equal(message.options.parse_mode,'HTML')
  assert.ok(message.options.reply_markup!.inline_keyboard[0][0].web_app.url.endsWith('section=orders&order=147'))
  if(status==='Ожидает оплаты')assert.ok(message.message.includes('100,25 USD'))
  if(status==='Передан курьеру')assert.ok(message.message.includes('&amp;b=&quot;test&quot;'))
 }
 const bad=specialOrderNotification({id:147,status:'Передан курьеру',delivery_method:'delivery',courier_link:'javascript:alert(1)'})
 assert.ok(!bad.message.includes('javascript:'))
 assert.throws(()=>specialOrderNotification({id:147,status:'fake',delivery_method:'pickup'}))
 assert.throws(()=>specialOrderNotification({id:'<b>',status:'Принят',delivery_method:'pickup'}))
})
test('isolated cart messages and checkout constraints preserve normal grouping and reject mixed and cash',()=>{
 const regular={quantity:1}, special={quantity:1,isSpecialOrder:true,specialRequestId:17}
 assert.equal(cartAdditionError([regular],regular),null)
 assert.equal(cartAdditionError([],special),null)
 assert.match(cartAdditionError([special],regular)!,/оформляются отдельно/)
 assert.match(cartAdditionError([regular],special)!,/нельзя объединять/)
 assert.match(cartAdditionError([special],special)!,/Каждый спецзаказ/)
 assert.ok(specialCheckoutError([regular,special]))
 assert.ok(specialCheckoutError([special],'upon_receipt'))
 assert.equal(specialCheckoutError([special],'online_card'),null)
})
test('paid sequential fulfillment actions differ by delivery; historical orders retain their flow',()=>{
 const order={special_fulfillment:true,status:'Принят',payment_status:'paid',paid_at:'2026-11-11T10:00:00Z',delivery_method:'pickup'}
 assert.deepEqual(nextSpecialStatuses(order),['Заказан у поставщика','Отменён'])
 assert.deepEqual(nextSpecialStatuses({...order,payment_status:'pending'}),['Отменён'])
 assert.deepEqual(nextSpecialStatuses({...order,status:'Собирается'}),['Готов к выдаче','Отменён'])
 assert.deepEqual(nextSpecialStatuses({...order,status:'Собирается',delivery_method:'delivery'}),['Передан курьеру','Отменён'])
 assert.deepEqual(nextSpecialStatuses({...order,status:'Упакован',delivery_method:'delivery'}),['Передан курьеру','Отменён'])
 assert.deepEqual(nextSpecialStatuses({...order,status:'Получен'}),[])
 assert.deepEqual(nextSpecialStatuses({...order,special_fulfillment:false}),[])
 assert.deepEqual(specialOrderIds({special_order_id:'17',items:[{specialRequestId:17},{isSpecialOrder:true,specialRequestId:18}]}),['17','18'])
})
test('special assembly text follows the saved delivery method',()=>{
 const pickup=specialOrderNotification({id:147,status:'Собирается',delivery_method:'pickup'}).message
 const delivery=specialOrderNotification({id:147,status:'Собирается',delivery_method:'delivery'}).message
 assert.match(pickup,/к выдаче\./);assert.match(pickup,/готов к получению/)
 assert.match(delivery,/к доставке\./);assert.match(delivery,/передан курьеру/)
 assert.doesNotMatch(pickup+delivery,/выдаче или доставке/)
})
