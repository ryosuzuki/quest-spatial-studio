import json
import pathlib
import subprocess
import tempfile
import unittest
import wave
from unittest.mock import patch
from validate_spatial_take import room_count, validate


class TakeValidationTests(unittest.TestCase):
    def test_room_schemas(self):
        self.assertEqual(room_count({'Rooms': [{}, {}]}), 2)
        self.assertEqual(room_count({'rooms': [{}]}), 1)
        self.assertEqual(room_count({'spatialEntities': [
            {'roomLayoutMETA': {}}, {'roomLayoutMETA': {}}, {'triangleMeshMETA': {}}]}), 2)
        self.assertEqual(room_count({'spatialEntities': []}), 0)

    def test_broken_video_preserves_room_audio_and_tracking_evidence(self):
        with tempfile.TemporaryDirectory() as folder:
            p = pathlib.Path(folder)
            (p / 'left_camera.mp4').write_bytes(b'broken')
            (p / 'room-scan.json').write_text(json.dumps({'spatialEntities': [
                {'roomLayoutMETA': {}}, {'roomLayoutMETA': {}}]}))
            hand = {'valid': True, 'tracked': True, 'boneRotations': [1]}
            (p / 'hands.jsonl').write_text(json.dumps({'left': hand, 'right': hand}) + '\n')
            (p / 'hmd_poses.csv').write_text('time,x\n1,0\n2,1\n')
            with wave.open(str(p / 'audio.wav'), 'wb') as wav:
                wav.setparams((1, 2, 48000, 0, 'NONE', 'not compressed'))
                wav.writeframes(b'\0' * 96000)
            with patch('validate_spatial_take.subprocess.run', side_effect=subprocess.CalledProcessError(1, 'ffmpeg')):
                report = validate(p)
            self.assertFalse(report['passed'])
            self.assertFalse(report['left']['decoded'])
            self.assertEqual(report['roomCount'], 2)
            self.assertEqual(report['audio']['durationSeconds'], 1)
            self.assertEqual(report['handSamples'], 1)
            self.assertEqual(report['hmdSamples'], 2)
            self.assertTrue(any('decode failed' in error for error in report['errors']))

    def test_missing_streams_do_not_abort_diagnostics(self):
        with tempfile.TemporaryDirectory() as folder:
            report = validate(folder)
        self.assertFalse(report['passed'])
        self.assertEqual(len(report['errors']), 3)


if __name__ == '__main__':
    unittest.main()
