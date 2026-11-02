import { motion, useReducedMotion } from 'framer-motion'
import { Send } from 'lucide-react'
import { createPortal } from 'react-dom'
export default function PlaneFlight({ origin, onComplete }: { origin: { x: number; y: number }; onComplete: () => void }) {
  const reduced = useReducedMotion()
  return createPortal(<motion.div data-plane-flight aria-hidden="true" className="fixed top-0 left-0 z-[110] pointer-events-none text-[#1B2A4A] dark:text-gold" initial={{ x: origin.x, y: origin.y, opacity: reduced ? 0 : 1, rotate: 0 }} animate={{ x: [origin.x, origin.x + 28, innerWidth / 2 - 10], y: [origin.y, origin.y - 100, 100], rotate: [0, -18, -40], opacity: [1, 1, 0], scale: [1, 1, 0.7] }} transition={{ duration: reduced ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }} onAnimationComplete={onComplete}><Send size={22} /></motion.div>, document.body)
}
