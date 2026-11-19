import test from 'node:test'
import assert from 'node:assert/strict'
import {readOnboardingHint,writeOnboardingHint} from '../src/lib/onboardingHint.ts'
import {PANTS_SIZE_GRID,shopSizeOptions} from '../src/lib/shopSizeGrid.ts'
test('intro hints contain presentation state only and remain scoped to the account',()=>{
 const previous=globalThis.localStorage,values=new Map<string,string>()
 Object.assign(globalThis,{localStorage:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value)}})
 try{assert.equal(readOnboardingHint(11),null);writeOnboardingHint(11,{language:'uz',completed:true});assert.deepEqual(readOnboardingHint(11),{language:'uz',completed:true});assert.equal(readOnboardingHint(12),null);values.set('loft-intro-v1:11','{"language":"invalid","completed":true}');assert.equal(readOnboardingHint(11),null)}finally{Object.assign(globalThis,{localStorage:previous})}
})
test('shop pants grid has eleven numeric sizes while legacy variant labels remain untouched',()=>{
 assert.equal(PANTS_SIZE_GRID.length,11);assert.deepEqual(PANTS_SIZE_GRID,['36','38','40','42','44','46','48','50','52','54','56'])
 const actual=['M','48'],before=[...actual];assert.deepEqual(shopSizeOptions('clothes','pants',actual),[...PANTS_SIZE_GRID,'M']);assert.deepEqual(actual,before)
 assert.deepEqual(shopSizeOptions('shoes','sneakers',['42']),['42'])
})
