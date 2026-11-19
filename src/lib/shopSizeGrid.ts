/** The store's agreed grid, not a manufacturer conversion or stock source. */
export const PANTS_SIZE_GRID=['36','38','40','42','44','46','48','50','52','54','56']
export const usesPantsGrid=(category:string,subcategory:string)=>category==='clothes'&&['pants','trousers','jeans'].includes(subcategory)
export function shopSizeOptions(category:string,subcategory:string,actual:string[]){return usesPantsGrid(category,subcategory)?[...new Set([...PANTS_SIZE_GRID,...actual])]:actual}
