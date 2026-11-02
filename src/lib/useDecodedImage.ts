import { useEffect, useState } from 'react'
/** Keep the previous decoded frame while the next color/photo is downloading. */
export function useDecodedImage(requested: string | undefined) {
  const [displayed, setDisplayed] = useState(requested)
  useEffect(() => {
    if (!requested || requested === displayed) return
    let active = true
    const image = new Image()
    image.src = requested
    void image.decode().then(() => { if (active) setDisplayed(requested) }).catch(() => {})
    return () => { active = false }
  }, [requested, displayed])
  return displayed || requested
}
