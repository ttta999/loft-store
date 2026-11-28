import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { sql } from './session-fixture.mjs'

export async function verifyCatalogue(admin, owner, anonymous) {
  assert.equal(sql(`
    select count(*) from pg_attribute a cross join (values ('anon'),('authenticated')) r(name)
    where a.attrelid in ('public.products'::regclass,'public.product_colors'::regclass,'public.product_variants'::regclass)
      and a.attnum > 0 and not a.attisdropped
      and (has_column_privilege(r.name,a.attrelid,a.attnum,'INSERT')
        or has_column_privilege(r.name,a.attrelid,a.attnum,'UPDATE')
        or has_table_privilege(r.name,a.attrelid,'DELETE'))
  `), '0')
  sql(`insert into public.categories(id,name_ru,name_uz) values('shoes','Fixture shoes','Fixture shoes') on conflict do nothing;
    insert into public.subcategories(id,category_id,name_ru,name_uz) values('security-fixture','shoes','Fixture','Fixture') on conflict do nothing`)
  const product = randomUUID(), color = randomUUID(), variant = randomUUID()
  sql(`insert into public.products(id,name_ru,name_uz,category,subcategory,price_usd,images,size_type,is_active)
      values('${product}','Fixture','Fixture','shoes','security-fixture',20,array[]::text[],'numeric',true);
    insert into public.product_colors(id,product_id,name_ru) values('${color}','${product}','Fixture');
    insert into public.product_variants(id,product_id,color_id,size_value,stock)
      values('${variant}','${product}','${color}','42',3);`)
  const base = {
    p_id: product,
    p_product: { name_ru: 'Fixture', category: 'shoes', subcategory: 'security-fixture', images: [], price_usd: 20, size_type: 'numeric' },
    p_colors: [{ key: color, name_ru: 'Fixture', images: [], sort_order: 0 }],
    p_variants: [{ color_key: color, size_value: '42', stock: 3 }],
  }
  const snapshot = () => JSON.parse(sql(`select json_build_object('version',p.catalog_version,
    'variants',json_build_array(json_build_object('id',v.id,'stock',v.stock)))
    from public.products p join public.product_variants v on v.product_id=p.id where p.id='${product}'`))
  const edit = (expected, changes = {}) => admin.rpc('store_admin_save_product', { ...base, p_expected: expected, ...changes })
  const stock = () => Number(sql(`select stock from public.product_variants where id='${variant}'`))

  const preview = await anonymous.from('products').select('id').eq('id', product).single()
  assert.equal(preview.data?.id, product)
  assert.equal((await anonymous.rpc('store_product_available', { p_product: product, p_size: '42', p_quantity: 1, p_color: color })).data, true)
  assert.ok((await anonymous.from('product_variants').select('stock').eq('id', variant)).error)
  const expected = snapshot()
  assert.ok((await edit(expected, { p_product: { ...base.p_product, name_ru: 'Invalid edit', price_usd: -1 } })).error)
  assert.ok((await edit(expected, { p_product: { ...base.p_product, name_ru: 'Invalid edit' },
    p_variants: [{ ...base.p_variants[0], stock: -1 }] })).error)
  assert.deepEqual(snapshot(), expected)
  assert.equal(sql(`select name_ru from public.products where id='${product}'`), 'Fixture')
  console.log('PASS: real catalogue table grants, public projection and atomic validation')

  const buyer = '900009900'
  const [purchase, update] = await Promise.all([
    owner.rpc('store_create_order', { p_user: buyer, p_key: randomUUID(), p_payload: {
      client_name: 'Fixture buyer', client_phone: '+998000000000', delivery_method: 'pickup',
      payment_method: 'online_card', order_currency: 'UZS', expected_total_usd: 20, expected_total_uzs: 240000,
      items: [{ productId: product, colorId: color, size: '42', quantity: 1 }],
    } }),
    edit(expected),
  ])
  assert.ok(!purchase.error, `Synthetic checkout (${purchase.error?.code ?? ''})`)
  if (update.error) assert.equal(update.error.code, 'P0001')
  assert.equal(stock(), 2)
  assert.ok((await edit(expected)).error, 'Old inventory version must be rejected')
  assert.ok((await admin.rpc('store_admin_delete_product', { p_id: product })).error)
  assert.ok((await edit(snapshot(), { p_colors: [], p_variants: [] })).error)
  assert.ok(!(await edit(snapshot(), { p_variants: [] })).error)
  assert.equal(stock(), 0)
  assert.ok(!(await admin.rpc('store_admin_product_visibility', { p_id: product, p_active: false })).error)
  console.log('PASS: concurrent checkout/editor, stale version, product and reserved colour deletion protection')

  const orderId = purchase.data.id
  const cancel = () => admin.rpc('store_admin_cancel_order_reason', { p_order_id: orderId, p_reason: 'Fixture cancellation', p_manual: false })
  const [cancelled, racedEdit] = await Promise.all([
    cancel(), edit(snapshot(), { p_variants: [{ ...base.p_variants[0], stock: 0 }] }),
  ])
  assert.ok(!cancelled.error, `Synthetic cancellation (${cancelled.error?.code ?? ''})`)
  if (racedEdit.error) assert.equal(racedEdit.error.code, 'P0001')
  assert.equal(stock(), 1)
  assert.ok(!(await cancel()).error)
  assert.equal(stock(), 1)
  assert.ok(!(await admin.rpc('store_admin_product_visibility', { p_id: product, p_active: true })).error)
  console.log('PASS: concurrent cancellation/editor and exactly one stock return while hidden')
}
