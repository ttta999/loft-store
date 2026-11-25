/** Skip full rows before the viewport so long catalogues need few geometry reads. */
export function visibleGridCards(grid: HTMLElement, rect: DOMRect, top: number, bottom: number, overscan = 0) {
  if (rect.bottom < top - overscan || rect.top > bottom + overscan) return []
  const cards = grid.children
  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length
  let first = 0
  let end = Math.ceil(cards.length / columns)
  while (first < end) {
    const middle = Math.floor((first + end) / 2)
    const start = middle * columns
    let rowBottom = -Infinity
    for (let index = start; index < Math.min(start + columns, cards.length); index++) {
      rowBottom = Math.max(rowBottom, cards[index].getBoundingClientRect().bottom)
    }
    if (rowBottom < top - overscan) first = middle + 1
    else end = middle
  }
  const visible: { card: Element; box: DOMRect }[] = []
  for (let index = first * columns; index < cards.length; index++) {
    const card = cards[index]
    const box = card.getBoundingClientRect()
    if (box.top > bottom + overscan) break
    visible.push({ card, box })
  }
  return visible
}
