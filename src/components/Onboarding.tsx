import {useEffect,useRef,useState} from 'react'
import {AnimatePresence,motion,useReducedMotion} from 'framer-motion'
import {ArrowRight,Check,Globe,ShoppingBag,Store} from 'lucide-react'
import {usePreferences} from '../lib/preferences'
import {peekStoreResponse,subscribePrivateResources,storeApi} from '../lib/api'
import {useStore} from '../store/useStore'
import {useScrollLock} from '../lib/useScrollLock'
import {motionEase} from '../lib/motion'
const primary='w-full min-h-12 px-5 py-3 rounded-full bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] font-bold flex items-center justify-center gap-2 disabled:opacity-50'
export default function Onboarding(){
 const identity=window.Telegram?.WebApp.initData||''
 return identity?<AccountIntro key={identity}/>:null
}
function AccountIntro(){
 const {data,loading,error,retry}=usePreferences(),language=useStore(s=>s.language),setLanguage=useStore(s=>s.setLanguage),ru=language==='ru',reduced=useReducedMotion()
 const [replay,setReplay]=useState(false),[step,setStep]=useState(0),[choice,setChoice]=useState<'ru'|'uz'|null>(null),[busy,setBusy]=useState(false),[failure,setFailure]=useState('')
 const root=useRef<HTMLDivElement>(null),pending=useRef(false)
 const [completed,setCompleted]=useState(!!data?.onboarding_completed_at)
 useEffect(()=>subscribePrivateResources(()=>{if(peekStoreResponse<{onboarding_completed_at?:string}>('preferences')?.data.onboarding_completed_at)setCompleted(true)}),[])
 const open=replay||(!completed&&!data?.onboarding_completed_at),needsLanguage=!replay&&data?.language_source!=='explicit'
 useScrollLock(open)
 useEffect(()=>{const replay=()=>{setStep(0);setReplay(true);setFailure('')};window.addEventListener('loft:open-tutorial',replay);return()=>window.removeEventListener('loft:open-tutorial',replay)},[])
 useEffect(()=>{if(open)root.current?.focus()},[open,step,needsLanguage])
 const finish=async()=>{if(pending.current)return;if(replay){setReplay(false);return}pending.current=true;setBusy(true);setFailure('');try{await storeApi('completeOnboarding')}catch{setFailure(ru?'Не удалось сохранить. Повторите попытку.':'Saqlanmadi. Qayta urinib ko‘ring.')}finally{pending.current=false;setBusy(false)}}
 const choose=async(value:'ru'|'uz')=>{if(pending.current)return;setChoice(value);setLanguage(value);pending.current=true;setBusy(true);setFailure('');try{await storeApi('language',{language:value});await storeApi('preferences',{}, {force:true})}catch{setFailure(value==='ru'?'Не удалось сохранить язык. Повторите выбор.':'Til saqlanmadi. Qayta tanlang.')}finally{pending.current=false;setBusy(false)}}
 const titles=ru?['Добро пожаловать в LOFT','Покупайте удобно','Не нашли нужный товар?']:['LOFT’ga xush kelibsiz','Qulay xarid qiling','Kerakli mahsulotni topmadingizmi?']
 const texts=ru?['Брендовая мужская одежда, обувь и аксессуары в одном приложении','Выбирайте товары, оформляйте заказы и следите за их статусом прямо в Telegram','Отправьте заявку на спецзаказ, и мы рассчитаем стоимость']:['Brendli erkaklar kiyimi, poyabzal va aksessuarlar bir ilovada','Mahsulot tanlang, buyurtma bering va holatini Telegram’da kuzating','Maxsus buyurtma uchun ariza yuboring, narxini hisoblab beramiz']
 const Icon=[Store,ShoppingBag,Globe][step]
 return <AnimatePresence>{open&&<motion.div data-onboarding role="dialog" aria-modal="true" aria-label={ru?'Знакомство с LOFT':'LOFT bilan tanishuv'} ref={root} tabIndex={-1} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();if(!needsLanguage&&step>0)setStep(s=>s-1)}if(e.key==='Tab'){const buttons=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===root.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}} initial={false} exit={{opacity:0}} transition={{duration:reduced?0:.18}} className="outline-none fixed inset-0 z-[300] overflow-y-auto bg-[#F5F1E8] dark:bg-dark-bg text-[#1B2A4A] dark:text-white flex flex-col justify-center px-5 py-8" style={{paddingTop:'max(32px,env(safe-area-inset-top))',paddingBottom:'max(32px,env(safe-area-inset-bottom))'}}>
  <div className="w-full max-w-md mx-auto"><p className="text-center font-bold text-2xl tracking-widest mb-8">LOFT</p>
   {(!data&&loading)?<div role="status" aria-label={ru?'Проверка профиля':'Profil tekshirilmoqda'} className="animate-pulse space-y-4"><div className="h-48 rounded-3xl bg-[#E8E2D5] dark:bg-dark-card"/><div className="h-12 rounded-full bg-[#E8E2D5] dark:bg-dark-card"/></div>:!data?<div role="alert"><p>{error}</p><button className={`${primary} mt-5`} onClick={retry}>{ru?'Повторить':'Qayta urinish'}</button></div>:needsLanguage?<>
    <h1 className="text-2xl font-bold text-center mb-8">Выберите язык / Tilni tanlang</h1><div className="space-y-3">{(['ru','uz'] as const).map(v=><button key={v} disabled={busy} onClick={()=>void choose(v)} className={primary}>{choice===v&&<Check size={18}/>} {v==='ru'?'Русский':'O‘zbekcha'}</button>)}</div>
   </>:<>
    <motion.div key={step} initial={reduced?false:{opacity:0,x:12}} animate={{opacity:1,x:0}} transition={{duration:.22,ease:motionEase}} className="bg-[#FBF9F4] dark:bg-dark-card border border-[#E8E2D5] dark:border-dark-border rounded-3xl px-6 py-9 text-center"><span className="w-20 h-20 mx-auto rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center mb-7"><Icon size={32} strokeWidth={1.5}/></span><h1 className="text-2xl font-bold mb-3">{titles[step]}</h1><p className="text-[#8A8275] dark:text-gray-300 leading-relaxed">{texts[step]}</p></motion.div>
    <div className="flex gap-2 justify-center my-6" aria-label={`${step+1}/3`}>{[0,1,2].map(v=><span key={v} className={`h-1 rounded-full transition-all ${step===v?'w-7 bg-[#C9A961]':'w-2 bg-[#E8E2D5] dark:bg-dark-border'}`}/>)}</div>
    <button className={primary} disabled={busy} onClick={()=>step<2?setStep(s=>s+1):void finish()}>{busy?(ru?'Сохраняем...':'Saqlanmoqda...'):step===2?(ru?'Начать покупки':'Xaridni boshlash'):(ru?'Далее':'Davom etish')}<ArrowRight size={18}/></button><div className="flex justify-between mt-3">{step>0?<button data-onboarding-back disabled={busy} className="min-h-11 px-3 text-sm" onClick={()=>setStep(s=>s-1)}>{ru?'Назад':'Orqaga'}</button>:<span/>}<button className="min-h-11 px-3 text-sm text-[#8A8275] dark:text-gray-300" disabled={busy} onClick={()=>void finish()}>{ru?'Пропустить':'O‘tkazib yuborish'}</button></div>
   </>}{failure&&<p role="alert" className="text-sm mt-4">{failure}</p>}
  </div></motion.div>}</AnimatePresence>
}
