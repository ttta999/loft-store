const LETTER_ORDER = [
  'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL',
]

function sizeSortKey(size: string): number {
  if (!size) return 999999
  const normalized = size.trim()
  if (!normalized) return 999999

  if (normalized === 'One Size' || normalized === 'one size' || normalized === 'One size') {
    return 99999
  }

  if (/^\d+$/.test(normalized)) {
    return 1000 + parseInt(normalized, 10)
  }

  let upper = normalized.toUpperCase()
  if (upper === '2XL') upper = 'XXL'
  if (upper === '3XL') upper = '3XL'
  if (upper === '4XL') upper = '4XL'

  const letterIdx = LETTER_ORDER.indexOf(upper)
  if (letterIdx !== -1) return letterIdx

  return 50000 + normalized.charCodeAt(0)
}

export function sortSizeStrings(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => sizeSortKey(a) - sizeSortKey(b))
}

export function sortSizes<T>(sizes: T[], getKey: (item: T) => string): T[] {
  return [...sizes].sort((a, b) => sizeSortKey(getKey(a)) - sizeSortKey(getKey(b)))
}