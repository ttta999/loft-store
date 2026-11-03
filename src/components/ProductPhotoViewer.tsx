import { motionEase, motionTiming } from '../lib/motion'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { useDecodedImage } from '../lib/useDecodedImage'

/** Resize the clipping rectangle, rather than stretching the photograph. */
export default function ProductPhotoViewer({ src, aspect: initialAspect, children }: { src: string; aspect: number; children: ReactNode }) {
  const reduced = useReducedMotion()
  const [aspect, setAspect] = useState(initialAspect || 1)
  const [viewport, setViewport] = useState({ width: innerWidth, height: innerHeight })
  const image = useDecodedImage(src)
  useEffect(() => {
    const resize = () => setViewport({ width: innerWidth, height: innerHeight })
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const width = Math.min(viewport.width, viewport.height * aspect)
  const height = width / aspect
  const source = () => {
    const rect = document.querySelector('[data-product-hero]')?.getBoundingClientRect()
    return { left: rect?.left || 0, top: rect?.top || 0, width: rect?.width || width, height: rect?.height || height, borderRadius: '16px 16px 0px 0px' }
  }
  const transition = { duration: reduced ? 0 : motionTiming.viewerOpen, ease: motionEase }
  return <motion.div style={{ transition: 'none' }} initial={{ backgroundColor: 'rgba(0,0,0,0)' }} animate={{ backgroundColor: 'rgba(0,0,0,1)' }} exit={{ backgroundColor: 'rgba(0,0,0,0)', transition: { ...transition, duration: reduced ? 0 : motionTiming.viewerClose } }} transition={transition} role="dialog" aria-label="Просмотр фото" className="loft-modal fixed inset-0 z-[80]">
    <motion.div initial="source" animate="viewer" exit="close" variants={{ source, close: () => ({ ...source(), transition: { ...transition, duration: reduced ? 0 : motionTiming.viewerClose } }), viewer: { left: (viewport.width - width) / 2, top: (viewport.height - height) / 2, width, height, borderRadius: '0px' } }} transition={transition} className="fixed overflow-hidden">
      <img src={image} alt="Full screen" className="w-full h-full object-cover" onLoad={event => { const image = event.currentTarget; if (image.naturalWidth && image.naturalHeight) setAspect(image.naturalWidth / image.naturalHeight) }} />
    </motion.div>
    {children}
  </motion.div>
}
