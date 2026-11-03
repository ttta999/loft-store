/** Restrained UI motion. Durations are seconds; CSS equivalents live in index.css. */
export const motionEase = [0.25, 0.1, 0.25, 1] as const
export const motionExitEase = [0.4, 0, 1, 1] as const
export const motionEaseCSS = 'cubic-bezier(0.25, 0.1, 0.25, 1)'
export const motionTiming = {
  page: 0.22,
  section: 0.22,
  detailClose: 0.18,
  disclosure: 0.22,
  sheetOpen: 0.28,
  sheetClose: 0.22,
  viewerOpen: 0.28,
  viewerClose: 0.22,
  feedback: 0.15,
  flight: 0.6,
  success: 0.26,
  successDelay: 0.08,
} as const
export const motionDistance = { section: 8, dismiss: 4, success: 4 } as const
