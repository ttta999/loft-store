import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { dialogClip, dialogOrigin, lastDialogAction } from '../lib/dialogOrigin'
import { motionEase, motionEaseCSS, motionTiming } from '../lib/motion'

/** The same surface expansion as profile history, without scaling text or
 * transforming fixed children. AnimatePresence retains it through dismissal. */
export default function SurfaceDialog({ origin, stage, className, children, onClick, role, label }: {
  origin: string; stage?: string; className: string; children: ReactNode;
  onClick?: () => void; role?: 'dialog'; label?: string;
}) {
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const [source] = useState(() => dialogOrigin(origin))
  const previous = useRef(stage)
  useEffect(() => {
    window.dispatchEvent(new Event('loft:dialog-change'))
    return () => { window.dispatchEvent(new Event('loft:dialog-change')) }
  }, [])
  useLayoutEffect(() => {
    root.current?.querySelector('.loft-header button')?.setAttribute('data-loft-dismiss', 'true')
    if (previous.current === stage) return
    previous.current = stage
    if (reduced) return
    const animation = root.current?.animate([{ clipPath: dialogClip(lastDialogAction()) }, { clipPath: dialogClip(null) }], { duration: motionTiming.section * 1000, easing: motionEaseCSS })
    return () => animation?.cancel()
  }, [stage, reduced])
  return <motion.div ref={root} data-surface-dialog={origin} data-dialog-stage={stage}
    role={role} aria-label={label} aria-modal={role === 'dialog' ? true : undefined}
    onClick={onClick} className={className} style={{ transitionProperty: 'background-color, color, border-color' }}
    initial={reduced ? false : { clipPath: dialogClip(source), opacity: source ? 1 : 0.9 }}
    animate={{ clipPath: dialogClip(null), opacity: 1 }}
    variants={{ dismissed: () => {
      const target = dialogOrigin(origin, true)
      return { clipPath: reduced ? dialogClip(null) : dialogClip(target), opacity: reduced || target ? 1 : 0 }
    } }} exit="dismissed"
    transition={{ duration: reduced ? 0 : motionTiming.section, ease: motionEase }}>
    {children}
  </motion.div>
}
