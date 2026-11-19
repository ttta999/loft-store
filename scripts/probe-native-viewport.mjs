/** Diagnostic reproduction, not an iPhone/FPS benchmark.
 * Run: node scripts/probe-native-viewport.mjs
 * Compare a 1000ms View Transition with/without a viewport resize after ready.
 * A resolved `finished` promise does not prove the full animation was rendered.
 */
import {chromium,webkit} from 'playwright'
for(const [name,type,options] of [['chrome',chromium,{channel:'chrome'}],['webkit',webkit,{}]]){
 const browser=await type.launch({headless:true,...options})
 try{
  for(const resize of [false,true]){
   const page=await browser.newPage({viewport:{width:390,height:800}})
   await page.setContent('<style>::view-transition-group(*){animation-duration:1s}#photo{view-transition-name:photo;width:180px;height:180px;background:navy}</style><div id="photo"></div>')
   const supported=await page.evaluate(()=>typeof document.startViewTransition==='function')
   if(!supported){console.log(JSON.stringify({name,unsupported:true}));await page.close();break}
   await page.evaluate(()=>{window.started=performance.now();window.transition=document.startViewTransition(()=>document.querySelector('#photo').style.width='300px');return window.transition.ready})
   if(resize)await page.setViewportSize({width:390,height:844})
   const result=await page.evaluate(async()=>{await window.transition.finished;return {elapsed:Math.round(performance.now()-window.started),remainingAnimations:document.getAnimations().filter(a=>a.effect?.pseudoElement).length}})
   console.log(JSON.stringify({name,resize,requestedDuration:1000,...result}));await page.close()
  }
 }finally{await browser.close()}
}
