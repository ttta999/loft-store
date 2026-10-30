import { HttpError } from './auth.ts'

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export function decodeImage(base64: unknown) {
  if (typeof base64 !== 'string' || base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new HttpError(400, 'Выберите изображение размером до 2 МБ')
  const bytes = Buffer.from(base64, 'base64')
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new HttpError(400, 'Изображение слишком большое')
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString('ascii',12,16)==='IHDR') return { bytes, type: 'image/png', ext: 'png' }
  if (bytes.length >= 4 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255 && bytes[bytes.length-2]===255 && bytes[bytes.length-1]===217) return { bytes, type: 'image/jpeg', ext: 'jpg' }
  if (bytes.length >= 20 && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP' && bytes.readUInt32LE(4)===bytes.length-8) return { bytes, type: 'image/webp', ext: 'webp' }
  throw new HttpError(400, 'Допустимы изображения JPG, PNG и WebP')
}
