#!/usr/bin/env python3
"""Validate recorded output, never infer success from mere file presence."""
import csv, json, pathlib, sys, subprocess

def validate(path):
    p=pathlib.Path(path); result={}; errors=[]
    for side in ('left','right'):
        video=p/f'{side}_camera.mp4'
        if not video.exists(): continue
        status=json.loads(pathlib.Path(str(video)+'.status.json').read_text())
        packets=list(csv.DictReader(pathlib.Path(str(video)+'.packets.csv').open()))
        meta=list(csv.DictReader((p/f'{side}_camera_mruk_frame_metadata.csv').open()))
        pts=[int(x['pts_us']) for x in packets]
        expected={int(x['timestamp_us_realtime'])-status['originCameraUs'] for x in meta if x['file_name']==video.name}
        if not status['complete'] or status['error']: errors.append(f'{side}: encoder incomplete/error')
        if not pts or any(b<=a for a,b in zip(pts,pts[1:])): errors.append(f'{side}: empty or nonmonotonic packet PTS')
        if set(pts)!=expected: errors.append(f'{side}: packet/metadata PTS mismatch')
        if len(pts)!=status['encoded'] or status['accepted']!=status['encoded']: errors.append(f'{side}: frame count mismatch')
        subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],check=True,capture_output=True)
        result[side]={'frames':len(pts),'measuredFps':(len(pts)-1)*1e6/(pts[-1]-pts[0]) if len(pts)>1 else 0,'queueDropped':status['queueDropped']}
    if not result: errors.append('No videos')
    samples=[json.loads(x) for x in (p/'hands.jsonl').read_text().splitlines() if x]
    result['handSamples']=len(samples)
    for side in ('left','right'):
        tracked=[x[side] for x in samples if x[side]['valid'] and x[side]['tracked'] and x[side].get('boneRotations')]
        result[side+'TrackedSamples']=len(tracked)
        if not tracked: errors.append(side+': no tracked hand joints')
    room=p/'room-scan.json'
    if not room.exists(): errors.append('No room export')
    else:
        data=json.loads(room.read_text()); result['roomTopLevelKeys']=list(data)
        rooms=data.get('Rooms',data.get('rooms',[]))
        result['roomCount']=len(rooms)
        if not rooms:errors.append('Room export has no rooms')
    result['errors']=errors;result['passed']=not errors
    return result
if __name__=='__main__':
    try:
        r=validate(sys.argv[1]);print(json.dumps(r,indent=2));sys.exit(0 if r['passed'] else 1)
    except Exception as e:
        print(json.dumps({'passed':False,'error':str(e)}));sys.exit(1)
