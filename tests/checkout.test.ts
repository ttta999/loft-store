import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

test('reload applies the current rate despite a saved version; checkout refreshes persisted cart prices and delivery settings',async()=> {
  const root=await mkdtemp(join(tmpdir(),'loft-checkout-'))
  const repo=fileURLToPath(new URL('../',import.meta.url))
  const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage')
  const saved=new Map([['exchangeRateVersion','1793100684955']])
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:(key:string)=>saved.get(key)??null,
    setItem:(key:string,value:string)=>saved.set(key,value),
    removeItem:(key:string)=>saved.delete(key),
  }})
  try {
    await writeFile(join(root,'package.json'),'{"type":"module"}')
    await symlink(join(repo,'node_modules'),join(root,'node_modules'),'dir')
    await writeFile(join(root,'supabase.js'),`
      const settings={exchange_rate:{rate:11843.74,version:1793100684955},sale_mode_enabled:{enabled:false},delivery_price:{price:30000},free_delivery_threshold:{amount:2500000}};
      export const supabase={from(){return {key:null,select(){return this},eq(k,v){this.key=v;return this},in(){return this},single(){return Promise.resolve({data:{value:settings[this.key]},error:null})},then(ok,bad){return Promise.resolve({data:Object.entries(settings).map(([key,value])=>({key,value})),error:null}).then(ok,bad)}}}};
      export const getProducts=async()=>[{id:'product-210',price_usd:210,is_active:true}];
      export const fetchProductPopularity=async()=>({});
      export const getCategoriesTree=async()=>[];
    `)
    const source=(await readFile(join(repo,'src/store/useStore.ts'),'utf8')).replace("from '../lib/supabase'","from './supabase.js'")
    const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}})
    await writeFile(join(root,'store.js'),compiled.outputText)
    const {useStore}=await import(pathToFileURL(join(root,'store.js')).href)
    assert.equal(useStore.getState().exchangeRate,12100)
    await useStore.getState().updateExchangeRate()
    assert.equal(useStore.getState().exchangeRate,11843.74)
    // Repeat an actual app restart: the version survives, the state starts at 12100.
    useStore.setState({exchangeRate:12100,cart:[{productId:'product-210',name:'Product',priceUsd:200,size:'42',quantity:1,image:''}]})
    const delivery=await useStore.getState().refreshCheckout()
    assert.equal(useStore.getState().exchangeRate,11843.74)
    assert.equal(useStore.getState().cart[0].priceUsd,210)
    assert.deepEqual(delivery,{deliveryPriceUzs:30000,freeDeliveryThresholdUzs:2500000})
    assert.equal(Math.round(useStore.getState().getTotalPrice()*useStore.getState().exchangeRate),2487185)
    assert.ok(2487185<delivery.freeDeliveryThresholdUzs)
  } finally {
    if(originalStorage) Object.defineProperty(globalThis,'localStorage',originalStorage)
    else Reflect.deleteProperty(globalThis,'localStorage')
    await rm(root,{recursive:true,force:true})
  }
})
