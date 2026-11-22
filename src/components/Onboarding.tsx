import {useEffect,useRef,useState} from 'react'
import {AnimatePresence,motion,useReducedMotion} from 'framer-motion'
import {ArrowRight,Check,Globe,ShoppingBag,Store} from 'lucide-react'
import {usePreferences,type Preferences} from '../lib/preferences'
import {peekStoreResponse,subscribePrivateResources,storeApi,verifiedCustomerId} from '../lib/api'
import {useStore} from '../store/useStore'
import {useScrollLock} from '../lib/useScrollLock'
import {motionEase,motionTiming} from '../lib/motion'
import {readOnboardingHint,writeOnboardingHint} from '../lib/onboardingHint'
const primary='w-full min-h-12 px-5 py-3 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] font-bold flex items-center justify-center gap-2 disabled:opacity-50'
export default function Onboarding(){
 const identity=window.Telegram?.WebApp.initData||''
 return identity?<AccountIntro key={identity}/>:null
}
function AccountIntro(){
 const {data,error,retry}=usePreferences(),language=useStore(s=>s.language),setLanguage=useStore(s=>s.setLanguage),reduced=useReducedMotion()
 // An unsafe ID may select a display hint; only the verified account may write one or access data.
 const [hint]=useState(()=>readOnboardingHint(window.Telegram?.WebApp.initDataUnsafe.user?.id))
 const [confirmed,setConfirmed]=useState<Preferences|null>(data),[step,setStep]=useState(0),[direction,setDirection]=useState(1),[moving,setMoving]=useState(false)
 const [choice,setChoice]=useState<'ru'|'uz'|null>(null),[busy,setBusy]=useState(false),[failure,setFailure]=useState('')
 const root=useRef<HTMLDivElement>(null),pending=useRef(false),movingRef=useRef(false),activeStep=useRef(0)
 const state=data||confirmed,open=state?!state.onboarding_completed_at:!hint?.completed,needsLanguage=state?state.language_source!=='explicit':!hint
 const ru=(choice||(state?.language_source==='explicit'?state.language:hint?.language)||language)==='ru'
 useScrollLock(open)
 useEffect(()=>{
  const sync=()=>{const current=peekStoreResponse<Preferences>('preferences')?.data,id=verifiedCustomerId();if(!current||!id)return;setConfirmed(current)
   if(current.language_source==='explicit'&&(current.language==='ru'||current.language==='uz'))writeOnboardingHint(id,{language:current.language,completed:!!current.onboarding_completed_at})
  }
  const unsubscribe=subscribePrivateResources(sync);void Promise.resolve().then(sync);return unsubscribe
 },[])
 useEffect(()=>{if(open)root.current?.focus()},[open,needsLanguage])
 const changeStep=(next:number)=>{if(pending.current||movingRef.current||next<0||next>2||next===step)return;movingRef.current=!reduced;setMoving(!reduced);setDirection(next>step?1:-1);activeStep.current=next;setStep(next)}
 const finish=async()=>{if(pending.current||movingRef.current)return;pending.current=true;setBusy(true);setFailure('');try{await storeApi('completeOnboarding')}catch{setFailure(ru?'Не удалось сохранить. Повторите попытку.':'Saqlanmadi. Qayta urinib ko‘ring.');retry()}finally{pending.current=false;setBusy(false)}}
 const choose=async(value:'ru'|'uz')=>{if(pending.current)return;setChoice(value);setLanguage(value);pending.current=true;setBusy(true);setFailure('');try{await storeApi('language',{language:value});await storeApi('preferences',{}, {force:true})}catch{setFailure(value==='ru'?'Не удалось сохранить язык. Повторите выбор.':'Til saqlanmadi. Qayta tanlang.');retry()}finally{pending.current=false;setBusy(false)}}
 const titles=ru?['Добро пожаловать в LOFT Store','Покупайте удобно','Не нашли нужный товар?']:['LOFT Store’ga xush kelibsiz','Qulay xarid qiling','Kerakli mahsulotni topmadingizmi?']
 const texts=ru?['Брендовая мужская одежда, обувь и аксессуары в одном приложении','Выбирайте товары, оформляйте заказы и следите за их статусом прямо в Telegram','Отправьте заявку на спецзаказ, и мы рассчитаем стоимость']:['Brendli erkaklar kiyimi, poyabzal va aksessuarlar bir ilovada','Mahsulot tanlang, buyurtma bering va holatini Telegram’da kuzating','Maxsus buyurtma uchun ariza yuboring, narxini hisoblab beramiz']
 const Icon=[Store,ShoppingBag,Globe][step]
 return <AnimatePresence>{open&&<motion.div data-onboarding role="dialog" aria-modal="true" aria-label={ru?'Знакомство с LOFT Store':'LOFT Store bilan tanishuv'} ref={root} tabIndex={-1} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();if(!needsLanguage)changeStep(step-1)}if(e.key==='Tab'){const buttons=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===root.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}} initial={false} exit={{opacity:0}} transition={{duration:reduced?0:motionTiming.feedback}} className="outline-none fixed inset-0 z-[300] overflow-y-auto bg-[#F5F1E8] dark:bg-dark-bg text-[#1B2A4A] dark:text-white px-5 py-8" style={{paddingTop:'max(24px,env(safe-area-inset-top))',paddingBottom:'max(24px,env(safe-area-inset-bottom))'}}>
  <div className="w-full max-w-md mx-auto min-h-full flex flex-col justify-center"><p data-intro-brand className="text-center font-bold text-2xl tracking-wide mb-6 shrink-0">LOFT Store</p>
   {needsLanguage?<><div data-intro-language className="flex flex-col justify-center min-h-[22rem]">
    <h1 className="text-2xl font-bold text-center mb-8">Выберите язык / Tilni tanlang</h1><div className="space-y-3">{(['ru','uz'] as const).map(v=><button key={v} disabled={busy} onClick={()=>void choose(v)} className={primary}>{choice===v&&<Check size={18}/>} {v==='ru'?'Русский':'O‘zbekcha'}</button>)}</div>
   </div><div aria-hidden className="h-36 shrink-0"/></>:<>
    <div data-intro-stage className="relative h-[22rem] overflow-hidden rounded-2xl bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border">
     <AnimatePresence initial={false} custom={direction}>
      <motion.div data-intro-screen={step} key={step} custom={direction} variants={{enter:(d:number)=>({x:reduced?0:`${d*100}%`,opacity:reduced?0:1}),center:{x:'0%',opacity:1},exit:(d:number)=>({x:reduced?0:`${-d*100}%`,opacity:reduced?0:1})}} initial="enter" animate="center" exit="exit" onAnimationComplete={definition=>{if(definition==='center'&&activeStep.current===step){movingRef.current=false;setMoving(false)}}} transition={{duration:reduced?0:motionTiming.page,ease:motionEase}} className="absolute inset-0 px-6 py-6 text-center flex flex-col items-center justify-center">
       <span className="w-16 h-16 shrink-0 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center mb-5"><Icon size={30} strokeWidth={1.5}/></span><h1 className="text-2xl font-bold mb-3">{titles[step]}</h1><p className="text-[#8A8275] dark:text-gray-300 leading-relaxed">{texts[step]}</p>
      </motion.div>
     </AnimatePresence>
    </div>
    <div className="relative flex justify-center my-5" aria-label={`${step+1}/3`}><div className="relative flex gap-2 h-1">{[0,1,2].map(v=><span key={v} className="w-5 h-1 rounded-full bg-[#E8E2D5] dark:bg-dark-border"/>)}<motion.span className="absolute top-0 left-0 w-5 h-1 rounded-full bg-[#C9A961]" animate={{x:step*28}} transition={{duration:reduced?0:motionTiming.page,ease:motionEase}}/></div></div>
    <button className={primary} disabled={busy||moving} onClick={()=>step<2?changeStep(step+1):void finish()}>{busy?(ru?'Сохраняем...':'Saqlanmoqda...'):step===2?(ru?'Начать покупки':'Xaridni boshlash'):(ru?'Далее':'Davom etish')}<ArrowRight size={18}/></button><div className="flex justify-between mt-2 min-h-11">{step>0?<button data-onboarding-back disabled={busy||moving} className="min-h-11 px-3 text-sm disabled:opacity-50" onClick={()=>changeStep(step-1)}>{ru?'Назад':'Orqaga'}</button>:<span/>}{step<2&&<button className="min-h-11 px-3 text-sm text-[#8A8275] dark:text-gray-300 disabled:opacity-50" disabled={busy||moving} onClick={()=>void finish()}>{ru?'Пропустить':'O‘tkazib yuborish'}</button>}</div>
   </>}{failure&&<p role="alert" className="text-sm mt-4">{failure}</p>}
   {!state&&error&&<div role="alert" className="mt-4 text-center text-sm">
     <p>{ru?'Не удалось проверить настройки аккаунта':'Hisob sozlamalarini tekshirib bo‘lmadi'}</p>
     <button type="button" disabled={busy} className="mt-2 min-h-11 px-4 font-bold underline" onClick={retry}>{ru?'Повторить':'Qayta urinish'}</button>
   </div>}
  </div></motion.div>}</AnimatePresence>
}
