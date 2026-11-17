import {useEffect,useState} from 'react'
import {peekStoreResponse,storeApi,subscribePrivateResources} from './api'
export function usePrivateResource<T>(action:'preferences'|'restocks'){
 const identity=window.Telegram?.WebApp.initData||''
 const [resource,setResource]=useState<{identity:string;data:T|null}>(()=>({identity,data:peekStoreResponse<T>(action)?.data??null}))
 const [loading,setLoading]=useState(!peekStoreResponse(action)),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 useEffect(()=>{
  let active=true,running=false
  const setData=(data:T|null)=>setResource({identity,data})
  const sync=()=>{if(active)setData(peekStoreResponse<T>(action)?.data??null)}
  const load=async(force=false)=>{if(running||document.hidden)return;running=true
   const cached=peekStoreResponse<T>(action)?.data??null
   if(active){setData(cached);setLoading(cached===null);setError('')}
   try{const result=await storeApi(action,{}, {force});if(active&&identity===window.Telegram?.WebApp.initData)setData(peekStoreResponse<T>(action)?.data??result.data)}
   catch(e){if(active){setData(peekStoreResponse<T>(action)?.data??null);setError(e instanceof Error?e.message:'Не удалось загрузить данные')}}finally{running=false;if(active)setLoading(false)}
  }
  const unsubscribe=subscribePrivateResources(sync)
  void load(attempt>0)
  const refresh=()=>void load(true),timer=setInterval(refresh,30_000)
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh)
  return()=>{active=false;unsubscribe();clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh)}
 },[action,identity,attempt])
 return {data:resource.identity===identity?resource.data:null,error:resource.identity===identity?error:'',loading:resource.identity!==identity||loading,retry:()=>setAttempt(v=>v+1)}
}
