/** In-memory data only: bounded lifetime, request deduplication and safe invalidation. */
export class ResourceCache {
  private entries = new Map<string, { value: unknown; expiresAt: number }>()
  private pending = new Map<string, Promise<unknown>>()
  private revision = 0
  private maxEntries: number
  private now: () => number
  constructor(maxEntries = 256, now = () => Date.now()) { this.maxEntries = maxEntries; this.now = now }
  get<T>(key: string): T | null {
    const entry = this.entries.get(key)
    if (!entry) return null
    if (entry.expiresAt <= this.now()) { this.entries.delete(key); return null }
    return entry.value as T
  }
  set<T>(key: string, value: T, ttl = 300_000) {
    this.pending.delete(key)
    this.entries.delete(key)
    this.entries.set(key, { value, expiresAt: this.now() + ttl })
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!)
  }
  async load<T>(key: string, loader: () => Promise<T>, ttl = 300_000, force = false): Promise<T> {
    if (force) this.invalidate(key)
    const cached = this.get<T>(key)
    if (cached !== null) return cached
    const current = this.pending.get(key)
    if (current) return current as Promise<T>
    const revision = this.revision
    const request = Promise.resolve().then(loader).then(value => {
      if (revision === this.revision && this.pending.get(key) === request) this.set(key, value, ttl)
      return value
    }).finally(() => { if (this.pending.get(key) === request) this.pending.delete(key) })
    this.pending.set(key, request)
    return request
  }
  invalidate(prefix: string) {
    this.revision++
    for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key)
    for (const key of this.pending.keys()) if (key.startsWith(prefix)) this.pending.delete(key)
  }
  clear() { this.revision++; this.entries.clear(); this.pending.clear() }
}
export const dataCache = new ResourceCache()
