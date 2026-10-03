from pathlib import Path
import json,subprocess,hashlib,math
R=Path('/Users/ryosuzuki/Storage/outputs/embedded-ar-inspiration/2026-10-03');P=Path('/Users/ryosuzuki/Storage/projects/quest-spatial-studio-codex-50/editor');cat=json.loads((R/'catalog.json').read_text());session=json.loads((P/'sessions/quest-215403/session.json').read_text());anchors=json.loads((R/'anchors.json').read_text());items=[]
assert len(cat)==50 and len({s['effect'] for s in cat})==50
for s in cat:
 n=f"{s['id']:02d}-{s['slug']}";v=R/(n+'.mp4');logs=json.loads((R/(n+'-frames.json')).read_text());assert len(logs)==round(s['duration']*20)
 for k,x in enumerate(logs):
  f=session['frames'][x['sourceFrame']];assert x['capture']=='20261002_215403' and x['sourceTime']==f['t'];assert abs(x['outputTime']-k/20)<1e-7;assert x['sourceTime']<=s['start']+x['outputTime']+1e-7
  if s['target']!='bottle':assert x['anchor']==anchors[s['target']]
 p=json.loads(subprocess.check_output(['/opt/homebrew/bin/ffprobe','-v','error','-show_entries','format=duration:stream=width,height,nb_frames,r_frame_rate','-of','json',str(v)]));stream=p['streams'][0];assert stream['width']==900 and stream['height']==900 and stream['r_frame_rate']=='20/1';assert abs(float(p['format']['duration'])-s['duration'])<.08
 subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-i',str(v),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 it={'id':s['id'],'file':v.name,'duration':float(p['format']['duration']),'frames':len(logs),'unique_source_frames':len({x['sourceFrame'] for x in logs}),'complete_decode':True,'fixed_anchor':s['target']!='bottle'}
 if s['id'] in [27,29]:
  values=[x['hand']['separation'] for x in logs if x['hand']['valid']];assert len(values)>len(logs)*.8 and max(values)-min(values)>.1;it['recorded_hand']={'valid_frames':len(values),'min_separation_m':min(values),'max_separation_m':max(values)}
 if s['target']=='bottle':
  count=sum(x['bottleTracked'] for x in logs);assert count>len(logs)*.9;it['bottle_track_frames']=count
 items.append(it);print('Verified',s['id'],flush=True)
subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-i',str(R/'all-50-sequential.mp4'),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
result={'capture':session['name'],'studies':50,'total_seconds':sum(x['duration'] for x in items),'output_fps':20,'source_total_frames':len(session['frames']),'source_duration_seconds':session['frames'][-1]['t'],'all_full_decodes_passed':True,'camera_frame_pairing_checked':True,'world_anchor_identity_checked':True,'all_midpoint_images_visually_inspected':True,'quantitative_physical_registration':'not measured','live_recognition':'not implemented','items':items}
(R/'verification.json').write_text(json.dumps(result,indent=2))
# Hash all shipped media and user-facing records; exclude the manifest itself.
files=[p for p in R.iterdir() if p.is_file() and (p.suffix in ['.mp4','.jpg'] or p.name in ['index.html','catalog.json','study-plan-en.txt','workflow-and-handoff-en.txt','verification.json','provenance.json','anchors.json'] or p.name.endswith('-frames.json'))]
(R/'sha256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)},indent=2))
