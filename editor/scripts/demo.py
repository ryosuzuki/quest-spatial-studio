"""Generate independently projected synthetic MRUK-format source, then import it."""
import csv,json,math,tempfile
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from import_mruk import convert
root=Path(__file__).resolve().parents[1]
source=Path(tempfile.mkdtemp(prefix='spatial-take-'));(source/'left_camera_mruk_rgba').mkdir()
w,h=640,480;fx=fy=500;cx=320;cy=240
(source/'session_info.json').write_text(json.dumps({'sessionFormatVersion':2,'captureBackend':'MRUK'}))
(source/'left_camera_mruk_intrinsics.json').write_text(json.dumps({'sensorResolution':{'width':w,'height':h},'focalLength':{'x':fx,'y':fy},'principalPoint':{'x':cx,'y':cy},'error':''}))
fields=['file_name','timestamp_us_realtime','width','height','pose_pos_x','pose_pos_y','pose_pos_z','pose_rot_x','pose_rot_y','pose_rot_z','pose_rot_w','pose_ok','is_playing','get_texture_ok','get_colors_ok','error']
rows=[]
for i in range(90):
    t=i/15;px=.55*math.sin(t*.9);py=.85;pz=-.1;angle=.12*math.sin(t*.7)
    # Unity coordinates, camera forward +z. Independent pinhole projection.
    R=np.array([[math.cos(angle),0,math.sin(angle)],[0,1,0],[-math.sin(angle),0,math.cos(angle)]])
    def project(p):
        v=R.T@(np.array(p)-[px,py,pz])
        if v[2]<.1:return None
        return (fx*v[0]/v[2]+cx,h-(fy*v[1]/v[2]+cy))
    im=Image.new('RGB',(w,h),'#263735');d=ImageDraw.Draw(im)
    def line(a,b,color,width=1):
        a,b=project(a),project(b)
        if a and b:d.line([a,b],fill=color,width=width)
    for x in np.arange(-5,5.1,.5):line([x,0,.5],[x,0,8],'#50645c')
    for z in np.arange(.5,8.1,.5):line([-5,0,z],[5,0,z],'#50645c')
    for x in range(-4,5):line([x,0,6],[x,3,6],'#61776d')
    for y in np.arange(0,3.1,.5):line([-4,y,6],[4,y,6],'#61776d')
    # Ground truth target where default virtual cube is placed; grid gives parallax.
    for a,b in [((-.3,0,2.5),(.3,0,2.5)),((0,0,2.2),(0,0,2.8))]:line(a,b,'#efbd76',3)
    for n,p in enumerate([(-1.1,0,3.2),(1.2,0,4),(0,.8,6)]):
        q=project(p)
        if q:d.ellipse([q[0]-6,q[1]-6,q[0]+6,q[1]+6],fill='#b8d9c8');d.text((q[0]+10,q[1]),f'TARGET {n+1}',fill='#d8e8df')
    d.text((20,20),'SYNTHETIC CAPTURE / KNOWN CAMERA TRAJECTORY',fill='#c8dacd');d.text((20,42),f'FRAME {i:03d} | {t:.2f}s',fill='#96b3a4')
    ts=1800000000000000+round(t*1e6);name=f'{ts}.rgba'
    (source/'left_camera_mruk_rgba'/name).write_bytes(im.convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes())
    rows.append(dict(zip(fields,[name,ts,w,h,px,py,pz,0,math.sin(angle/2),0,math.cos(angle/2),1,1,1,1,''])))
with (source/'left_camera_mruk_frame_metadata.csv').open('w') as f:
    writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(rows)
m=convert(source,root/'sessions/demo',synthetic=True)
# Only disposable generated source is removed; normalized demo retained.
import shutil
shutil.rmtree(source)
print(json.dumps(m['report']))
