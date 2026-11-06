// Search a named destination instead of guessing coordinates for a shop floor.
// Navigator URL format: https://yandex.com/dev/navigator/doc/ru/concepts/navigator-url-params
export const STORE_MAP_URL = 'https://yandex.com/maps/org/mercato/220591012883/'
export const STORE_NAVIGATOR_URL = 'yandexnavi://map_search?text=' + encodeURIComponent('Ташкент, Малая кольцевая дорога, 57, ТЦ Mercato')
export function storeNavigationLink() {
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return mobile ? { href: STORE_NAVIGATOR_URL } : { href: STORE_MAP_URL, target: '_blank', rel: 'noopener noreferrer' }
}
