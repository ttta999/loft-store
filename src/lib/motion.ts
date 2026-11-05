/** Restrained UI motion. Durations are seconds; CSS equivalents live in index.css. */
export const motionEase = [0.4, 0, 0.2, 1] as const
export const motionExitEase = [0.4, 0, 1, 1] as const
export const motionEaseCSS = 'cubic-bezier(0.4, 0, 0.2, 1)'
export const motionTiming = {
  page: 0.34,
  section: 0.34,
  detailClose: 0.34,
  disclosure: 0.34,
  sheetOpen: 0.34,
  sheetClose: 0.34,
  viewerOpen: 0.34,
  viewerClose: 0.34,
  feedback: 0.15,
  flight: 0.6,
  success: 0.26,
  successDelay: 0.08,
} as const
export const motionDistance = { section: 8, dismiss: 4, success: 4 } as const
