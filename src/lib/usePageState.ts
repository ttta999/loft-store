import { useLayoutEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'
const entries = new Map<string, unknown>()
/** Filters belong to a browser-history entry, so Back restores the exact list. */
export function usePageState<T>(field: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const location = useLocation()
  const key = `${location.key}:${field}`
  const [value, setValue] = useState<T>(() => entries.has(key) ? entries.get(key) as T : initial)
  useLayoutEffect(() => {
    entries.set(key, value)
    while (entries.size > 300) entries.delete(entries.keys().next().value!)
  }, [key, value])
  return [value, setValue]
}
