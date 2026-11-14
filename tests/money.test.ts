import {test} from 'node:test'
import assert from 'node:assert/strict'
import {allocateUzs,catalogMoney,displayMoney} from '../src/lib/money.ts'
import {formatOrderMoney} from '../src/lib/orderState.ts'
test('all UZS displays round half up and use plain spaces independent of browser locale',()=>{
 for(const [amount,expected] of [[2512408.5,'2 512 409 сум'],[1555300.5,'1 555 301 сум'],[3230240,'3 230 240 сум']] as const)assert.equal(displayMoney(amount,'UZS'),expected)
 assert.equal(displayMoney(1234.567,'USD'),'$1,234.57');assert.equal(displayMoney(100,'USD'),'$100')
 assert.equal(catalogMoney(100,'UZS',0),'Сумма требует проверки')
 assert.equal(displayMoney(1555300.5,'UZS','uz'),'1 555 301 so‘m')
})
test('rounding allocation preserves the aggregate across quantities and delivery without changing historical amounts',()=>{
 for(const values of [[1.5,1.5,1.5],[210*3,100*2,2.52],[0.01,0.01,0.01]])for(const rate of [11910.62,12100,11843.74]){
 const lines=allocateUzs(values,rate);assert.equal(lines.reduce((a,b)=>a+b,0),Math.round(values.reduce((a,b)=>a+b,0)*rate));lines.forEach((v,i)=>assert.ok(Math.abs(v-values[i]*rate)<=1))
 }
 const order={order_currency:'UZS',total_price_uzs:2501230.5,total_price_usd:210,exchange_rate_at_order:11910.62}
 assert.equal(formatOrderMoney(order),'2 501 231 сум');assert.equal(order.total_price_uzs,2501230.5)
})
