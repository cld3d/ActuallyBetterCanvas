import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('canvas_adapter', Path(__file__).resolve().parents[1] / 'integrations/canvas_local.py')
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)


class AdapterTests(unittest.TestCase):
    def test_missing_feed_leaves_existing_calendars_and_tasks_unchanged(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, XDG_CACHE_HOME=directory):
            output = dict(accounts=[{'name': 'Google'}], tasks=[{'uid': 'personal-task'}])
            adapter.append_to(output)
            self.assertEqual(output['accounts'], [{'name': 'Google'}])
            self.assertEqual(output['tasks'], [{'uid': 'personal-task'}])

    def test_exact_times_and_sync_error_are_published_without_completed_tasks(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, XDG_CACHE_HOME=directory):
            path = Path(directory) / 'canvas-local/feed.json'
            path.parent.mkdir()
            path.write_text(json.dumps(dict(lastSync='2026-11-04T12:00:00Z', syncError='Sign in again', tasks=[
                dict(uid='canvas-local/1', status='needsAction', dueAt='2026-11-08T23:59:00Z'),
                dict(uid='canvas-local/2', status='completed')
            ])))
            output = dict(accounts=[], tasks=[])
            adapter.append_to(output)
            self.assertEqual(len(output['tasks']), 1)
            self.assertEqual(output['tasks'][0]['dueAt'], '2026-11-08T23:59:00Z')
            self.assertEqual(output['accounts'][0]['tasksError'], 'Sign in again')
            self.assertTrue(output['accounts'][0]['tasksWritable'])
            self.assertEqual(output['accounts'][0]['provider'], 'canvas-local')


if __name__ == '__main__':
    unittest.main()
