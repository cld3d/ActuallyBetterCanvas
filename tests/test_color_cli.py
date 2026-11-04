"""Installed Datebook color writes, isolated from real accounts and saved tasks."""
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PLUGINS = Path(os.environ.get('CANVAS_DESKTOP_PLUGIN_DIR', Path.home() / '.config/omarchy/plugins'))
CLI = PLUGINS / 'blacksheep.calendar/scripts/calendar-ctl'


@unittest.skipUnless(CLI.is_file() and os.environ.get('CANVAS_SKIP_DESKTOP_TESTS') != '1', 'Installed Datebook unavailable or desktop tests disabled')
class ColorCliTests(unittest.TestCase):
    def test_color_and_deadline_write_publish_without_touching_google_or_existing_overrides(self):
        preferred = Path('/tmp/opencode')
        with tempfile.TemporaryDirectory(prefix='canvas-color-', dir=preferred if preferred.is_dir() else None) as directory:
            temp = Path(directory)
            env = dict(os.environ, XDG_DATA_HOME=str(temp / 'data'), XDG_CACHE_HOME=str(temp / 'cache'),
                       XDG_CONFIG_HOME=str(temp / 'config'), XDG_RUNTIME_DIR=str(temp / 'runtime'))
            (temp / 'runtime').mkdir()
            config = temp / 'config/canvas-local'
            config.mkdir(parents=True)
            host = ROOT / 'native/canvas_feed.py'
            (config / 'integration.json').write_text(json.dumps({'host':str(host)}))
            request = dict(action='sync',origin='https://canvas.test',user='1',assignments=[
                dict(id='1',courseId='2',course='Chemistry',title='Synthetic assignment',canvasDue='2026-11-09T23:59:00Z',submitted=False)
            ])
            data = json.dumps(request).encode()
            result = subprocess.run([sys.executable,'-B',str(host)],env=env,input=struct.pack('=I',len(data))+data,capture_output=True,check=True)
            reply = json.loads(result.stdout[4:])
            self.assertTrue(reply['ok'])
            uid = reply['state']['assignments'][0]['uid']
            subprocess.run([sys.executable,'-B',str(host),'update',uid,'--patch',json.dumps({'completion':False}),'--no-publish'],env=env,capture_output=True,check=True)
            subprocess.run([sys.executable,'-B',str(CLI),'task-update',uid,'--color','#7986cb','--due','2026-11-10 16:30'],
                           env=env,capture_output=True,check=True)
            published = json.loads((temp / 'cache/blacksheep.calendar/events.json').read_text())
            task = next(t for t in published['tasks'] if t['uid'] == uid)
            self.assertEqual(task['color'],'#7986cb')
            self.assertEqual(task['completionOverride'],False)
            self.assertTrue(task['dueOverride'])
            self.assertTrue(task['dueAt'])
            subprocess.run([sys.executable,'-B',str(CLI),'task-update',uid,'--color',''],env=env,capture_output=True,check=True)
            restored = json.loads((temp / 'cache/blacksheep.calendar/events.json').read_text())['tasks'][0]
            self.assertEqual(restored['color'],'#0b8043')
            self.assertEqual(restored['dueAt'],task['dueAt'])
            self.assertEqual(restored['completionOverride'],False)
