import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { motionEase } from '../lib/productTransition'
export default function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const reduced = useReducedMotion()
  return <AnimatePresence initial={false}>{open && <motion.div data-collapse key="content" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.22, ease: motionEase }} className="overflow-hidden">{children}</motion.div>}</AnimatePresence>
}
