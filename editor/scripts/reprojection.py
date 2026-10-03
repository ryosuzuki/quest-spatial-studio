#!/usr/bin/env python3
"""Evaluate observed target pixels against independently measured 3D world targets."""
import argparse,json,numpy as np
from pathlib import Path

def project(frame,k,point):
 x,y,z,w=frame['quaternion']
 R=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
 v=R.T@(np.array(point)-frame['position'])
 if v[2]>=0:raise ValueError('Target is behind camera')
 return [k['fx']*v[0]/-v[2]+k['cx'],k['cy']-k['fy']*v[1]/-v[2]]
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('session');p.add_argument('observations',help='JSON list: {frame, world:[x,y,z], pixel:[u,v]}');a=p.parse_args()
 s=json.loads(Path(a.session).read_text());obs=json.loads(Path(a.observations).read_text());errors=[]
 if not obs:raise ValueError('No observations')
 for o in obs:errors.append(float(np.linalg.norm(np.array(project(s['frames'][o['frame']],s['intrinsics'],o['world']))-o['pixel'])))
 print(json.dumps(dict(count=len(errors),medianPx=float(np.median(errors)),p95Px=float(np.percentile(errors,95)),maxPx=max(errors),synthetic=s.get('synthetic',False)),indent=2))
