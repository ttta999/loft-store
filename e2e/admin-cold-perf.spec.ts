import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {test,expect,ADMIN} from './fixture'
import {writeFile} from 'node:fs/promises'
test('cold metadata vs slow protected files: structure and usable list measured separately',async({page,harness},info)=>{
 const original=harness.db.orders[0];harness.db.orders=Array.from({length:30},(_,i)=>({...original,id:1001+i,payment_screenshot_url:`private:payment-screenshots/${original.user_id}/receipt-${i}.png`}))
 await page.route(/\/(auth\/v1\/user|rest\/v1\/rpc\/store_is_admin)(\?|$)/,async r=>{await new Promise(resolve=>setTimeout(resolve,100));await r.fallback()})
 await page.route('**/storage/v1/object/sign/**',async r=>{await new Promise(resolve=>setTimeout(resolve,400));await r.fallback()})
 await page.goto(ADMIN+'/orders');await expect(page.locator('.sticky').getByRole('heading',{name:'Заказы',exact:true})).toBeVisible();const structure=await page.evaluate(()=>performance.now());await expect(page.getByRole('button',{name:/Заказ №1001\b/})).toBeVisible();const usable=await page.evaluate(()=>performance.now());const rows=harness.calls.filter(c=>c.path==='/rest/v1/orders').length,signs=harness.calls.filter(c=>c.path.includes('/storage/v1/object/sign/')).length
 const result={structureMs:Math.round(structure),usableMetadataMs:Math.round(usable),orderRequests:rows,protectedSignRequestsBeforeList:signs};console.log('COLD_PERF',JSON.stringify(result));await writeFile(join(tmpdir(),'loft-admin-cold-'+(process.env.LOFT_PERF_LABEL||'after')+'-'+info.repeatEachIndex+'.json'),JSON.stringify(result,null,2));expect(harness.errors).toEqual([])
})
