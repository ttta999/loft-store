export function chooseSizeChart(charts:any[], product:any, brands:any[]){
 return charts.filter(c=>c.is_active&&c.category_id===product.category&&(!c.subcategory_id||c.subcategory_id===product.subcategory)&&(!c.product_id||c.product_id===product.id)&&(!c.brand_id||c.product_id===product.id||brands.some(b=>b.id===c.brand_id&&[b.id,b.name].includes(product.brand_id||product.brand)))).sort((a,b)=>(b.product_id?100:0)+(b.brand_id?10:0)+(b.subcategory_id?1:0)-((a.product_id?100:0)+(a.brand_id?10:0)+(a.subcategory_id?1:0))||String(b.updated_at).localeCompare(String(a.updated_at)))[0]||null
}
