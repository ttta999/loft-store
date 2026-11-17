import test from 'node:test'
import assert from 'node:assert/strict'
import {chooseSizeChart,validSizeChart,personalSizeHint} from '../src/lib/sizeCharts.ts'
const product={id:'product',category:'clothes',subcategory:'trousers',brand_id:'brand-a',size_type:'numeric'}
const chart={id:'category',is_active:true,category_id:'clothes',columns_ru:['Буква','Число'],columns_uz:['Harf','Raqam'],rows:[['M','42']],size_mapping:{source_system:'alphabetical',target_system:'numeric',source_column:0,target_column:1}}
const saved=(system='alphabetical',size='M')=>[{category:'clothes',subcategory:'trousers',system,size}]
test('real active rectangular charts only; preserve product, brand, subcategory priority',()=>{
 assert.equal(validSizeChart({...chart,rows:[]}),false);assert.equal(validSizeChart({...chart,rows:[['','']]}),false);assert.equal(validSizeChart({...chart,columns_uz:[]}),false)
 const brand={...chart,id:'brand',brand_id:'brand-a'},sub={...chart,id:'sub',subcategory_id:'trousers'},specific={...chart,id:'product',product_id:'product'}
 assert.equal(chooseSizeChart([chart,sub,brand,specific],product,[]).id,'product')
 assert.equal(chooseSizeChart([chart,sub,brand],product,[]).id,'brand')
 assert.equal(chooseSizeChart([chart,sub,{...brand,brand_id:'brand-b'}],product,[]).id,'sub')
 assert.equal(chooseSizeChart([{...specific,is_active:false},{...chart,rows:[]}],product,[]),null)
})
test('M converts only through explicit unique mapping; no inferred columns/ranges/conflicts',()=>{
 assert.equal(personalSizeHint(chart,product,saved(),['42','44']),'42')
 for(const candidate of [{...chart,size_mapping:null},{...chart,rows:[['M','42–44']]},{...chart,rows:[['M','42'],['M','44']]},{...chart,size_mapping:{...chart.size_mapping,source_column:8}}])assert.equal(personalSizeHint(candidate,product,saved(),['42','44']),undefined)
 assert.equal(personalSizeHint(chart,product,saved('alphabetical','L'),['42']),undefined)
 assert.equal(personalSizeHint({...chart,rows:[['M–L','42']]},product,saved('alphabetical','M–L'),['42']),undefined)
 assert.equal(personalSizeHint(chart,product,[...saved(),...saved('numeric','44')],['42','44']),undefined)
 assert.equal(personalSizeHint(null,product,saved(),['42']),undefined)
 assert.equal(personalSizeHint(null,product,saved('numeric','42'),['42']),'42')
})
test('EU to UK requires declared columns; scope never leaks between category or brand',()=>{
 const footwear={...product,category:'shoes',subcategory:'sneakers'}
 const eu={...chart,category_id:'shoes',brand_id:'brand-a',rows:[['42','8']],size_mapping:{source_system:'EU',target_system:'UK',source_column:0,target_column:1}}
 const prefs=[{category:'shoes',subcategory:'sneakers',system:'EU',size:'42'}]
 assert.equal(personalSizeHint(chooseSizeChart([eu],footwear,[]),footwear,prefs,['8']),'8')
 assert.equal(personalSizeHint(chooseSizeChart([eu],{...footwear,brand_id:'brand-b'},[]),footwear,prefs,['8']),undefined)
 assert.equal(personalSizeHint(eu,footwear,saved('EU','42'),['8']),undefined)
 const override={...eu,product_id:'product',rows:[['42','9']]}
 assert.equal(personalSizeHint(chooseSizeChart([eu,override],footwear,[]),footwear,prefs,['8','9']),'9')
})
test('same saved M has distinct confirmed results for distinct brands; no global conversion',()=>{
 const a={...chart,brand_id:'brand-a'},b={...chart,brand_id:'brand-b',rows:[['M','44']]}
 assert.equal(personalSizeHint(chooseSizeChart([a,b],product,[]),product,saved(),['42','44']),'42')
 const second={...product,brand_id:'brand-b'}
 assert.equal(personalSizeHint(chooseSizeChart([a,b],second,[]),second,saved(),['42','44']),'44')
})
