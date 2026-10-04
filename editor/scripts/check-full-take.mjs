import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-angle=metal']});
const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8847/full-take.html');await p.waitForFunction(()=>window.fullTakeFiftyReady,{},{timeout:90000});
const result=await p.evaluate(async()=>{
 const results=[];for(const id of [1,6,9,11,18,28,29,41,50]){
 const a=await fullTakeFifty.render(id,16);const data=document.querySelector('#output').toDataURL();
 await fullTakeFifty.render(id,82);const b=await fullTakeFifty.render(id,16);
 const repeat=data===document.querySelector('#output').toDataURL();
 const anchored=JSON.stringify(a.staticAnchors)===JSON.stringify(b.staticAnchors);
 const last=await fullTakeFifty.render(id,95.1);
 results.push({id,repeat,anchored,last:last.sourceFrame});}
 return results;
});
for(const r of result){assert(r.repeat);assert(r.anchored);assert.equal(r.last,914);}assert.equal(errors.length,0);
await p.selectOption('#choice','6');await p.waitForTimeout(100);assert.match(await p.locator('#title').innerText(),/Room-sized instrument/);await p.locator('#seek').fill('70');await p.locator('#seek').dispatchEvent('input');await p.waitForTimeout(100);assert.match(await p.locator('#clock').innerText(),/70.0/);
await writeFile('/Users/ryosuzuki/Storage/outputs/quest-spatial-studio/2026-10-03/full-take-fifty/replay-check.json',JSON.stringify({results:result,errors,controls:true},null,2));await browser.close();console.log('PASS deterministic replay, anchors, final exposure, controls');
