import json,subprocess,time,hashlib,zipfile,html
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
root=Path('/Users/ryosuzuki/Storage/outputs/quest-spatial-studio/2026-10-03/full-take-fifty')
review=root/'review';review.mkdir(exist_ok=True)
cat=json.loads((root/'catalog.json').read_text())
session=json.loads(Path('/Users/ryosuzuki/Storage/projects/quest-spatial-studio/editor/sessions/quest-215403/session.json').read_text())
from bisect import bisect_right
expected=[bisect_right([f['t'] for f in session['frames']], j/10 if j<951 else session['frames'][-1]['t'])-1 for j in range(952)]
def run(args):return subprocess.run(args,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout
records=[]
def process(c):
 slug=c['slug'];src=root/(slug+'.mp4');dst=review/(slug+'.mp4')
 m=json.loads((root/(slug+'-frame-map.json')).read_text())
 assert len(m)==952
 assert [f['sourceFrame'] for f in m]==expected,slug
 for row in m: assert row['timestampUs']==session['frames'][row['sourceFrame']]['timestampUs']
 run(['ffmpeg','-v','error','-i',str(src),'-f','null','-'])
 run(['ffmpeg','-y','-v','error','-i',str(src),'-an','-c:v','libx264','-preset','fast','-crf','28','-pix_fmt','yuv420p','-movflags','+faststart',str(dst)])
 run(['ffmpeg','-v','error','-i',str(dst),'-f','null','-'])
 probe=json.loads(run(['ffprobe','-v','error','-show_streams','-of','json',str(dst)]))['streams'][0]
 assert probe['nb_frames']=='952' and abs(float(probe['duration'])-95.2)<.001
 run(['ffmpeg','-y','-v','error','-ss','16','-i',str(dst),'-frames:v','1',str(review/(slug+'.jpg'))])
 r={'id':c['id'],'slug':slug,'frames':952,'duration':95.2,'sourceFirst':0,'sourceLast':914,'masterBytes':src.stat().st_size,'reviewBytes':dst.stat().st_size,'masterSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'reviewSha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'fullDecode':True,'exactFrameMapping':True}
 return r
pending={c['id']:c for c in cat};inflight={}
with ThreadPoolExecutor(max_workers=2) as pool:
 while pending or inflight:
  for i,c in list(pending.items()):
   if (root/(c['slug']+'-frame-map.json')).exists():inflight[i]=pool.submit(process,c);del pending[i]
  for i,f in list(inflight.items()):
   if f.done():
    records.append(f.result());del inflight[i]
    (root/'verification.json').write_text(json.dumps(sorted(records,key=lambda r:r['id']),indent=2));print('VERIFIED',i,len(records),flush=True)
  if pending or inflight:time.sleep(2)
assert len(records)==50
cards=''.join(f'''<button class="card" data-index="{c['id']-1}" data-search="{html.escape((c['title']+' '+c['mode']+' '+c['story']).lower())}"><img loading="lazy" src="{c['slug']}.jpg"><span class="num">{c['id']:02} · 1:35</span><h2>{html.escape(c['title'])}</h2><p>{html.escape(c['story'])}</p></button>''' for c in cat)
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Gen AR · 50 whole-take worlds</title>
<style>*{box-sizing:border-box}body{background:#101916;color:#ecf5ed;font:16px system-ui;margin:0}header,main{max-width:1320px;margin:auto;padding:32px}header{padding-top:55px}h1{font-size:clamp(32px,5vw,65px);letter-spacing:-2px;margin:12px 0}p{color:#adc3b6;line-height:1.6}.eyebrow,.num{color:#a1dcb5;font-size:13px;letter-spacing:2px}input{width:100%;padding:17px;font:inherit;border:1px solid #426451;border-radius:12px;background:#1d2b23;color:white}#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:22px}.card{text-align:left;border:1px solid #30483a;border-radius:18px;padding:14px;background:#18261e;color:white;cursor:pointer}.card:hover{border-color:#a1dcb5;transform:translateY(-2px)}img{width:100%;border-radius:9px}h2{font-size:21px}.card p{font-size:13px}.num{display:block;margin-top:12px}dialog{background:#16251d;color:white;border:1px solid #557b61;border-radius:18px;width:min(960px,95vw)}dialog::backdrop{background:#000d}video{display:block;width:min(100%,70vh);margin:auto;max-height:70vh}dialog button,a{background:#284633;border:0;color:white;padding:12px 18px;border-radius:8px;cursor:pointer;text-decoration:none}nav{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}small{color:#9db7a7}.hide{display:none}</style>
<header><div class="eyebrow">GEN AR · WHOLE-TAKE COLLECTION</div><h1>One room. Fifty worlds.</h1><p>50 themes × 95.2 seconds. The same uninterrupted Quest recording, from first exposure to last.<br>Each world carries a four-beat story across the room. These are authored AR video prototypes, not live AI.</p><input id="search" placeholder="Search a theme — music, physics, dinner, garden…"><p id="count">50 experiences · 79 min 20 sec total</p></header><main id="grid">'''+cards+'''</main><dialog id="viewer"><h2 id="name"></h2><video id="video" controls playsinline preload="metadata"></video><p id="story"></p><nav><button id="previous">← Previous</button><button id="next">Next →</button><a id="download" download>Download MP4</a><button id="close">Close</button></nav><p><small>Calibrated camera replay · coarse recorded-depth occlusion · authored scenarios · silent</small></p></dialog><script>
const catalog='''+json.dumps(cat)+''';let current=0;const el=id=>document.getElementById(id);function show(i){current=(i+50)%50;let c=catalog[current];el('name').textContent=String(c.id).padStart(2,'0')+' · '+c.title;el('story').textContent=c.story;el('video').src=c.slug+'.mp4';el('download').href=c.slug+'.mp4';if(!el('viewer').open)el('viewer').showModal();}document.querySelectorAll('.card').forEach(b=>b.onclick=()=>show(+b.dataset.index));el('search').oninput=e=>{let n=0;document.querySelectorAll('.card').forEach(b=>{let yes=b.dataset.search.includes(e.target.value.toLowerCase());b.classList.toggle('hide',!yes);n+=yes;});el('count').textContent=n+' experiences';};el('previous').onclick=()=>show(current-1);el('next').onclick=()=>show(current+1);el('close').onclick=()=>el('viewer').close();el('viewer').onclose=()=>el('video').pause();</script></html>'''
(review/'index.html').write_text(page)
(review/'catalog.json').write_text(json.dumps(cat,indent=2))
(review/'README.txt').write_text('Gen AR — 50 whole-take video prototypes\n\nOpen index.html in a browser, or play any numbered MP4. Every film preserves 0–95.111 seconds of Quest take 20261002_215403 at 1x, encoded as 952 frames / 95.2 seconds at 10fps. Resampling is not increased sensor fidelity. English surface text, silent. Each theme uses authored effects and four story beats, not live AI or appliance sensing. Static manually authored planes and coarse depth can produce registration and hand-occlusion artifacts. No recovered moving-object 6DoF or validated live gesture interaction is claimed. Original 50 short studies and Arena were not replaced.\n')
zip_path=root/'gen-ar-fifty-full-take-videos.zip'
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_STORED) as z:
 for f in review.iterdir():z.write(f,'gen-ar-full-take/'+f.name)
print('PACKAGED',zip_path.stat().st_size,flush=True)
# Standalone ten-film bundles fit the current Slack attachment limit.
import re
for batch in range(5):
 rows=cat[batch*10:batch*10+10]
 s=page.replace(json.dumps(cat),json.dumps(rows)).replace('(i+50)%50','(i+10)%10')
 start=s.index('<main id="grid">');end=s.index('</main>',start)
 cards=re.findall(r'<button class="card".*?</button>',s[start:end],re.S)[batch*10:batch*10+10]
 cards=[re.sub(r'data-index="\d+"',f'data-index="{j}"',c) for j,c in enumerate(cards)]
 s=s[:start]+'<main id="grid">'+''.join(cards)+s[end:]
 s=s.replace('50 experiences · 79 min 20 sec total',f'Part {batch+1}/5 · 10 experiences · 15 min 52 sec').replace('<h1>One room. Fifty worlds.</h1>',f'<h1>One room. Fifty worlds.</h1><p>Part {batch+1} of 5 · Themes {batch*10+1}–{batch*10+10}</p>')
 dest=root/f'gen-ar-full-take-part-{batch+1}-of-5.zip';prefix=f'gen-ar-full-take-part-{batch+1}/'
 with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_STORED) as z:
  z.writestr(prefix+'index.html',s);z.writestr(prefix+'catalog.json',json.dumps(rows,indent=2));z.write(review/'README.txt',prefix+'README.txt')
  for c in rows:
   for ext in ['.mp4','.jpg']:z.write(review/(c['slug']+ext),prefix+c['slug']+ext)
 assert dest.stat().st_size<100*1024*1024
 print('DELIVERY BUNDLE',dest.name,dest.stat().st_size)
