import { motion, useReducedMotion } from 'framer-motion'
import { useLayoutEffect, useRef, useState } from 'react'
import { motionEase, motionTiming } from '../lib/motion'

const aspects = new Map<string, number>()

/** Reserve a photo slot before download. Keep its geometry frozen during a
 * route snapshot, then settle to the natural aspect ratio without a jump. */
export default function IntrinsicImage({ src, alt }: { src: string; alt: string }) {
  const reduced = useReducedMotion()
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [aspect, setAspect] = useState(() => aspects.get(src) || 1)
  useLayoutEffect(() => {
    const measure = () => setWidth(container.current?.getBoundingClientRect().width || 0)
    const settle = () => { if (!document.documentElement.dataset.loftMotion) setAspect(aspects.get(src) || 1) }
    measure(); settle()
    const observer = new ResizeObserver(measure)
    if (container.current) observer.observe(container.current)
    window.addEventListener('loft:transition-end', settle)
    return () => { observer.disconnect(); window.removeEventListener('loft:transition-end', settle) }
  }, [src])
  return <motion.div ref={container} data-intrinsic-image initial={false}
    style={{ aspectRatio: aspect }} animate={{ height: width ? (width - 2) / aspect + 2 : 'auto' }}
    transition={{ duration: reduced ? 0 : motionTiming.disclosure, ease: motionEase }}
    className="relative w-full overflow-hidden rounded-xl border border-[#E8E2D5] dark:border-dark-border">
    <img src={src} alt={alt} decoding="async" className="absolute inset-0 w-full h-full object-contain" onLoad={event => {
      const image = event.currentTarget
      if (!image.naturalWidth || !image.naturalHeight) return
      const ratio = image.naturalWidth / image.naturalHeight
      aspects.set(src, ratio)
      while (aspects.size > 100) aspects.delete(aspects.keys().next().value!)
      if (!document.documentElement.dataset.loftMotion) setAspect(ratio)
    }} />
  </motion.div>
}
