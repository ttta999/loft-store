import assert from 'node:assert/strict'
export default async function({pg,scalar,file}){
 await pg.exec(`insert into public.categories(id,name_ru,name_uz,is_active) values('clothes','Одежда','Kiyim',true);
 insert into public.subcategories(id,category_id,name_ru,name_uz,size_type,sizes,is_active) values('pants','clothes','Брюки','Shimlar','combined','["M","48"]',true),('jeans','clothes','Джинсы','Jinsi','combined','["M","48"]',true);
 insert into public.products(id,name_ru,name_uz,category,subcategory,price_usd,size_type,is_active) values('77777777-7777-4777-8777-777777777777','Legacy брюки','Legacy shim','clothes','pants',100,'combined',true);
 insert into public.product_variants(id,product_id,size_value,stock) values('55555555-5555-4555-8555-555555555555','77777777-7777-4777-8777-777777777777','M',7);`)
 const snapshot=()=>scalar(`select jsonb_build_object('products',(select jsonb_agg(to_jsonb(p) order by id) from public.products p),'variants',(select jsonb_agg(to_jsonb(v) order by id) from public.product_variants v),'orders',(select jsonb_agg(to_jsonb(o) order by id) from public.orders o))`)
 const before=await snapshot();await pg.exec(await file('supabase/migrations/20261119170446_pants_jeans_shop_grid.sql'))
 assert.deepEqual(await snapshot(),before)
 const grid=['36','38','40','42','44','46','48','50','52','54','56']
 for(const sub of ['pants','jeans']){const row=await scalar(`select to_jsonb(s) from public.subcategories s where id=$1`,[sub]);assert.equal(row.size_type,'numeric');assert.deepEqual(row.sizes,grid)}
 console.log('PASS: pants/jeans defaults use eleven numeric sizes; legacy M, stocks, variant IDs and historical orders unchanged')
}
