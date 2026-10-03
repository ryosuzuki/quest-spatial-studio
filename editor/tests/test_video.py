import csv,json,subprocess,tempfile,unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from import_video import convert
class VideoImportTests(unittest.TestCase):
 def make(self,root):
  source=root/'take';source.mkdir();video=source/'left_camera.mp4'
  subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc=size=32x32:rate=10:duration=0.4','-c:v','libx264','-pix_fmt','yuv420p','-bf','0',str(video)],check=True)
  pts=[0,100000,200000,300000];origin=1800000000000000
  Path(str(video)+'.status.json').write_text(json.dumps({'complete':True,'error':'','originCameraUs':origin}))
  with Path(str(video)+'.packets.csv').open('w') as f:
   w=csv.writer(f);w.writerow(['pts_us','size','flags']);w.writerows([[p,100,0] for p in pts])
  rows=[dict(file_name=video.name,timestamp_us_realtime=origin+p,width=32,height=32,pose_ok='true',is_playing='true',get_texture_ok='true',get_colors_ok='true',error='',pose_pos_x=1,pose_pos_y=2,pose_pos_z=3,pose_rot_x=0,pose_rot_y=0,pose_rot_z=0,pose_rot_w=1) for p in pts]
  with (source/'left_camera_mruk_frame_metadata.csv').open('w') as f:
   w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
  (source/'left_camera_mruk_intrinsics.json').write_text(json.dumps({'sensorResolution':{'width':32,'height':32},'focalLength':{'x':20,'y':20},'principalPoint':{'x':16,'y':16}}))
  return source
 def test_pts_and_pose_pairing(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);source=self.make(root);result=convert(source,root/'out')
   self.assertEqual(len(result['frames']),4);self.assertEqual(result['frames'][2]['t'],.2);self.assertEqual(result['frames'][2]['position'],[1,2,-3]);self.assertTrue((root/'out/frames/000003.png').exists())
 def test_mismatched_encoded_pts_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);source=self.make(root);f=source/'left_camera.mp4.packets.csv';f.write_text(f.read_text().replace('200000','210000'))
   with self.assertRaisesRegex(ValueError,'timestamp mismatch'):convert(source,root/'out')

 def test_bounded_container_quantization_preserves_sensor_pairing(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);source=self.make(root)
   p=source/'left_camera.mp4.packets.csv';p.write_text(p.read_text().replace('200000','200200'))
   p=source/'left_camera_mruk_frame_metadata.csv';p.write_text(p.read_text().replace('1800000000200000','1800000000200200'))
   result=convert(source,root/'out')
   self.assertEqual(result['frames'][2]['t'],.2002)
   self.assertEqual(result['report']['maxContainerPtsErrorUs'],200)
 def test_large_container_timestamp_drift_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);source=self.make(root)
   p=source/'left_camera.mp4.packets.csv';p.write_text(p.read_text().replace('200000','210000'))
   p=source/'left_camera_mruk_frame_metadata.csv';p.write_text(p.read_text().replace('1800000000200000','1800000000210000'))
   with self.assertRaisesRegex(ValueError,'within 1 ms'):convert(source,root/'out')

 def test_duplicate_sensor_timestamp_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);source=self.make(root)
   p=source/'left_camera_mruk_frame_metadata.csv';lines=p.read_text().splitlines();p.write_text('\n'.join(lines+[lines[1]])+'\n')
   with self.assertRaisesRegex(ValueError,'Duplicate camera metadata'):convert(source,root/'out')
