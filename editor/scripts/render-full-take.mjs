import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {catalog} from '../src/full-take-catalog.mjs';
const out='/Users/ryosuzuki/Storage/outputs/quest-spatial-studio/2026-10-03/full-take-fifty';
await mkdir(out+'/qa',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-angle=metal']});
const p=await browser.newPage({viewport:{width:1050,height:700}}),errors=[];p.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
await p.goto('http://127.0.0.1:8847/full-take.html');await p.waitForFunction(()=>window.fullTakeFiftyReady,{},{timeout:90000});
const anchors=await p.evaluate(()=>Object.fromEntries(Object.entries(fullTakeFifty.surfaces).map(([k,s])=>[k,s.vertices])));
await writeFile(out+'/catalog.json',JSON.stringify(catalog,null,2));await writeFile(out+'/anchors.json',JSON.stringify(anchors,null,2));
const ids=process.env.IDS?process.env.IDS.split(',').map(Number):catalog.map(c=>c.id);
if(process.argv.includes('--preview')){
 for(const id of ids)for(const t of [4,16,34,44,47,52,56,66,82,90]){
  const r=await p.evaluate(async({id,t})=>{const f=await fullTakeFifty.render(id,t);return {f,png:document.querySelector('#output').toDataURL('image/png').split(',')[1]}},{id,t});
  assert.deepEqual(r.f.staticAnchors,anchors);await writeFile(`${out}/qa/${String(id).padStart(2,'0')}-${t}.png`,Buffer.from(r.png,'base64'));
 }console.log('PREVIEW',ids);await browser.close();process.exit(0);
}
const maps=[],results=[];
for(const id of ids){
 const c=catalog[id-1],file=out+'/'+c.slug+'.mp4';
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate','10','-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',file],{stdio:['pipe','ignore','inherit']});
 const done=new Promise((res,rej)=>ff.once('close',c=>c?rej(Error('ffmpeg '+c)):res()));
 const map=[];const start=Date.now();
 for(let j=0;j<952;j++){
  const r=await p.evaluate(async({id,t})=>{const f=await fullTakeFifty.render(id,t);return {sourceFrame:f.sourceFrame,sourceTime:f.sourceTime,timestampUs:f.timestampUs,jpeg:document.querySelector('#output').toDataURL('image/jpeg',.9).split(',')[1]}},{id,t:j/10});
  if([40,160,340,440,470,520,560,660,820,900].includes(j))await writeFile(`${out}/qa/${String(id).padStart(2,'0')}-${j/10}.jpg`,Buffer.from(r.jpeg,'base64'));
  map.push({outputFrame:j,outputTime:j/10,sourceFrame:r.sourceFrame,sourceTime:r.sourceTime,timestampUs:r.timestampUs});
  if(!ff.stdin.write(Buffer.from(r.jpeg,'base64')))await new Promise(r=>ff.stdin.once('drain',r));
  if(j%200===0)console.log('FRAME',id,j,Math.round((Date.now()-start)/1000));
 }
 ff.stdin.end();await done;assert.equal(errors.length,0);
 await writeFile(out+'/'+c.slug+'-frame-map.json',JSON.stringify(map));
 results.push({id,file,seconds:(Date.now()-start)/1000,frames:952});await writeFile(out+'/render-status-'+(process.env.PART||'pilot')+'.json',JSON.stringify({results,errors}));console.log('DONE',id,results.at(-1).seconds);
}
await browser.close();
