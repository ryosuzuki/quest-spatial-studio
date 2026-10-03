#!/usr/bin/env python3
"""Strict QuestRealityCapture v1.5 MRUK -> calibrated, frame-indexed replay."""
import argparse, csv, json, math
from pathlib import Path
from PIL import Image

def intrinsics(meta, w, h):
    # Mirrors MRUK 203 PassthroughCameraAccess.CalcSensorCropRegion, not a naive resize.
    sw, sh = meta['sensorResolution']['width'], meta['sensorResolution']['height']
    if min(sw, sh, w, h) <= 0: raise ValueError('Invalid sensor/frame dimensions')
    scale = max(w / sw, h / sh)
    cw, ch = w / scale, h / scale
    ox, oy = (sw-cw)/2, (sh-ch)/2
    fx, fy = meta['focalLength']['x']*scale, meta['focalLength']['y']*scale
    cx = (meta['principalPoint']['x']-ox)*scale
    cy = h-(meta['principalPoint']['y']-oy)*scale
    if not all(math.isfinite(v) for v in [fx,fy,cx,cy]) or min(fx,fy)<=0: raise ValueError('Invalid intrinsics')
    return dict(fx=fx, fy=fy, cx=cx, cy=cy, width=w, height=h)

def good(v): return str(v).lower() in ('true','1')

def convert(source, dest, eye='left', row_order='bottom-up', synthetic=False):
    source, dest = Path(source), Path(dest)
    info=json.loads((source/'session_info.json').read_text())
    if info.get('captureBackend') != 'MRUK': raise ValueError('MRUK only; Camera2 needs a separate clock/extrinsics adapter')
    meta=json.loads((source/f'{eye}_camera_mruk_intrinsics.json').read_text())
    if meta.get('error'): raise ValueError('Recorder intrinsics error: '+meta['error'])
    with (source/f'{eye}_camera_mruk_frame_metadata.csv').open(newline='') as stream:
        rows=list(csv.DictReader(stream))
    if not rows: raise ValueError('No frames')
    accepted=[]; rejected=[]; prev=-1; size=None
    for i,r in enumerate(rows):
        reason=''
        try:
            if r.get('error'): raise ValueError(r['error'])
            for flag in ['pose_ok','is_playing','get_texture_ok','get_colors_ok']:
                if not good(r.get(flag)): raise ValueError(flag+' false')
            ts=int(r['timestamp_us_realtime']); w=int(r['width']); h=int(r['height'])
            if ts<=prev: raise ValueError('Non-increasing timestamp')
            if min(w,h)<=0 or w*h>20000000: raise ValueError('Invalid frame dimensions')
            name=r['file_name']
            if Path(name).name!=name or not name.endswith('.rgba'): raise ValueError('Unsafe/invalid frame filename')
            p=source/f'{eye}_camera_mruk_rgba'/name
            if p.stat().st_size!=w*h*4: raise ValueError('RGBA byte count mismatch')
            pos=[float(r['pose_pos_'+a]) for a in 'xyz']; q=[float(r['pose_rot_'+a]) for a in 'xyzw']
            if not all(math.isfinite(v) for v in pos+q): raise ValueError('Non-finite pose')
            norm=math.sqrt(sum(v*v for v in q))
            if abs(norm-1)>.02: raise ValueError('Invalid quaternion norm')
            if size and size!=(w,h): raise ValueError('Resolution changed: split recording')
            size=(w,h); prev=ts
            accepted.append((ts,p,pos,[v/norm for v in q]))
        except (ValueError,KeyError,OSError) as e: reason=str(e)
        if reason: rejected.append(dict(row=i,reason=reason))
    if not accepted: raise ValueError('No valid image+pose pairs: '+str(rejected[:3]))
    if dest.exists() and any(dest.iterdir()): raise ValueError('Destination must be empty (preserve prior sessions)')
    dest.mkdir(parents=True,exist_ok=True); (dest/'frames').mkdir()
    w,h=size; frames=[]; start=accepted[0][0]
    for i,(ts,p,pos,q) in enumerate(accepted):
        im=Image.frombytes('RGBA',(w,h),p.read_bytes())
        if row_order=='bottom-up': im=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        im.convert('RGB').save(dest/'frames'/f'{i:06d}.png')
        # Unity world -> Three world via reflection S=diag(1,1,-1).
        frames.append(dict(t=(ts-start)/1e6,timestampUs=str(ts),image=f'frames/{i:06d}.png',position=[pos[0],pos[1],-pos[2]],quaternion=[-q[0],-q[1],q[2],q[3]]))
    gaps=[b['t']-a['t'] for a,b in zip(frames,frames[1:])]
    median=sorted(gaps)[len(gaps)//2] if gaps else .1
    manifest=dict(version=1,name=source.name,synthetic=synthetic,coordinateSystem='three-rh-y-up-meters-camera-minus-z',imageOrigin='top-left',sourceRowOrder=row_order,intrinsics=intrinsics(meta,w,h),frames=frames,duration=frames[-1]['t']+median,report=dict(accepted=len(frames),rejected=rejected,maxGapSeconds=max(gaps,default=0),medianGapSeconds=median),calibrationStatus='synthetic-ground-truth' if synthetic else 'requires-physical-reprojection-test')
    (dest/'session.json').write_text(json.dumps(manifest,indent=2))
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('source');p.add_argument('destination');p.add_argument('--eye',choices=['left','right'],default='left');p.add_argument('--row-order',choices=['bottom-up','top-down'],required=True,help='Verify orientation against an asymmetric target; GPU backend may differ.')
    a=p.parse_args(); m=convert(a.source,a.destination,a.eye,a.row_order);print(json.dumps(m['report'],indent=2))
