import test from 'node:test'
import assert from 'node:assert/strict'
import {needsContactSave} from '../src/lib/contactPreferences.ts'
const p={name:'Иван Иванов',phone:'+998901234567',delivery_method:'pickup' as const,addresses:[{id:'a',label:'Дом',address:'Навои дом 15',comment:'',is_default:true},{id:'b',label:'Работа',address:'Бобура дом 25',comment:'',is_default:false}],sizes:[],version:1}
test('save-data opt-in compares normalized contact and address values, and ignores addresses for pickup',()=>{
 assert.equal(needsContactSave(p,' Иван   Иванов ','+998 90 123 45 67','',false),false);assert.equal(needsContactSave(p,p.name,p.phone,' БОБУРА  дом 25 ',true),false);assert.equal(needsContactSave(p,p.name,p.phone,'Новый адрес',true),true);assert.equal(needsContactSave(p,p.name,p.phone,'Новый адрес',false),false);assert.equal(needsContactSave(p,'Другое имя',p.phone,'',false),true);assert.equal(needsContactSave({...p,name:'',phone:''},p.name,p.phone,'',false),true)
})
