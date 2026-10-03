import {chromium} from 'playwright';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const out=process.env.OUT||'/Users/ryosuzuki/Storage/outputs/quest-spatial-studio/2026-10-02/embedded-fifty';
await mkdir(out,{recursive:true});await mkdir(out+'/posters',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-angle=swiftshader']});
const p=await browser.newPage({viewport:{width:1300,height:960}}),errors=[];p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});
await p.goto(process.env.URL||'http://127.0.0.1:8819/embedded-fifty.html');await p.waitForFunction(()=>window.embeddedFiftyReady,{},{timeout:60000});
const catalog=await p.evaluate(()=>embeddedFifty.catalog);assert.equal(catalog.length,50);assert.equal(new Set(catalog.map(c=>c.effect)).size,50);
const anchors=await p.evaluate(()=>Object.fromEntries(Object.entries(embeddedFifty.surfaces).map(([k,s])=>[k,{vertices:s.vertices,normal:s.normal,sourceFrame:s.sourceFrame,sourcePixel:s.sourcePixel,depth:s.depth}])));
await writeFile(out+'/catalog.json',JSON.stringify(catalog,null,2));await writeFile(out+'/anchors.json',JSON.stringify(anchors,null,2));
const wanted=process.env.IDS?process.env.IDS.split(',').map(Number):catalog.map(c=>c.id),results=[];
for(const id of wanted){
 const c=catalog[id-1],map=[],checks=[];
 for(const frac of [.2,.5,.8]){
  const t=c.duration*frac,r=await p.evaluate(async({id,t})=>{const frame=await embeddedFifty.render(id,t);const canvas=document.querySelector('#output'),cx=canvas.getContext('2d');const drawn=cx.getImageData(0,0,960,960).data.slice();const image=canvas.toDataURL('image/png').split(',')[1];await embeddedFifty.render(id,t,{plain:true});const raw=cx.getImageData(0,0,960,960).data;let pixels=0;for(let i=0;i<raw.length;i+=4)if(Math.abs(raw[i]-drawn[i])+Math.abs(raw[i+1]-drawn[i+1])+Math.abs(raw[i+2]-drawn[i+2])>35)pixels++;return{frame,image,pixels};},{id,t});
  for(const [key,a]of Object.entries(anchors))assert.deepEqual(r.frame.staticAnchors[key],a.vertices);
  await writeFile(out+`/posters/${c.slug}-${Math.round(frac*100)}.png`,Buffer.from(r.image,'base64'));checks.push({fraction:frac,visibleOverlayPixels:r.pixels,sourceFrame:r.frame.sourceFrame});
 }
 const maxVisible=Math.max(...checks.map(x=>x.visibleOverlayPixels));assert(maxVisible>60,`No visible overlay in ${c.slug}: ${maxVisible}`);
 if(!process.argv.includes('--test-only')){
  const filename=out+'/'+c.slug+'.mp4';let exists=false;try{exists=(await stat(filename)).size>10000;}catch{}
  if(!exists||process.env.FORCE==='1'){
   const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate','10','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',filename],{stdio:['pipe','ignore','inherit']});
   const closed=new Promise((res,rej)=>ff.once('close',code=>code?rej(Error('ffmpeg '+code)):res()));
   for(let j=0;j<Math.round(c.duration*10);j++){
    const r=await p.evaluate(async({id,t})=>{const frame=await embeddedFifty.render(id,t);return {frame,jpeg:document.querySelector('#output').toDataURL('image/jpeg',.94).split(',')[1]};},{id,t:j/10});map.push(r.frame);
    if(!ff.stdin.write(Buffer.from(r.jpeg,'base64')))await new Promise(r=>ff.stdin.once('drain',r));
   }ff.stdin.end();await closed;await writeFile(out+'/'+c.slug+'-frame-map.json',JSON.stringify(map));
  }
 }
 results.push({id,slug:c.slug,checks,errors:[...errors]});await writeFile(out+'/verification-current.json',JSON.stringify({capture:'20261002_215403',anchorsInvariant:true,results,errors},null,2));console.log('VERIFIED',id,c.slug,checks.map(c=>c.visibleOverlayPixels).join(','));
}
assert.equal(errors.length,0);
// Exercise real controls without claiming microphone or network-agent integration.
await p.selectOption('#choice','3');await p.waitForTimeout(100);await p.click('#trigger');await p.waitForTimeout(250);await p.click('#play');assert.match(await p.locator('#title').innerText(),/Speech/);
await writeFile(out+'/verification-'+(process.env.IDS?'subset':'all')+'.json',JSON.stringify({capture:'20261002_215403',anchorsInvariant:true,controls:true,results,errors},null,2));
await browser.close();console.log('PASS',results.length);
