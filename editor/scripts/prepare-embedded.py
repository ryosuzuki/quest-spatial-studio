from pathlib import Path
import ast,json,shutil,cv2,numpy as np
root=Path(__file__).resolve().parents[1]
old=Path('/Users/ryosuzuki/Storage/outputs/videos/2026-10-02/object-anchored-ar')
base=old.parent/'ar-home-full-v1'/'segments';out=root/'private'/'embedded';out.mkdir(parents=True,exist_ok=True)
# Reuse the existing image-plane tracker without executing its export pipeline.
tree=ast.parse((old/'render.py').read_text());node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='track');exec(compile(ast.Module(body=[node],type_ignores=[]),'tracker','exec'))
scenes=[]
for sid,title in [('28-fridge','Refrigerator'),('07-storage','Shelves & bins'),('06-laundry','Washing machine')]:
 d=json.loads((old/(sid+'-tracks.json')).read_text());s=d['scene'];s['title']=title;s['tracks']=d['objects'];scenes.append(s)
scenes += [dict(id='05-supplies',title='Drawer & supplies',ref=60,lo=35,hi=125,objects=[dict(name='DRAWER',info='Household essentials',poly=[[144,131],[610,142],[597,255],[179,259]],quad=[[236,170],[521,177],[516,224],[241,220]],roi=[120,115,627,274],color=[126,223,214])]),dict(id='03-wall-agents',title='Wall agent',ref=60,lo=35,hi=125,objects=[dict(name='AGENT',info='Your brief is ready',poly=[[135,270],[370,270],[370,370],[135,370]],quad=[[135,270],[370,270],[370,370],[135,370]],roi=[100,100,435,550],color=[130,219,240])])]
for s in scenes:
 sid=s['id'];dest=out/sid;dest.mkdir(exist_ok=True)
 if 'tracks' not in s:
  fs=[cv2.imread(str(base/sid/'frames'/f'{i:05}.jpg')) for i in range(s['lo'],s['hi'])];s['tracks']=[track(fs,s['ref']-s['lo'],o) for o in s['objects']]
 for i,ob in enumerate(s['objects']):
  ob['kind']='progress' if sid=='06-laundry' else 'label';ob['value']=.62;ob['enabled']=ob['name']!='GREENS';ob['detail']='Illustrative status — click to acknowledge' if sid=='03-wall-agents' else 'Illustrative contents — editable';ob['action']='Acknowledge' if sid=='03-wall-agents' else 'Mark checked';ob['track']=i;ob['id']=sid+'-'+str(i)
 for i,srcidx in enumerate(range(s['lo'],s['hi'])):shutil.copyfile(base/sid/'frames'/f'{srcidx:05}.jpg',dest/f'{i:05}.jpg')
 s['fps']=30;s['count']=s['hi']-s['lo'];s['reference']=s['ref']-s['lo'];s['frames']='./private/embedded/'+sid+'/'
 print(sid,[sum(v is not None for v in t) for t in s['tracks']],flush=True)
(out/'project.json').write_text(json.dumps(dict(version=1,scenes=scenes)))
