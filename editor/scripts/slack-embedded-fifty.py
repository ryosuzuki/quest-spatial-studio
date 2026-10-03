#!/usr/bin/env python3
"""Size-bounded Slack derivatives; canonical 960px clips are untouched."""
from pathlib import Path
from PIL import Image
import subprocess,json,concurrent.futures,shutil,zipfile,hashlib
P=Path('/Users/ryosuzuki/Storage/outputs/quest-spatial-studio/2026-10-02/embedded-fifty');D=P/'slack-review';D.mkdir(exist_ok=True);(D/'thumbs').mkdir(exist_ok=True)
C=json.loads((P/'catalog.json').read_text())
def transcode(src,dst,size):
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(src),'-vf',f'scale={size}','-an','-c:v','libx264','-threads','2','-preset','medium','-b:v','300k','-maxrate','380k','-bufsize','600k','-pix_fmt','yuv420p','-movflags','+faststart',str(dst)],check=True)
 subprocess.run(['ffmpeg','-v','error','-i',str(dst),'-f','null','-'],check=True,capture_output=True)
def one(c):
 transcode(P/(c['slug']+'.mp4'),D/(c['slug']+'.mp4'),'640:640')
 im=Image.open(P/'thumbs'/(c['slug']+'.jpg'));im.thumbnail((320,320));im.save(D/'thumbs'/(c['slug']+'.jpg'),quality=78)
 shutil.copy2(P/(c['slug']+'-frame-map.json'),D/(c['slug']+'-frame-map.json'))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:list(ex.map(one,C))
transcode(P/'embedded-fifty-reel.mp4',P/'embedded-fifty-reel-slack.mp4','640:716')
for n in ['README.md','catalog.json','anchors.json','verification-final.json']:shutil.copy2(P/n,D/n)
h=(P/'index.html').read_text().replace('<a href="embedded-fifty-reel.mp4">Play the complete numbered reel</a> · ','').replace('clean AR composites','640px review copies · clean AR composites');(D/'index.html').write_text(h)
with (D/'README.md').open('a') as f:f.write('\n## Slack review copy\nThese 640px bitrate-limited derivatives fit the channel attachment limit. Original 960px individual videos and a 720px full reel are preserved in the canonical Storage run. The full reel is sent separately. All 50 review videos were fully decoded after compression.\n')
R=[{'id':c['id'],'file':c['slug']+'.mp4','sha256':hashlib.sha256((D/(c['slug']+'.mp4')).read_bytes()).hexdigest(),'bytes':(D/(c['slug']+'.mp4')).stat().st_size,'decode':'pass'} for c in C]
(D/'review-validation.json').write_text(json.dumps({'verified':50,'size':[640,640],'videos':R},indent=2))
z=P/'embedded-fifty-review.zip'
with zipfile.ZipFile(z,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as f:
 for q in D.rglob('*'):
  if q.is_file():f.write(q,arcname='embedded-fifty/'+str(q.relative_to(D)))
with zipfile.ZipFile(z) as f:assert f.testzip() is None;assert sum(n.endswith('.mp4') for n in f.namelist())==50
R={n:{'bytes':(P/n).stat().st_size,'sha256':hashlib.sha256((P/n).read_bytes()).hexdigest()} for n in [z.name,'embedded-fifty-reel-slack.mp4']};assert all(v['bytes']<16*1024*1024 for v in R.values());(P/'slack-delivery-hashes.json').write_text(json.dumps(R,indent=2));print('SLACK DERIVATIVES VERIFIED',json.dumps(R))
