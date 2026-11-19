import {forwardRef,type ButtonHTMLAttributes} from 'react'
/** Shared purchase/application action: the existing cart button geometry and colors. */
const PrimaryActionButton=forwardRef<HTMLButtonElement,ButtonHTMLAttributes<HTMLButtonElement>>(function PrimaryActionButton({className='',type='button',...props},ref){
 return <button {...props} ref={ref} type={type} className={`w-full min-h-12 py-3 px-3 rounded-xl bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] font-bold flex items-center justify-center gap-2 hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors disabled:opacity-50 disabled:cursor-wait ${className}`}/>
})
export default PrimaryActionButton
