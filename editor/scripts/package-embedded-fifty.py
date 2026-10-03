#!/usr/bin/env python3
"""Validate every MP4 and package an offline, searchable, numbered viewing gallery."""
import json,hashlib,subprocess,html,zipfile,concurrent.futures,os,bisect
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(os.environ.get('OUT','/Users/ryosuzuki/Storage/outputs/quest-spatial-studio/2026-10-02/embedded-fifty'))
C=json.loads((P/'catalog.json').read_text());assert len(C)==50
S=json.loads((Path(__file__).resolve().parents[1]/'sessions/quest-215403/session.json').read_text());TIMES=[f['t'] for f in S['frames']]
(P/'thumbs').mkdir(exist_ok=True)
def validate(c):
 p=P/(c['slug']+'.mp4');subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],check=True,capture_output=True)
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]));v=info['streams'][0]
 frames=json.loads((P/(c['slug']+'-frame-map.json')).read_text());assert int(v['nb_frames'])==len(frames)==round(c['duration']*10)
 assert v['width']==v['height']==960 and all(f['capture']=='20261002_215403' for f in frames)
 for j,f in enumerate(frames):
  assert abs(f['localTime']-j/10)<1e-6
  assert f['sourceFrame']==bisect.bisect_right(TIMES,c['start']+j/10*c['sourceSpeed'])-1, (c['slug'],j,'stale export mapping')
  assert abs(f['sourceTime']-TIMES[f['sourceFrame']])<1e-6
 assert len({f['sourceFrame'] for f in frames})>5
 im=Image.open(P/'posters'/(c['slug']+'-50.png')).convert('RGB');im.thumbnail((480,480));im.save(P/'thumbs'/(c['slug']+'.jpg'),quality=87)
 return {'id':c['id'],'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'frames':len(frames),'uniqueSourceFrames':len({f['sourceFrame'] for f in frames}),'duration':float(info['format']['duration']),'decode':'pass'}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:R=list(ex.map(validate,C))
(P/'video-validation.json').write_text(json.dumps({'source':'20261002_215403','verified':len(R),'videos':R},indent=2))
(P/'sha256sums.txt').write_text(''.join(r['sha256']+'  '+r['file']+'\n' for r in R))
style='''*{box-sizing:border-box}body{margin:0;background:#101713;color:#edf4ef;font:15px system-ui}header{padding:48px 5vw 25px;max-width:1100px}h1{font-size:clamp(32px,5vw,62px);line-height:1.04;letter-spacing:-2px}p{line-height:1.6}small{color:#abc3b4}nav{position:sticky;top:0;background:#101713ed;padding:15px 5vw;z-index:4;display:flex;gap:12px}input,select{background:#21372b;color:white;border:1px solid #42674f;padding:12px;border-radius:8px;font:inherit}input{flex:1}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:28px;padding:25px 5vw 60px}article{background:#18231c;border-radius:14px;overflow:hidden}video{width:100%;aspect-ratio:1;background:black;display:block}.info{padding:19px}.id{color:#8cddb4;font-size:12px;letter-spacing:2px}h2{font-size:21px}a{color:#b6e5ca}.tags{font-size:12px;color:#99b7a5}footer{padding:30px 5vw}.hidden{display:none}'''
parts=['<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>50 ways a room can respond</title><style>'+style+'</style>',
'<header><small>RECORDED REALITY / 50 EMBEDDED AR STUDIES</small><h1>One room.<br>Fifty possible futures.</h1><p>Fifty distinct video prototypes on the same Quest recording: words that live on walls, shelves that reveal what matters, objects that respond, and spatial plans made visible.</p><small>Take 20261002_215403 · clean AR composites · no old home-video footage. Some shots use disclosed slow replay. These are authored scenarios, not a live autonomous system.</small><p><a href="embedded-fifty-reel.mp4">Play the complete numbered reel</a> · <a href="README.md">Read provenance and limitations</a></p></header>',
'<nav><input id="q" placeholder="Search ideas, surfaces or research"><select id="surface"><option value="">All surfaces</option>'+''.join('<option>'+s+'</option>' for s in sorted(set(c['surface'] for c in C)))+'</select></nav><main class="grid">']
for c in C:
 esc=lambda s:html.escape(str(s),quote=True)
 parts.append(f'<article data-surface="{c["surface"]}" data-search="{esc(" ".join([c["title"],c["story"],c["inspiration"],c["surface"]])).lower()}"><video controls playsinline preload="none" poster="thumbs/{c["slug"]}.jpg" src="{c["slug"]}.mp4"></video><div class="info"><span class="id">{c["id"]:02d} / {c["surface"].upper()}</span><h2>{esc(c["title"])}</h2><p>{esc(c["story"])}</p><p class="tags">{esc(c["inspiration"])}</p><small>{esc(c["eventBasis"])}<br>Source speed {c["sourceSpeed"]}×</small><p><a download href="{c["slug"]}.mp4">Download video</a></p></div></article>')
parts.append('''</main><footer>Independently produced with the Quest recording editor. No coordination with Home MacBook Air's Codex. The original private recording is preserved. Owning skill: research-arvideo.</footer><script>const q=document.querySelector('#q'),s=document.querySelector('#surface');function filter(){for(const a of document.querySelectorAll('article'))a.classList.toggle('hidden',!(a.dataset.search.includes(q.value.toLowerCase())&&(!s.value||a.dataset.surface===s.value)));}q.oninput=filter;s.onchange=filter;document.addEventListener('play',e=>{if(e.target.tagName==='VIDEO')for(const v of document.querySelectorAll('video'))if(v!==e.target)v.pause();},true);</script>''')
(P/'index.html').write_text('\n'.join(parts))
(P/'README.md').write_text('# 50 Embedded AR Video Prototypes\n\nUnzip this folder and open **index.html**. Search, filter and play 50 individual clips. The numbered reel provides a complete overview.\n\nEvery background comes from Quest recording **20261002_215403**, paired with its calibrated camera pose. Static augmentation uses seven manually selected world-space surfaces. Highlights on shelf cells are authored, not automatic segmentation. Bottle masks track visible green pixels only; depth-lifted trajectories are approximate, not 6DoF. Hand state is recorded SDK data with unresolved exact RGB alignment.\n\nNotifications, speech, inventory, weather, device data and robot plans are **illustrative authored events**. No live AI, ASR, clap detection, autonomous agent or real appliance control is implied. Generated botanical and winter imagery are disclosed synthetic assets. Videos are silent. The browser editor supports selecting, seeking and replaying scenarios.\n\nSome intervals are slowed (see each card), retaining the same RGB/pose association. Export is 10 fps; source is roughly 9.61 Hz and depth roughly 5 Hz. Coarse occlusion and physical registration are not production-validated.\n\nSources: NSF CAREER local proposal; archived AR+AI Grand Challenges 2026-09-10 proof (not a fresh submitted-file check); RealityTalk, RealitySketch and RealityCanvas project pages; owner mockup-1-ja brief.\n\nSource code: https://github.com/ryosuzuki/quest-spatial-studio/tree/main/editor . Owning skill: research-arvideo.\n\nAll 50 videos fully decode; video-validation.json and sha256sums.txt retain verification. Each numbered JSON maps output frames to source RGB frames and timestamps.\n')
# Contact sheets are visual indexes, not substitutes for video inspection.
for g in range(5):
 im=Image.new('RGB',(1500,680),(16,23,19));d=ImageDraw.Draw(im)
 for j,c in enumerate(C[g*10:g*10+10]):
  tile=Image.open(P/'thumbs'/(c['slug']+'.jpg')).resize((300,300));xx=j%5*300;yy=j//5*340;im.paste(tile,(xx,yy));d.text((xx+8,yy+309),f'{c["id"]:02d} {c["title"]}',fill='white')
 im.save(P/f'contact-sheet-{g+1}.jpg',quality=90)
print('DECODE AND FRAME-MAP PASS',len(R))
