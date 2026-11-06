import contextlib
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
from omcal import auth, sync, tasks


class TaskWrites(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.account = {"name": "G", "provider": "google", "tasksWritable": True}
        self.tasklist = {"id": "L", "title": "Work", "editable": True}
        self.raw = {"id": "task/a", "title": "Original", "status": "needsAction", "etag": "v1", "due": "2026-10-31T00:00:00Z"}
        self.item = tasks.normalise("G", self.tasklist, self.raw, True)
        self.path = os.path.join(self.temp.name, "state-G.json")
        sync.write_private(self.path, {"taskLists": [self.tasklist], "tasks": {self.item["uid"]: self.item}})
        for target, kwargs in [
            ("omcal.sync.CACHE", {"new": self.temp.name}),
            ("omcal.sync.locked", {"side_effect": contextlib.nullcontext}),
            ("omcal.sync.republish", {}),
            ("omcal.auth.account", {"return_value": self.account}),
            ("omcal.auth.google_access", {"return_value": "test-token"}),
        ]:
            mock = patch(target, **kwargs)
            mock.start()
            self.addCleanup(mock.stop)

    def test_complete_patches_only_status_with_etag_and_updates_cache(self):
        with patch.object(auth, "send_json", return_value=dict(self.raw, status="completed", etag="v2")) as send:
            tasks.update(self.item["uid"], completed=True)
        self.assertEqual(send.call_args.args[0], "PATCH")
        self.assertTrue(send.call_args.args[1].endswith("/lists/L/tasks/task%2Fa"))
        self.assertEqual(send.call_args.args[3], {"status": "completed"})
        self.assertEqual(send.call_args.args[4], {"If-Match": "v1"})
        self.assertEqual(sync.read_json(self.path, {})["tasks"][self.item["uid"]]["status"], "completed")

    def test_clearing_due_date_sends_null(self):
        with patch.object(auth, "send_json", return_value=dict(self.raw, due=None)) as send:
            tasks.update(self.item["uid"], due="")
        self.assertEqual(send.call_args.args[3], {"due": None})
        self.assertEqual(sync.read_json(self.path, {})["tasks"][self.item["uid"]]["due"], "")

    def test_conflict_keeps_local_copy(self):
        with patch.object(auth, "send_json", side_effect=auth.Conflict("Changed elsewhere")):
            with self.assertRaises(auth.Conflict):
                tasks.update(self.item["uid"], title="New")
        self.assertEqual(sync.read_json(self.path, {})["tasks"][self.item["uid"]]["title"], "Original")

    def test_create_preserves_title_and_notes_and_publishes(self):
        reply = {"id": "new", "title": "--not-an-option", "notes": "Line 1\nLine 2", "due": "2026-11-01T00:00:00Z"}
        with patch.object(auth, "send_json", return_value=reply) as send:
            uid = tasks.create("G/L", reply["title"], "2026-11-01", reply["notes"])
        self.assertEqual(send.call_args.args[0], "POST")
        self.assertEqual(send.call_args.args[3], {"title": "--not-an-option", "notes": "Line 1\nLine 2", "due": "2026-11-01T00:00:00.000Z"})
        self.assertIn(uid, sync.read_json(self.path, {})["tasks"])

    def test_delete_removes_only_selected_task(self):
        with patch.object(auth, "send_json", return_value=None) as send:
            tasks.delete(self.item["uid"])
        self.assertEqual(send.call_args.args[0], "DELETE")
        self.assertNotIn(self.item["uid"], sync.read_json(self.path, {})["tasks"])

    def test_read_only_access_never_sends_a_write(self):
        self.account["tasksWritable"] = False
        with patch.object(auth, "send_json") as send:
            with self.assertRaises(RuntimeError):
                tasks.update(self.item["uid"], completed=True)
        send.assert_not_called()

    def test_invalid_dates_and_empty_titles_are_rejected(self):
        for date in ("2026-02-30", "2026-11-01T10:00:00Z", "bad"):
            with self.assertRaises(RuntimeError):
                tasks.update(self.item["uid"], due=date)
        with self.assertRaises(RuntimeError):
            tasks.create("G/L", "   ")
