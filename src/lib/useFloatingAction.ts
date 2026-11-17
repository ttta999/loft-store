import {useLayoutEffect,useState} from 'react'
/** A floating action follows the existing navigation, not the keyboard. No location access. */
export function useFloatingAction(){
 const [layout,setLayout]=useState({bottom:112,keyboard:false})
 useLayoutEffect(()=>{
  const nav=document.querySelector<HTMLElement>('.loft-navigation'),viewport=window.visualViewport
  let frame=0
  const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const focused=document.activeElement?.matches('input:not([type=file]),textarea,[contenteditable=true]')===true
   const keyboard=focused&&(matchMedia('(pointer:coarse)').matches||(viewport?window.innerHeight-viewport.height>120:false))
   setLayout(old=>{const next={bottom:Math.ceil(nav?.getBoundingClientRect().height||104)+8,keyboard};return old.bottom===next.bottom&&old.keyboard===next.keyboard?old:next})
  })}
  const observer=new ResizeObserver(measure);if(nav)observer.observe(nav)
  measure();window.addEventListener('resize',measure);viewport?.addEventListener('resize',measure);document.addEventListener('focusin',measure);document.addEventListener('focusout',measure)
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',measure);viewport?.removeEventListener('resize',measure);document.removeEventListener('focusin',measure);document.removeEventListener('focusout',measure)}
 },[])
 return layout
}
