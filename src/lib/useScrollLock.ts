import { useLayoutEffect } from 'react'

const owners = new Set<symbol>()
let previous = ''

/** Nested dialogs release only their own lock, in either unmount order. */
export function useScrollLock(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return
    const owner = Symbol()
    if (!owners.size) previous = document.body.style.overflow
    owners.add(owner)
    document.body.style.overflow = 'hidden'
    return () => {
      owners.delete(owner)
      if (!owners.size) document.body.style.overflow = previous
    }
  }, [active])
}
