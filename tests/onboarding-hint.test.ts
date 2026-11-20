import test from 'node:test'
import assert from 'node:assert/strict'
import {readOnboardingHint,writeOnboardingHint} from '../src/lib/onboardingHint.ts'
test('intro hints contain presentation state only and remain scoped to the account',()=>{
 const previous=globalThis.localStorage,values=new Map<string,string>()
 Object.assign(globalThis,{localStorage:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value)}})
 try{assert.equal(readOnboardingHint(11),null);writeOnboardingHint(11,{language:'uz',completed:true});assert.deepEqual(readOnboardingHint(11),{language:'uz',completed:true});assert.equal(readOnboardingHint(12),null);values.set('loft-intro-v1:11','{"language":"invalid","completed":true}');assert.equal(readOnboardingHint(11),null)}finally{Object.assign(globalThis,{localStorage:previous})}
})
