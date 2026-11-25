const startParam = 'loft_motion_diagnostics'
let enabled = false
let lastInput: { kind: 'island' | 'telegram'; time: number } | undefined
let report = ''
let launcher: HTMLButtonElement | undefined

function debugEnabled() {
  enabled ||= window.Telegram?.WebApp.initDataUnsafe?.start_param === startParam ||
    (location.search.includes(startParam) && new URLSearchParams(location.search).get('tgWebAppStartParam') === startParam)
  return enabled
}

export function rememberProductReturnTraceMode() {
  debugEnabled()
}

export function markProductBackInput(kind: 'island' | 'telegram') {
  if (debugEnabled()) lastInput = { kind, time: performance.now() }
}

function showReport(value: string) {
  report = value
  if (launcher?.isConnected) return
  launcher = document.createElement('button')
  launcher.type = 'button'
  launcher.textContent = 'Motion trace'
  launcher.className = 'fixed right-4 top-24 z-[100] rounded-xl bg-[#1B2A4A] px-3 py-2 text-xs text-white'
  launcher.addEventListener('click', () => {
    const dialog = document.createElement('dialog')
    dialog.className = 'm-auto w-[min(90vw,32rem)] rounded-2xl bg-[#FBF9F4] p-4 text-[#1B2A4A]'
    const field = document.createElement('textarea')
    field.value = report
    field.readOnly = true
    field.setAttribute('aria-label', 'Motion trace')
    field.className = 'h-52 w-full text-xs'
    const close = document.createElement('button')
    close.type = 'button'
    close.textContent = 'Close'
    close.addEventListener('click', () => dialog.close())
    dialog.append(field, close)
    dialog.addEventListener('close', () => dialog.remove(), { once: true })
    document.body.append(dialog)
    dialog.showModal()
    field.select()
  })
  document.body.append(launcher)
}

export type ProductReturnTrace = NonNullable<ReturnType<typeof beginProductReturnTrace>>

/** A local report of timings and geometry. No route, image or customer identifiers. */
export function beginProductReturnTrace() {
  if (!debugEnabled()) return undefined
  launcher?.remove()
  const route = performance.now()
  const input = lastInput && route - lastInput.time < 1500 ? lastInput : undefined
  lastInput = undefined
  const origin = input?.time ?? route
  const round = (number: number) => Math.round(number * 10) / 10
  const marks: { phase: string; ms: number; values?: number[] }[] = []
  const frames: { ms: number; clock: number; x: number }[] = []
  let request = 0
  const mark = (phase: string, ...values: number[]) => {
    marks.push({ phase, ms: round(performance.now() - origin), ...(values.length ? { values } : {}) })
  }
  mark('routeObserved')
  return {
    mark,
    sample(animation: Animation, target: HTMLElement | null | undefined, width: number) {
      if (!target) return
      mark('frameCallback', round(Number(animation.startTime) - origin), round(Number(animation.currentTime)))
      const tick = () => {
        frames.push({
          ms: round(performance.now() - origin),
          clock: round(Number(animation.currentTime)),
          x: round(target.getBoundingClientRect().left + width),
        })
        if (frames.length < 90 && animation.playState === 'running') request = requestAnimationFrame(tick)
      }
      tick()
    },
    finish() {
      cancelAnimationFrame(request)
      mark('layersRemoved')
      showReport(JSON.stringify({ input: input?.kind ?? 'browser', marks, frames }, null, 2))
    },
  }
}
