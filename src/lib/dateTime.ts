/** Absolute server timestamps are UTC. Device timezone is used only at the UI boundary. */
export type Timestamp = string | number | Date | null | undefined
export function getDeviceTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}
export const dateLocale = (language: string) => language === 'uz' ? 'uz-Latn-UZ' : 'ru-RU'
export function timestampDate(value: Timestamp): Date {
  if (value == null || value === '') return new Date(NaN)
  // The existing legacy paid_at column has UTC values without an offset.
  // Do not reinterpret those values as local wall-clock time, or rewrite them in storage.
  const normalized = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? value.replace(' ', 'T') + 'Z' : value
  return normalized instanceof Date ? new Date(normalized.getTime()) : new Date(normalized)
}
const dateTimeOptions: Intl.DateTimeFormatOptions = {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}
export function formatLocalDateTime(value: Timestamp, language = 'ru', options: Omit<Intl.DateTimeFormatOptions,'timeZone'> = dateTimeOptions): string {
  const date = timestampDate(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(dateLocale(language), {...options,timeZone:getDeviceTimeZone()}).format(date)
}
export const formatLocalDate = (value: Timestamp, language = 'ru') => formatLocalDateTime(value,language,{day:'2-digit',month:'2-digit',year:'numeric'})
export const formatLocalTime = (value: Timestamp, language = 'ru') => formatLocalDateTime(value,language,{hour:'2-digit',minute:'2-digit'})
export function localDateKey(value: Timestamp): string {
  const date=timestampDate(value)
  if(Number.isNaN(date.getTime()))return ''
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:getDeviceTimeZone(),year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date)
  const part=(name:string)=>parts.find(p=>p.type===name)?.value||''
  return `${part('year')}-${part('month')}-${part('day')}`
}
/** The browser resolves the selected wall time using the device's DST rules. */
export function localInputToUtc(value: string): string {
  if(!value)return ''
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if(!match)throw new RangeError('Invalid local time')
  const [,y,m,d,h,min]=match.map(Number)
  const date=new Date(0);date.setFullYear(y,m-1,d);date.setHours(h,min,0,0)
  // Reject invalid dates and the missing hour during a spring DST transition.
  if(date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d||date.getHours()!==h||date.getMinutes()!==min)throw new RangeError('Invalid local time')
  return date.toISOString()
}
/** An already selected/saved instant can change its label, never its UTC value. */
export function utcToLocalInput(value: Timestamp): string {
  const date=timestampDate(value)
  if(Number.isNaN(date.getTime()))return ''
  const pad=(n:number)=>String(n).padStart(2,'0')
  return `${String(date.getFullYear()).padStart(4,'0')}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
