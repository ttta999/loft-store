import { useEffect, useState, useRef } from 'react'
import { storeApi } from './api'
export type SavedAddress = {id:string;label:string;address:string;comment:string;is_default:boolean}
export type SavedSize = {category:string;subcategory:string;system:string;size:string}
export type Preferences = {name:string;phone:string;delivery_method:'pickup'|'delivery';addresses:SavedAddress[];sizes:SavedSize[];version:number}
export const emptyPreferences: Preferences = {name:'',phone:'',delivery_method:'pickup',addresses:[],sizes:[],version:0}
export function usePreferences(){
 const identity=useRef(window.Telegram?.WebApp.initData)
 const [data,setData]=useState<Preferences|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 useEffect(()=>{let active=true;void storeApi('preferences').then(r=>{if(active)setData(r.data)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
 const save=async(patch:Partial<Preferences>)=>{if(identity.current!==window.Telegram?.WebApp.initData)throw new Error('Сессия изменилась. Откройте профиль заново');if(!data)throw new Error('Откройте личные данные повторно');const r=await storeApi('savePreferences',{patch,version:data.version});setData(r.data);return r.data as Preferences}
 return {data,error,loading,save}
}
