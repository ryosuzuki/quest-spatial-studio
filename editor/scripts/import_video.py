#!/usr/bin/env python3
"""Import Spatial Capture MP4 with verified encoded PTS, preserving frame/pose pairing."""
import argparse,csv,json,math,shutil,subprocess
from pathlib import Path
from import_mruk import intrinsics,good

def convert(source,dest,eye='left',row_order='bottom-up'):
    source,dest=Path(source),Path(dest)
    if dest.exists() and any(dest.iterdir()):raise ValueError('Destination must be empty')
    video=source/f'{eye}_camera.mp4'
    status=json.loads(Path(str(video)+'.status.json').read_text())
    if not status.get('complete') or status.get('error'):raise ValueError('Video not finalized')
    with Path(str(video)+'.packets.csv').open() as f: packets=list(csv.DictReader(f))
    with (source/f'{eye}_camera_mruk_frame_metadata.csv').open() as f: rows=list(csv.DictReader(f))
    origin=int(status['originCameraUs'])
    by_pts={int(r['timestamp_us_realtime'])-origin:r for r in rows if r['file_name']==video.name}
    pts=[int(p['pts_us']) for p in packets]
    if not pts or any(b<=a for a,b in zip(pts,pts[1:])):raise ValueError('Invalid packet timestamps')
    if set(pts)!=set(by_pts):raise ValueError('Packet/pose timestamp mismatch')
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(video)]))
    decoded=[round(float(f['best_effort_timestamp_time'])*1e6) for f in probe['frames']]
    if len(decoded)!=len(pts) or any(abs(a-b)>2 for a,b in zip(decoded,pts)):raise ValueError('MP4 decoded PTS do not match encoder packet PTS')
    dest.mkdir(parents=True,exist_ok=True);(dest/'frames').mkdir()
    cmd=['ffmpeg','-v','error','-i',str(video)]
    if row_order=='bottom-up':cmd+=['-vf','vflip']
    subprocess.run(cmd+['-fps_mode','passthrough','-start_number','0',str(dest/'frames/%06d.png')],check=True)
    files=list((dest/'frames').glob('*.png'))
    if len(files)!=len(pts):raise ValueError('Decoded image count mismatch')
    frames=[];rejected=[];size=None
    for i,t in enumerate(pts):
        r=by_pts[t]
        if r.get('error') or not all(good(r.get(k)) for k in ['pose_ok','is_playing','get_texture_ok','get_colors_ok']):
            rejected.append({'frame':i,'reason':'invalid pose/frame flags'});continue
        pos=[float(r['pose_pos_'+a]) for a in 'xyz'];q=[float(r['pose_rot_'+a]) for a in 'xyzw'];w,h=int(r['width']),int(r['height'])
        n=math.sqrt(sum(x*x for x in q))
        if not all(math.isfinite(x) for x in pos+q) or abs(n-1)>.02:raise ValueError('Invalid camera pose')
        if size and size!=(w,h):raise ValueError('Resolution changed')
        size=w,h;q=[x/n for x in q]
        frames.append(dict(t=(t-pts[0])/1e6,timestampUs=str(t+origin),image=f'frames/{i:06d}.png',position=[pos[0],pos[1],-pos[2]],quaternion=[-q[0],-q[1],q[2],q[3]]))
    if not frames:raise ValueError('No valid poses')
    gaps=[b['t']-a['t'] for a,b in zip(frames,frames[1:])];median=sorted(gaps)[len(gaps)//2] if gaps else 1/30
    meta=json.loads((source/f'{eye}_camera_mruk_intrinsics.json').read_text())
    doc=dict(version=1,name=source.name,synthetic=False,coordinateSystem='three-rh-y-up-meters-camera-minus-z',imageOrigin='top-left',sourceRowOrder=row_order,intrinsics=intrinsics(meta,*size),frames=frames,duration=frames[-1]['t']+median,report=dict(accepted=len(frames),rejected=rejected,maxGapSeconds=max(gaps,default=0),medianGapSeconds=median),calibrationStatus='requires-physical-reprojection-test')
    for name,key in [('room-geometry.json','roomGeometryFile'),('hands.jsonl','handsFile'),('spatial-capture-schema.json','captureSchemaFile'),('left-hand-skeleton.json','leftSkeletonFile'),('right-hand-skeleton.json','rightSkeletonFile')]:
        if (source/name).exists():shutil.copy2(source/name,dest/name);doc[key]=name
    if (source/'audio.wav').exists() and (source/'audio-timing.json').exists():
        timing=json.loads((source/'audio-timing.json').read_text())
        if timing.get('complete'):
            shutil.copy2(source/'audio.wav',dest/'audio.wav')
            doc['audio']={'file':'audio.wav','startRelativeToVideoSeconds':(timing['estimatedFirstSampleUnixMs']*1000-origin-pts[0])/1e6,'timingQuality':timing['timingQuality']}
    (dest/'session.json').write_text(json.dumps(doc,indent=2));return doc
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source');p.add_argument('destination');p.add_argument('--eye',default='left',choices=['left','right']);p.add_argument('--row-order',required=True,choices=['bottom-up','top-down']);a=p.parse_args();print(json.dumps(convert(a.source,a.destination,a.eye,a.row_order)['report'],indent=2))
