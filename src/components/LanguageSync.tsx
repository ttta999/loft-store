import {useEffect,useRef,useState} from 'react'
import {useStore} from '../store/useStore'
import {storeApi} from '../lib/api'
/** Hydrate from the verified account first; never overwrite its language with a fresh device default. */
export default function LanguageSync(){
 const language=useStore(s=>s.language),[ready,setReady]=useState(false),last=useRef<string|null>(null),identity=window.Telegram?.WebApp.initData
 useEffect(()=>{if(!identity)return;let active=true;const initial=useStore.getState().language;setReady(false)
  void storeApi('preferences').then(async r=>{if(!active)return;const saved=r.data?.language;if((saved==='ru'||saved==='uz')&&useStore.getState().language===initial){last.current=saved;useStore.getState().setLanguage(saved)}else{last.current=saved||null;const current=useStore.getState().language;await storeApi('language',{language:current});if(active)last.current=current}}).catch(()=>{}).finally(()=>{if(active)setReady(true)});return()=>{active=false}
 },[identity])
 useEffect(()=>{if(!ready||!identity)return;let active=true,running=false;const sync=async()=>{const value=useStore.getState().language;if(running||last.current===value)return;running=true;try{await storeApi('language',{language:value});if(active)last.current=value}catch{/* The device preference still works; retry when connectivity returns. */}finally{running=false}}
  void sync();window.addEventListener('online',sync);window.addEventListener('focus',sync);return()=>{active=false;window.removeEventListener('online',sync);window.removeEventListener('focus',sync)}
 },[language,ready,identity])
 return null
}
