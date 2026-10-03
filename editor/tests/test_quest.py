import sys, unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from quest import select_quest, safe_sessions
class DeviceSelectionTest(unittest.TestCase):
    def fake(self, args):
        if args[-1]=='devices': return 'List of devices attached\npixel\tdevice\nquest\tdevice\nlocked\tunauthorized'
        return {'pixel':'Pixel Tablet','quest':'Quest 3'}[args[2]]
    @patch('quest.run')
    def test_never_selects_pixel(self, run):
        run.side_effect=self.fake
        self.assertEqual(select_quest('adb'),'quest')
        with self.assertRaises(ValueError):select_quest('adb','pixel')
    @patch('quest.run', return_value='List of devices attached\nq\tunauthorized')
    def test_unauthorized_is_not_ready(self, run):
        with self.assertRaises(ValueError):select_quest('adb')
    def test_reject_shell_paths(self):
        self.assertEqual(safe_sessions('take-1\n../evil\nhello;cmd\n.config\ntake_2'),['take-1','take_2'])
