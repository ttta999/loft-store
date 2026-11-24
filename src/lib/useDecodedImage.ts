import { useEffect, useState } from 'react'
const pendingDecodes = new Map<string, Promise<void>>()

function decodeImage(url: string) {
  const pending = pendingDecodes.get(url)
  if (pending) return pending
  const image = new Image()
  image.src = url
  const request = image.decode().finally(() => pendingDecodes.delete(url))
  pendingDecodes.set(url, request)
  return request
}

/** Keep the previous decoded frame while the next color/photo is downloading. */
export function useDecodedImage(requested: string | undefined) {
  const [displayed, setDisplayed] = useState(requested)
  useEffect(() => {
    if (!requested || requested === displayed) return
    let active = true
    void decodeImage(requested).then(() => { if (active) setDisplayed(requested) }).catch(() => {})
    return () => { active = false }
  }, [requested, displayed])
  return displayed || requested
}
