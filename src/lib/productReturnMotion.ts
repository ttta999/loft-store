import {motionEaseCSS,motionTiming} from './motion'
/** Returning must survive viewport changes while a sheet releases its scroll lock.
 * Native View Transitions abort when their snapshot viewport changes. This single
 * fixed photo layer retains the same shared-element geometry without that snapshot. */
export function productReturnMotion(source:HTMLImageElement|null,restore:(valid:()=>boolean)=>Promise<HTMLImageElement|null>){
 const rect=source?.getBoundingClientRect(),paintable=!!source?.complete&&!!source.naturalWidth&&!!rect&&rect.bottom>0&&rect.top<innerHeight
 const layer=paintable?document.createElement('div'):null
 if(layer&&source&&rect){
  layer.dataset.productReturnOverlay='true';layer.setAttribute('aria-hidden','true');layer.inert=true
  Object.assign(layer.style,{position:'fixed',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,zIndex:'40',pointerEvents:'none',overflow:'hidden',transformOrigin:'0 0',willChange:'transform',transition:'none',contain:'layout paint style',borderRadius:'16px 16px 0 0'})
  const image=document.createElement('img');image.src=source.currentSrc||source.src;image.alt='';image.draggable=false
  Object.assign(image.style,{display:'block',width:'100%',height:'100%',objectFit:'cover',transition:'none'});layer.append(image)
 }
 let imageAnimation:Animation|undefined
 let cancelled=false,animation:Animation|undefined,target:HTMLImageElement|null=null,oldVisibility='',serial=0,started=0
 let resolveFinished:()=>void=()=>{}
 const finished=new Promise<void>(resolve=>{resolveFinished=resolve})
 const resize=()=>retarget()
 const cleanup=()=>{
  if(cancelled)return;cancelled=true;serial++;animation?.cancel();imageAnimation?.cancel();layer?.remove()
  if(target)target.style.visibility=oldVisibility
  window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('scroll',resize)
  resolveFinished()
 }
 const retarget=()=>{
  if(cancelled)return
  if(!layer||!target?.isConnected){cleanup();return}
  const current=layer.getBoundingClientRect(),destination=target.getBoundingClientRect(),remaining=Math.max(0,motionTiming.page*1000-(performance.now()-started))
  if(!destination.width||!current.width||!remaining){cleanup();return}
  const currentRadius=getComputedStyle(layer).borderRadius.replace(/[\d.]+px/g,value=>`${parseFloat(value)*(current.width/layer.offsetWidth)}px`)
  const turn=++serial;animation?.cancel()
  const ownRadius=getComputedStyle(target).borderRadius
  const radius=ownRadius==='0px'?'16px 16px 0px 0px':ownRadius
  const scale=destination.width/current.width
  const endRadius=radius.replace(/[\d.]+px/g,value=>`${parseFloat(value)/scale}px`)
  Object.assign(layer.style,{transform:'none',borderRadius:currentRadius,left:`${current.left}px`,top:`${current.top}px`,width:`${current.width}px`,height:`${current.height}px`})
  animation=layer.animate([{transform:'translate3d(0,0,0) scale(1,1)',borderRadius:currentRadius},{transform:`translate3d(${destination.left-current.left}px,${destination.top-current.top}px,0) scale(${scale},${destination.height/current.height})`,borderRadius:endRadius}],{duration:remaining,easing:motionEaseCSS,fill:'forwards'})
  void animation.finished.then(()=>{if(turn===serial)cleanup()}).catch(()=>{})
 }
 return {cancel:cleanup,async play(apply:()=>void,valid:()=>boolean){
  if(layer)document.body.append(layer)
  apply()
  if(!valid()||cancelled){cleanup();return}
  target=await restore(()=>valid()&&!cancelled)
  if(!valid()||cancelled){cleanup();return}
  if(!target||!layer){
   const content=document.querySelector<HTMLElement>('[data-loft-content]'),options={duration:motionTiming.feedback*1000,easing:motionEaseCSS}
   animation=content?.animate([{opacity:.9},{opacity:1}],options)
   imageAnimation=layer?.animate([{opacity:1},{opacity:0}],options)
   await Promise.all([animation?.finished.catch(()=>{}),imageAnimation?.finished.catch(()=>{})]);cleanup();return
  }
  target.style.removeProperty('view-transition-name');oldVisibility=target.style.visibility
  if((layer.firstElementChild as HTMLImageElement).src!==(target.currentSrc||target.src)&&target.complete&&target.naturalWidth){const image=document.createElement('img');image.src=target.currentSrc||target.src;image.alt='';Object.assign(image.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover'});layer.append(image);imageAnimation=image.animate([{opacity:0},{opacity:1}],{duration:motionTiming.page*1000,easing:motionEaseCSS,fill:'forwards'})}
  target.style.visibility='hidden';started=performance.now()
  window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize)
  retarget()
  window.dispatchEvent(new CustomEvent('loft:product-return-start',{detail:{finished,duration:motionTiming.page*1000}}))
  await finished
 }}
}
