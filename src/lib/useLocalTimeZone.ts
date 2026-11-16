import {useSyncExternalStore} from 'react'
import {getDeviceTimeZone} from './dateTime'
const listeners=new Set<()=>void>()
let stop:(()=>void)|undefined
function subscribe(listener:()=>void){
 listeners.add(listener)
 if(!stop&&typeof window!=='undefined'){
  const update=()=>{if(!document.hidden)for(const notify of listeners)notify()}
  const timer=setInterval(update,60000)
  window.addEventListener('focus',update);document.addEventListener('visibilitychange',update)
  stop=()=>{clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);stop=undefined}
 }
 return()=>{listeners.delete(listener);if(!listeners.size)stop?.()}
}
/** One shared listener/timer; no geolocation, network lookup, persisted timezone or permission. */
const snapshot=()=>{const now=new Date();return `${getDeviceTimeZone()}|${now.getFullYear()}-${now.getMonth()}-${now.getDate()}|${now.getTimezoneOffset()}`}
export const useLocalTimeZone=()=>useSyncExternalStore(subscribe,snapshot,()=> 'UTC|0').split('|')[0]
