import test from 'node:test'
import assert from 'node:assert/strict'
import { specialNotification } from '../server/specialNotifications.ts'

test('special notifications cover all five states, preserve links and escape manager text', () => {
  for (const status of ['На оценке','Оценён','Оформлен','Отменён','Отклонён']) {
    const result = specialNotification({ id: 17, status, manager_price: 100, exchange_rate: 12000, manager_comment: '<b>Текст & детали</b>', rejection_reason: '<img> Нет размера', order_id: 145 })
    assert.ok(result.message.includes('№17'))
    assert.equal(result.options.parse_mode,'HTML')
    const link=result.options.reply_markup!.inline_keyboard[0][0].web_app.url
    assert.ok(link.endsWith(status==='Оформлен'?'section=orders&order=145':'section=china&request=17'))
    if(status==='Оценён'){assert.ok(result.message.includes('1 200 000 сум'));assert.ok(result.message.includes('&lt;b&gt;Текст &amp; детали&lt;/b&gt;'))}
    if(status==='Оформлен')assert.ok(result.message.includes('<b>№145</b>'))
    if(status==='Отклонён')assert.ok(result.message.includes('&lt;img&gt;'))
  }
  const empty=specialNotification({id:17,status:'Оценён',manager_price:100,amount_uzs:1200000}).message
  assert.ok(!empty.includes('Без комментария'));assert.ok(!empty.includes('\n\n\n'))
  assert.throws(()=>specialNotification({id:17,status:'Оформлен'}))
})
test('quote is always integer UZS and never uses an invented exchange rate',()=>{
 const notice=specialNotification({id:17,status:'Оценён',manager_price:270,exchange_rate:11963.85,currency:'USD'})
 assert.match(notice.message,/3 230 240 сум/);assert.doesNotMatch(notice.message,/USD/)
 assert.match(specialNotification({id:17,status:'Оценён',manager_price:270,exchange_rate:999,amount_uzs:3230240}).message,/3 230 240 сум/)
 assert.throws(()=>specialNotification({id:17,status:'Оценён',manager_price:270}))
})
