import test from 'node:test'
import assert from 'node:assert/strict'
import {recommendProducts} from '../src/lib/recommendations.ts'
import {matchesSize} from '../src/lib/sizeAvailability.ts'
import {chooseSizeChart} from '../src/lib/sizeCharts.ts'
import {decodeLaunch,productParameter} from '../src/lib/launchTarget.ts'
import {launchParameter} from '../server/links.ts'
import {restockNotification} from '../server/restockNotifications.ts'
const a={id:'a',category:'shoes',subcategory:'sneakers',size_type:'numeric',price_usd:100,is_active:true,brand:'Zegna'}
const products=[a,{...a,id:'b',price_usd:110},{...a,id:'c',is_active:false},{...a,id:'d',category:'clothes'},{...a,id:'e',price_usd:400}]
const variants=products.map((p,i)=>({id:'v'+i,product_id:p.id,size_value:'42',color_id:'blue',available:i!==0}))
const saved=[{category:'shoes',subcategory:'sneakers',system:'numeric',size:'42'}]
test('size filters match only available variants in the exact subcategory/system and selected color',()=>{
 assert.equal(matchesSize(a,variants,saved),false);assert.equal(matchesSize(products[1],variants,saved,'blue'),true);assert.equal(matchesSize(products[1],variants,saved,'red'),false);assert.equal(matchesSize({...products[1],size_type:'alphabetical'},variants,saved),false);assert.equal(matchesSize({...products[1],subcategory:'trousers'},variants,saved),false)
})
test('recommendations exclude current/hidden/unavailable items; hand-picked order wins and outfit has no random fallback',()=>{
 assert.deepEqual(recommendProducts(a,products,[],variants,[]).similar.map(p=>p.id),['b']);assert.deepEqual(recommendProducts(a,products,[],variants,[]).outfit,[])
 const result=recommendProducts(a,products,[{target_id:'e',kind:'similar',position:0},{target_id:'b',kind:'similar',position:1},{target_id:'d',kind:'outfit',position:0}],variants,[]);assert.deepEqual(result.similar.map(p=>p.id),['e','b']);assert.deepEqual(result.outfit.map(p=>p.id),['d'])
})
test('size chart priority is product, applicable brand, category; unrelated brand never matches',()=>{
 const base={category_id:'shoes',is_active:true},generic={...base,id:'category'},brand={...base,id:'brand',brand_id:'brand-id'},specific={...base,id:'product',product_id:'a'}
 assert.equal(chooseSizeChart([generic,brand,specific],a,[{id:'brand-id',name:'Zegna'}]).id,'product');assert.equal(chooseSizeChart([generic,brand],a,[{id:'brand-id',name:'Zegna'}]).id,'brand');assert.equal(chooseSizeChart([generic,brand],a,[{id:'brand-id',name:'Other'}]).id,'category')
})
test('browser and server launch parameters agree, reject unsafe destinations and retain variant IDs',()=>{
 const id='11111111-1111-4111-8111-111111111111',variant='cccccccc-cccc-4ccc-8ccc-cccccccccccc',param=productParameter(id,variant);assert.equal(param,launchParameter({type:'product',id,variant}));assert.deepEqual(decodeLaunch(param),{type:'product',id,variant});assert.equal(decodeLaunch(launchParameter({type:'javascript:' as any,id:'bad'})),null);assert.equal(decodeLaunch('https://evil.test'),null)
 const message=restockNotification({product_id:id,variant_id:variant,name:'<Zegna>',size:'42',color:null});assert.match(message.message,/&lt;Zegna&gt;/);assert.doesNotMatch(message.message,/Цвет:/);assert.ok(message.options.reply_markup?.inline_keyboard[0][0].web_app.url.includes('variant='+variant))
})
