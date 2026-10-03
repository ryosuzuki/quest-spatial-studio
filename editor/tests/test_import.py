import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from import_mruk import intrinsics
class IntrinsicsTest(unittest.TestCase):
 def test_crop_not_resize(self):
  m=dict(sensorResolution=dict(width=1280,height=960),focalLength=dict(x=1000,y=1000),principalPoint=dict(x=650,y=490))
  k=intrinsics(m,640,360)
  self.assertEqual(k,dict(fx=500,fy=500,cx=325,cy=175,width=640,height=360))
 def test_invalid(self):
  with self.assertRaises(ValueError):intrinsics(dict(sensorResolution=dict(width=0,height=10)),640,480)

import tempfile,csv,json
from PIL import Image
from import_mruk import convert
class ImportTest(unittest.TestCase):
 def make_source(self,base):
  s=Path(base)/'raw';s.mkdir();(s/'left_camera_mruk_rgba').mkdir()
  (s/'session_info.json').write_text('{"captureBackend":"MRUK"}')
  (s/'left_camera_mruk_intrinsics.json').write_text(json.dumps(dict(sensorResolution=dict(width=2,height=2),focalLength=dict(x=2,y=2),principalPoint=dict(x=1,y=1))))
  rows=[]
  for i in range(3):
   name=f'{1000000+i*100000}.rgba';(s/'left_camera_mruk_rgba'/name).write_bytes(bytes([255,0,0,255]*2+[0,0,255,255]*2))
   r=dict(file_name=name,timestamp_us_realtime=1000000+i*100000,width=2,height=2,pose_pos_x=1,pose_pos_y=2,pose_pos_z=3,pose_rot_x=0,pose_rot_y=0,pose_rot_z=0,pose_rot_w=1,pose_ok=1,is_playing=1,get_texture_ok=1,get_colors_ok=1,error='');rows.append(r)
  return s,rows
 def write(self,s,rows):
  with (s/'left_camera_mruk_frame_metadata.csv').open('w') as f:
   w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
 def test_flip_pose_and_failed_frame(self):
  with tempfile.TemporaryDirectory() as t:
   s,r=self.make_source(t);r[1]['pose_ok']=0;self.write(s,r);dest=Path(t)/'out';m=convert(s,dest)
   self.assertEqual(len(m['frames']),2);self.assertEqual(m['frames'][1]['t'],.2);self.assertEqual(m['frames'][0]['position'],[1,2,-3]);self.assertEqual(Image.open(dest/'frames/000000.png').getpixel((0,0)),(0,0,255));self.assertEqual(len(m['report']['rejected']),1)
 def test_corrupt_rgba_rejected_and_no_overwrite(self):
  with tempfile.TemporaryDirectory() as t:
   s,r=self.make_source(t);self.write(s,r);(s/'left_camera_mruk_rgba'/r[1]['file_name']).write_bytes(b'broken');dest=Path(t)/'out';m=convert(s,dest);self.assertEqual(m['report']['accepted'],2)
   with self.assertRaises(ValueError):convert(s,dest)
 def test_zero_quaternion_and_duplicate_time(self):
  with tempfile.TemporaryDirectory() as t:
   s,r=self.make_source(t);r[1]['pose_rot_w']=0;r[2]['timestamp_us_realtime']=r[0]['timestamp_us_realtime'];self.write(s,r);m=convert(s,Path(t)/'out');self.assertEqual(m['report']['accepted'],1);self.assertEqual(len(m['report']['rejected']),2)
