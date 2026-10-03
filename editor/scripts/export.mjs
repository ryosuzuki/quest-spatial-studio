// Offline deterministic renderer. The background and pose always share a source frame.
import {chromium} from 'playwright';import {mkdir,writeFile,readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import path from 'node:path';
const [session='sessions/demo/session.json',out='exports/demo',placementFile]=process.argv.slice(2);const fps=30;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{const page=await browser.newPage({viewport:{width:1280,height:900}});await page.goto('http://127.0.0.1:8766/?session='+encodeURIComponent(session));await page.waitForFunction(()=>window.replay?.ready||window.replay?.error);const err=await page.evaluate(()=>window.replay.error);if(err)throw Error(err);
if(placementFile){const p=JSON.parse(await readFile(placementFile,'utf8'));await page.evaluate(async p=>window.replay.loadPlacement(p),p);}
const metadata=await page.evaluate(()=>({duration:window.replay.session.duration,synthetic:window.replay.session.synthetic,audio:window.replay.session.audio}));let mapping=[];
for(let i=0;i<Math.ceil(metadata.duration*fps);i++){const t=i/fps;const result=await page.evaluate(async t=>{await window.replay.at(t);const s=window.replay.session;const j=s.frames.findLastIndex(f=>f.t<=t);return {png:document.querySelector('canvas').toDataURL('image/png').split(',')[1],sourceTimestampUs:s.frames[Math.max(j,0)].timestampUs};},t);await writeFile(path.join(out,`${String(i).padStart(6,'0')}.png`),Buffer.from(result.png,'base64'));mapping.push({outputFrame:i,t,sourceTimestampUs:result.sourceTimestampUs});}
await page.screenshot({path:path.join(out,'editor.png'),fullPage:true});
await writeFile(path.join(out,'export.json'),JSON.stringify({...metadata,fps,mapping},null,2));
const args=['-v','error','-y','-framerate',String(fps),'-i',path.join(out,'%06d.png')];
if(metadata.audio){
  const offset=metadata.audio.startRelativeToVideoSeconds;
  args.push('-i',path.resolve(path.dirname(session),metadata.audio.file));
  const alignment=offset<0?`atrim=start=${-offset},asetpts=PTS-STARTPTS`:`adelay=${Math.round(offset*1000)}:all=1`;
  args.push('-filter_complex',`[1:a]${alignment},apad[a]`,'-map','0:v','-map','[a]','-c:a','aac','-shortest');
}
args.push('-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-movflags','+faststart',path.join(out,'replay.mp4'));
const r=spawnSync('ffmpeg',args,{stdio:'inherit'});if(r.status)throw Error('ffmpeg failed');console.log(JSON.stringify({frames:mapping.length,synthetic:metadata.synthetic,video:path.join(out,'replay.mp4')}));
}finally{await browser.close();}
