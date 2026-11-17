import {useEffect,useRef,useState} from 'react'
import {useStore} from '../store/useStore'
import {peekStoreResponse,storeApi,subscribePrivateResources} from '../lib/api'
import type {Preferences} from '../lib/preferences'
/** Hydration is not an explicit choice. Only a later user change is persisted. */
export default function LanguageSync(){
 const language=useStore(s=>s.language),[readyIdentity,setReadyIdentity]=useState<string|null>(null),last=useRef<string|null>(null),identity=window.Telegram?.WebApp.initData
 useEffect(()=>{if(!identity)return;let active=true,hydrated=false
  const initial=useStore.getState().language
  const hydrate=()=>{if(!active||hydrated)return;const saved=peekStoreResponse<Preferences>('preferences')?.data.language;if(saved!=='ru'&&saved!=='uz')return;hydrated=true;last.current=saved;if(useStore.getState().language===initial)useStore.getState().setLanguage(saved);setReadyIdentity(identity)}
  const unsubscribe=subscribePrivateResources(hydrate)
  void storeApi('preferences').then(hydrate).catch(()=>{})
  return()=>{active=false;unsubscribe()}
 },[identity])
 useEffect(()=>{if(!identity||readyIdentity!==identity)return;let active=true,running=false
  const sync=async()=>{
   const value=useStore.getState().language
   if(running||last.current===value||document.querySelector('[data-onboarding]'))return
   const cached=peekStoreResponse<Preferences>('preferences')?.data
   if(cached?.language===value&&cached?.language_source==='explicit'){last.current=value;return}
   running=true;try{await storeApi('language',{language:value});if(active)last.current=value}catch{/* Retry a deliberate change on reconnect. */}finally{running=false}
  }
  void sync();window.addEventListener('online',sync);window.addEventListener('focus',sync)
  return()=>{active=false;window.removeEventListener('online',sync);window.removeEventListener('focus',sync)}
 },[language,readyIdentity,identity])
 return null
}
