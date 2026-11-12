import test from 'node:test'
import assert from 'node:assert/strict'
import {ordinaryOrderNotification,cancellationNotification,refundNotification,managerOrderNotification} from '../server/orderNotifications.ts'
import {canClientCancel,nextOrdinaryStatuses,orderStatus,formatOrderMoney} from '../src/lib/orderState.ts'
const base={id:42,delivery_method:'pickup',payment_method:'online_card',order_currency:'USD',total_price_usd:100,total_price_uzs:1200000,exchange_rate_at_order:12000}
test('ordinary payment review is distinct from assembly and histories use saved currency',()=>{
 assert.equal(orderStatus({...base,status:'Ожидает оплаты',payment_status:'pending',receipt_submitted_at:'now'}),'На обработке')
 assert.equal(orderStatus({...base,status:'В обработке'}),'Собирается')
 assert.equal(formatOrderMoney(base),'100 $')
 assert.equal(formatOrderMoney({...base,order_currency:'UZS'}).replaceAll('\u00a0',' '),'1 200 000 сум')
 assert.equal(formatOrderMoney({...base,order_currency:null}),'Сумма требует проверки')
 assert.equal(formatOrderMoney({...base,total_price_uzs:null,order_currency:'UZS',exchange_rate_at_order:null}),'Сумма требует проверки')
 assert.equal(orderStatus({...base,status:'Отменён',cancelled_by:'client'},'uz'),'Mijoz bekor qildi')
})
test('normal UI follows server sequencing and paid ordinary cancellation boundary',()=>{
 const paid={...base,status:'Активный',payment_status:'paid',paid_at:'now'}
 assert.deepEqual(nextOrdinaryStatuses(paid),['В обработке'])
 assert.deepEqual(nextOrdinaryStatuses({...paid,paid_at:null}),[])
 assert.equal(canClientCancel(paid),true)
 assert.equal(canClientCancel({...paid,status:'В обработке'}),false)
 assert.equal(canClientCancel({...paid,items:[{isSpecialOrder:true}]}),false)
})
test('all ordinary stages produce HTML linked notices without repayment after receipt',()=>{
 for(const stage of ['На обработке','Принят','Собирается','Готов к выдаче','Получен','Упакован','Передан курьеру','Доставлен']){
  const n=ordinaryOrderNotification({...base,stage});assert.equal(n.options.parse_mode,'HTML');assert.match(n.options.reply_markup!.inline_keyboard[0][0].web_app!.url,/order=42/);assert.ok(n.message.includes('№42'));assert.doesNotMatch(n.message,/Ожидаем оплату/)
 }
 assert.match(ordinaryOrderNotification({...base,stage:'На обработке'}).message,/Менеджер проверит/)
 assert.doesNotMatch(ordinaryOrderNotification({...base,stage:'Принят'}).message,/Собираем/)
 assert.match(ordinaryOrderNotification({...base,stage:'Готов к выдаче',payment_method:'upon_receipt'}).message,/К оплате при получении: <b>100 \$<\/b>/)
 assert.doesNotMatch(ordinaryOrderNotification({...base,stage:'Передан курьеру',courier_link:'javascript:alert(1)'}).message,/Отследить/)
 assert.match(ordinaryOrderNotification({...base,stage:'Передан курьеру',courier_link:'https://track.test/?a=1&b=2'}).message,/&amp;b=2/)
})
test('cancellation and refund templates never disclose internal manager data',()=>{
 const n=cancellationNotification({id:42,source:'store',reason:'<b>unsafe & reason</b>',refund_status:'Проверка платежа',manager_comment:'secret'})
 assert.match(n.message,/&lt;b&gt;unsafe &amp; reason/);assert.doesNotMatch(n.message,/secret|Сумма к возврату/)
 assert.match(cancellationNotification({id:42,source:'client',refund_status:'Ожидает возврата',amount:100,currency:'USD'}).message,/100 \$/)
 for(const status of ['Ожидает возврата','Возврат выполнен','Возврат не требуется']) assert.match(refundNotification({order_id:42,status,amount:100,currency:'USD'}).message,/№42/)
 assert.match(managerOrderNotification({...base,items:[{name:'<i>x</i>',size:'42',quantity:1}],client_name:'<script>'}).message,/&lt;script&gt;/)
 assert.match(managerOrderNotification({...base,items:[]}).message,/100 \$/)
})
