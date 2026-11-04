import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('canvas_feed', ROOT / 'native/canvas_feed.py')
feed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(feed)


class FeedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        feed.DATA = Path(self.temp.name) / 'data'
        feed.CACHE = Path(self.temp.name) / 'cache'
        self.item = dict(id='12', courseId='34', course='Math', title='Homework', canvasDue='2026-11-08T23:59:00Z', submitted=False, graded=False)

    def sync(self, **changes):
        item = dict(self.item, **changes)
        return feed.handle(dict(action='sync', origin='https://school.instructure.com', user='7', assignments=[item]), publish=False)['state']['assignments'][0]

    def update(self, patch):
        uid = feed.handle({'action': 'list'}, False)['state']['assignments'][0]['uid']
        return feed.handle(dict(action='update', uid=uid, patch=patch), False)['state']['assignments'][0]

    def test_grade_does_not_complete(self):
        self.assertFalse(self.sync(graded=True)['completed'])

    def test_requested_course_colors_and_lab_aliases(self):
        expected = [
            ('Philosophy', '#7cb342'), ('HU2700 R01', '#7cb342'),
            ('Chemistry', '#0b8043'), ('CH1150', '#0b8043'), ('CH1151 Lab', '#0b8043'),
            ('Calculus II Lab', '#039be5'), ('MA2160 R07', '#039be5'),
            ('ENG1101', '#3f51b5'), ('Spat Viz', '#3f51b5'), ('Spatial Mastery', '#3f51b5'),
            ('PH1100', '#c0ca33'), ('Physics', '#c0ca33'),
            ('HON1150', '#7986cb'), ('Honors', '#7986cb'), ('Unknown course', '#616161'),
        ]
        for course, color in expected:
            with self.subTest(course=course):
                self.assertEqual(self.sync(course=course)['color'], color)

    def test_class_color_changes_include_labs_and_survive_sync(self):
        items = [dict(self.item, course='Chemistry', courseId='34'), dict(self.item, id='13', course='Chem lab', courseId='35')]
        request = dict(action='sync', origin='https://school.instructure.com', user='7', assignments=items)
        initial = feed.handle(request, False)['state']['assignments']
        uid = next(r['uid'] for r in initial if r['id'] == '12')
        feed.handle(dict(action='update', uid=uid, patch={'courseColor': '#aAbBcC', 'completion': False, 'personalDue': '2026-11-10T12:00:00Z'}), False)
        rows = feed.handle(request, False)['state']['assignments']
        self.assertEqual([r['color'] for r in rows], ['#aabbcc', '#aabbcc'])
        edited = next(r for r in rows if r['id'] == '12')
        self.assertIs(edited['completionOverride'], False)
        self.assertEqual(edited['effectiveDue'], '2026-11-10T12:00:00+00:00')
        feed.handle(dict(action='update', uid=edited['uid'], patch={'courseColor': None}), False)
        self.assertEqual({r['color'] for r in feed.handle({'action':'list'}, False)['state']['assignments']}, {'#0b8043'})

    def test_bad_color_rolls_back_other_edits(self):
        original = self.sync()
        with self.assertRaises(ValueError):
            self.update({'courseColor': 'red; anything', 'completion': True})
        self.assertEqual(feed.handle({'action':'list'}, False)['state']['assignments'][0], original)

    def test_additive_color_table_preserves_old_overrides(self):
        import sqlite3
        self.sync()
        self.update({'completion': False, 'personalDue': None, 'notes': 'Keep me'})
        import contextlib
        with contextlib.closing(sqlite3.connect(feed.DATA / 'assignments.sqlite3')) as db, db:
            db.execute('DROP TABLE course_colors')  # Synthetic pre-color database.
        restored = feed.handle({'action':'list'}, False)['state']['assignments'][0]
        self.assertIs(restored['completionOverride'], False)
        self.assertTrue(restored['dueOverride'])
        self.assertIsNone(restored['effectiveDue'])
        self.assertEqual(restored['notes'], 'Keep me')
        self.assertEqual(restored['color'], '#616161')

    def test_submission_and_sticky_reopen(self):
        self.assertTrue(self.sync(submitted=True)['completed'])
        self.assertFalse(self.update({'completion': False})['completed'])
        self.assertFalse(self.sync(submitted=True, graded=True)['completed'])
        self.assertTrue(self.update({'completion': None})['completed'])

    def test_manual_complete_survives_sync(self):
        self.sync()
        self.update({'completion': True})
        self.assertTrue(self.sync()['completed'])

    def test_deadline_override_survives_source_changes(self):
        self.sync()
        personal = '2026-11-09T17:05:00-05:00'
        changed = self.update({'personalDue': personal})
        self.assertEqual(changed['effectiveDue'], '2026-11-09T22:05:00+00:00')
        refreshed = self.sync(canvasDue='2026-11-12T21:00:00Z')
        self.assertEqual(refreshed['effectiveDue'], changed['effectiveDue'])
        self.assertNotEqual(refreshed['canvasDue'], changed['canvasDue'])
        self.assertEqual(self.update({'followCanvasDue': True})['effectiveDue'], refreshed['canvasDue'])

    def test_explicit_no_deadline(self):
        self.sync()
        self.update({'personalDue': None})
        self.assertIsNone(self.sync()['effectiveDue'])

    def test_identity_switch_keeps_existing_feed(self):
        self.sync()
        with self.assertRaises(ValueError):
            feed.handle(dict(action='sync', origin='https://school.instructure.com', user='8', assignments=[]), False)
        self.assertEqual(len(feed.handle({'action': 'list'}, False)['state']['assignments']), 1)

    def test_rejects_bad_snapshot_without_losing_data(self):
        self.sync()
        with self.assertRaises(ValueError):
            self.sync(canvasDue='tomorrow')
        self.assertEqual(len(feed.handle({'action': 'list'}, False)['state']['assignments']), 1)

    def test_invalid_edit_is_atomic(self):
        original = self.sync()
        with self.assertRaises(ValueError):
            self.update({'personalDue': '2026-11-15T12:00:00Z', 'completion': 'false'})
        self.assertEqual(feed.handle({'action': 'list'}, False)['state']['assignments'][0], original)

    def test_removed_and_returned_preserves_override(self):
        self.sync()
        self.update({'completion': False, 'notes': 'Review this'})
        feed.handle(dict(action='sync', origin='https://school.instructure.com', user='7', assignments=[]), False)
        self.assertEqual(feed.handle({'action': 'list'}, False)['state']['assignments'], [])
        restored = self.sync(submitted=True)
        self.assertFalse(restored['completed'])
        self.assertEqual(restored['notes'], 'Review this')

    def test_feed_preserves_exact_time_and_permissions(self):
        self.sync()
        data = json.loads((feed.CACHE / 'feed.json').read_text())
        self.assertEqual(data['tasks'][0]['dueAt'], '2026-11-08T23:59:00+00:00')
        self.assertEqual((feed.CACHE / 'feed.json').stat().st_mode & 0o777, 0o600)
        self.assertEqual((feed.DATA / 'assignments.sqlite3').stat().st_mode & 0o777, 0o600)

    def test_timezone_required(self):
        self.sync()
        with self.assertRaises(ValueError):
            self.update({'personalDue': '2026-11-15T12:00:00'})

    def test_no_submission_writes_or_network_calls(self):
        self.assertNotIn('import urllib.request', (ROOT / 'native/canvas_feed.py').read_text())

    def test_native_protocol(self):
        import struct
        payload = json.dumps({'action': 'list'}).encode()
        env = dict(os.environ, XDG_DATA_HOME=self.temp.name + '/data-native', XDG_CACHE_HOME=self.temp.name + '/cache-native')
        run = subprocess.run([sys.executable, str(ROOT / 'native/canvas_feed.py')],
                             input=struct.pack('=I', len(payload)) + payload, capture_output=True, env=env, check=True)
        size = struct.unpack('=I', run.stdout[:4])[0]
        self.assertEqual(size, len(run.stdout) - 4)
        self.assertTrue(json.loads(run.stdout[4:])['ok'])


if __name__ == '__main__':
    unittest.main()
