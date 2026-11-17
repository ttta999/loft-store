import test from 'node:test'
import assert from 'node:assert/strict'
import {convertSize,productSizeSuggestion,universalOptions} from '../src/lib/sizeConversion.ts'
const base={category:'clothes',subcategory:'trousers',sourceSize:'M',sourceSystem:'alphabetical',targetSystem:'EU',actual:['46','48','50']}
test('generic menswear mappings distinguish scope, regular fit and confidence',()=>{
 assert.deepEqual(convertSize(base).candidates,['48']);assert.equal(convertSize(base).confidence,'approximate')
 assert.equal(convertSize({...base,targetSystem:'numeric'}).confidence,'ambiguous')
 assert.deepEqual(convertSize({...base,sourceSize:'XXXL',actual:['56','58']}).candidates,['56','58'])
 assert.equal(convertSize({...base,subcategory:'jeans'}).confidence,'unknown')
 assert.equal(convertSize({...base,sourceSize:'48-50'}).confidence,'unknown')
 assert.equal(convertSize({...base,sourceSystem:'numeric',sourceSize:'48'}).confidence,'unknown')
 assert.deepEqual(convertSize({...base,category:'shoes',subcategory:'sneakers',sourceSystem:'UK',sourceSize:'8',actual:['41','42','43']}).candidates,['42'])
 assert.equal(convertSize({...base,category:'shoes',subcategory:'sneakers'}).confidence,'unknown')
 assert.equal(universalOptions('clothes','outerwear').UK.includes('38R'),true)
 assert.equal(universalOptions('clothes','trousers').UK.includes('32R'),true)
})
test('confirmed correspondence wins, conflicts never fall through to approximate sizing',()=>{
 const product={id:'p',category:'clothes',subcategory:'trousers',size_type:'numeric'},saved=[{category:'clothes',subcategory:'trousers',system:'alphabetical',size:'M'}]
 const chart={is_active:true,category_id:'clothes',columns_ru:['Alpha','EU'],columns_uz:['Alpha','EU'],rows:[['M','50']],size_mapping:{source_system:'alphabetical',target_system:'EU',source_column:0,target_column:1}}
 assert.equal(productSizeSuggestion(chart,product,saved,['48','50']).confidence,'exact')
 assert.deepEqual(productSizeSuggestion(chart,product,saved,['48','50']).candidates,['50'])
 assert.deepEqual(productSizeSuggestion({...chart,rows:[['M','50'],['M','48']]},product,saved,['48','50']).candidates,[])
 assert.equal(productSizeSuggestion(null,product,saved,['48','50']).confidence,'ambiguous')
 assert.deepEqual(productSizeSuggestion(null,product,[{...saved[0],subcategory:'jeans'}],['48']).candidates,[])
})
