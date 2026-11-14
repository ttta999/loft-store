import type { SavedSize } from './preferences'
export type PublicVariant={id:string;product_id:string;size_value:string;color_id:string|null;available:boolean}
export function matchesSize(product:any, variants:PublicVariant[], sizes:SavedSize[], colorId?:string|null){
 return sizes.some(s=>s.category===product.category&&s.subcategory===product.subcategory&&s.system===product.size_type&&variants.some(v=>v.product_id===product.id&&v.available&&v.size_value===s.size&&(colorId===undefined||v.color_id===colorId)))
}
