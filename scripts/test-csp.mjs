import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { loadEnv } from 'vite';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const root=process.cwd(), admin=resolve(process.env.LOFT_ADMIN_ROOT || loadEnv('e2e',root,'LOFT_').LOFT_ADMIN_ROOT || '../loft-store-admin');
const artifacts=resolve(root,'test-results/csp');await mkdir(artifacts,{recursive:true});
const { chromium }=await import(pathToFileURL(root+'/node_modules/playwright/index.mjs'));
const { install }=await import(pathToFileURL(root+'/e2e/fixture.ts'));
const servers=[];
for(const [folder,port] of [[root,4173],[admin,4174]]){
 const config=JSON.parse(await readFile(folder+'/vercel.json','utf8'));
 const securityHeaders=Object.fromEntries(config.headers.find(h=>h.source==='/(.*)').headers.map(h=>[h.key,h.value]));
 const server=createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   let file=resolve(folder+'/dist','.'+pathname);
   if(!file.startsWith(folder+'/dist/'))file=folder+'/dist/index.html';
   let bytes;try{bytes=await readFile(file)}catch{file=folder+'/dist/index.html';bytes=await readFile(file)}
   const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
   res.writeHead(200,{...securityHeaders,'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(bytes);
  }catch{res.writeHead(500);res.end()}
 });
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));servers.push(server);
}
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const h=await install(context,'kmbmsbydxnxxiwypaxwm.supabase.co');
 h.db=JSON.parse(JSON.stringify(h.db).replaceAll('http://127.0.0.1:4173/fixture-product.svg','https://images.fixture.test/item.svg'));
 await context.route('https://images.fixture.test/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#c9a961"/></svg>'}));
 const cspErrors=[];
 context.on('page',p=>p.on('console',m=>{if(m.type()==='error'&&/content security policy|violates|refused to/i.test(m.text()))cspErrors.push(m.text())}));
 const store=await context.newPage();await store.goto('http://127.0.0.1:4173/');await store.waitForLoadState('networkidle');
 await store.locator('[data-product-card]').first().click();await store.getByRole('heading',{name:'Тестовые кроссовки',exact:true}).waitFor();
 await store.waitForFunction(()=>!document.documentElement.dataset.loftMotion && document.querySelector('[data-product-hero]')?.complete);
 await store.screenshot({path:resolve(artifacts,'store.png')});
 const manager=await context.newPage();await manager.goto('http://127.0.0.1:4174/');await manager.waitForLoadState('networkidle');
 await manager.getByRole('heading',{name:'LOFT Admin Panel'}).waitFor();await manager.screenshot({path:resolve(artifacts,'admin.png')});
 await manager.goto('http://127.0.0.1:4174/products');await manager.getByRole('button',{name:'Редактировать',exact:true}).click();
 assert.equal(await manager.getByPlaceholder('Например: Loro Piana Summer Walk',{exact:true}).inputValue(),'Тестовые кроссовки');
 assert.deepEqual(h.errors,[]);assert.deepEqual(h.blocked,[]);assert.deepEqual(cspErrors,[]);
 console.log('Production bundles under exact CSP: storefront product, admin MFA session, dashboard and product form passed; no CSP violations or unmocked network.');
 await context.close();
}finally{await browser?.close();for(const server of servers)await new Promise(ok=>server.close(ok));}
