type StartupStage = 'entry' | 'sdk' | 'interface' | 'ready' | 'session-start' | 'session-verified' | 'preferences' | 'catalog-start' | 'catalog-settled'

/** Navigation-local User Timing entries. No session data, URLs or network logging. */
export function markStartup(stage: StartupStage) {
  const name = 'loft:startup:' + stage
  if (typeof performance === 'undefined' || performance.getEntriesByName(name, 'mark').length) return
  performance.mark(name)
  performance.measure('loft:since-navigation:' + stage, { start: 0, end: name })
}
