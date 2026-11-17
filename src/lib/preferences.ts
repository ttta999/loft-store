import { useEffect, useRef } from 'react'
import {usePrivateResource} from './privateResource'
import { storeApi } from './api'
export type SavedAddress = {id:string;label:string;address:string;comment:string;is_default:boolean}
export type SavedSize = {category:string;subcategory:string;system:string;size:string}
export type Preferences = {name:string;phone:string;delivery_method:'pickup'|'delivery';addresses:SavedAddress[];sizes:SavedSize[];version:number;marketing_enabled?:boolean;language?:'ru'|'uz';language_source?:'explicit'|'telegram'|null;onboarding_completed_at?:string|null}
export const emptyPreferences: Preferences = {name:'',phone:'',delivery_method:'pickup',addresses:[],sizes:[],version:0}
export function usePreferences(){
 const currentIdentity=window.Telegram?.WebApp.initData,identity=useRef(currentIdentity)
 useEffect(()=>{identity.current=currentIdentity},[currentIdentity])
 const {data,error,loading,retry}=usePrivateResource<Preferences>('preferences')
 const save=async(patch:Partial<Preferences>)=>{if(identity.current!==window.Telegram?.WebApp.initData)throw new Error('Сессия изменилась. Откройте профиль заново');if(!data)throw new Error('Откройте личные данные повторно');const r=await storeApi('savePreferences',{patch,version:data.version});return r.data as Preferences}
 return {data,error,loading,retry,save}
}
