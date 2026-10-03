#!/usr/bin/env python3
"""Create a compact numbered viewing reel without modifying clean individual clips."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,subprocess,concurrent.futures,os
P=Path(os.environ.get('OUT','/Users/ryosuzuki/Storage/outputs/quest-spatial-studio/2026-10-02/embedded-fifty'))
T=Path('/tmp/openclaw/embedded-fifty-reel');T.mkdir(parents=True,exist_ok=True)
C=json.loads((P/'catalog.json').read_text())
font='/System/Library/Fonts/Supplemental/Arial.ttf';assert Path(font).exists()
def one(c):
 title=T/(c['slug']+'.txt');title.write_text(f'{c["id"]:02d}  {c["title"]}')
 sub=T/(c['slug']+'-sub.txt');sub.write_text(c['inspiration']+'  |  Authored video prototype')
 target=T/(c['slug']+'.mp4')
 footer=T/(c['slug']+'-footer.png');im=Image.new('RGB',(720,86),(16,23,19));draw=ImageDraw.Draw(im)
 draw.text((22,12),title.read_text(),font=ImageFont.truetype(font,24),fill='white')
 draw.text((22,55),sub.read_text(),font=ImageFont.truetype(font,15),fill=(174,217,190));im.save(footer)
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(P/(c['slug']+'.mp4')),'-loop','1','-framerate','10','-i',str(footer),'-filter_complex','[0:v]scale=720:720[v];[v][1:v]vstack=inputs=2:shortest=1[out]','-map','[out]','-t',str(c['duration']),'-an','-c:v','libx264','-threads','2','-preset','fast','-crf','24','-pix_fmt','yuv420p',str(target)],check=True)
 return target
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:files=list(ex.map(one,C))
listing=T/'concat.txt';listing.write_text(''.join("file '"+str(p)+"'\n" for p in files))
meta=T/'chapters.txt';rows=[';FFMETADATA1'];ms=0
for c in C:
 end=ms+round(c['duration']*1000);rows.extend(['[CHAPTER]','TIMEBASE=1/1000',f'START={ms}',f'END={end}',f'title={c["id"]:02d} {c["title"]}']);ms=end
meta.write_text('\n'.join(rows)+'\n')
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(listing),'-i',str(meta),'-map_metadata','1','-c','copy','-movflags','+faststart',str(P/'embedded-fifty-reel.mp4')],check=True)
subprocess.run(['ffmpeg','-v','error','-i',str(P/'embedded-fifty-reel.mp4'),'-f','null','-'],check=True)
print('REEL VERIFIED',ms/1000,'seconds',round((P/'embedded-fifty-reel.mp4').stat().st_size/1e6,1),'MB')
