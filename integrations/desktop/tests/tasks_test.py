"""Tasks pagination, cache isolation, date-only semantics and permission upgrades."""
import os
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
from omcal import auth, tasks, sync


class Tasks(unittest.TestCase):
    def test_due_date_is_not_timezone_shifted(self):
        item = tasks.normalise("School", {"id": "list", "title": "Work"},
                               {"id": "task", "due": "2026-10-28T00:00:00Z", "title": "Read"})
        self.assertEqual(item["due"], "2026-10-28")
        self.assertEqual(item["uid"], "School/tasks/list/task")

    def test_invalid_date_and_unsafe_link(self):
        item = tasks.normalise("School", {"id": "list"},
                               {"id": "task", "due": "2026-02-30T00:00:00Z", "webViewLink": "javascript:bad()"})
        self.assertEqual(item["due"], "")
        self.assertEqual(item["webLink"], "https://tasks.google.com/")

    def test_paginates_lists_and_tasks_and_drops_completed(self):
        calls = []

        def get(url, token):
            calls.append(url)
            q = parse_qs(urlsplit(url).query)
            if "/users/@me/lists" in url:
                return {"items": [{"id": "B"}]} if "pageToken" in q else {"items": [{"id": "A"}], "nextPageToken": "lists2"}
            self.assertEqual(q["showCompleted"], ["false"])
            self.assertEqual(q["showAssigned"], ["true"])
            if "/lists/A/tasks" in url:
                return {"items": [{"id": "two"}, {"id": "done", "status": "completed"}]} if "pageToken" in q else {"items": [{"id": "one"}], "nextPageToken": "tasks2"}
            return {"items": [{"id": "deleted", "deleted": True}, {"id": "hidden", "hidden": True}, {"id": "three"}]}

        with patch.object(auth, "get_json", side_effect=get):
            lists, items = tasks.snapshot("G", "test-token")
        self.assertEqual([x["id"] for x in lists], ["A", "B"])
        self.assertEqual({x["id"] for x in items.values()}, {"one", "two", "three"})
        self.assertEqual(len(calls), 5)

    def test_failure_keeps_last_snapshot_and_calendar_sync_works(self):
        old = {"old": {"uid": "old", "title": "Keep", "status": "needsAction"}}
        with tempfile.TemporaryDirectory() as directory, patch.object(sync, "CACHE", directory), \
                patch.object(sync.auth, "google_access", return_value="test-token"), \
                patch.object(sync.auth, "hidden_calendars", return_value={}), \
                patch.object(sync.google, "event_colors", return_value={}), \
                patch.object(sync.google, "calendars", return_value=[]), \
                patch.object(tasks, "snapshot", side_effect=auth.HttpError("tasks.googleapis.com", 403, "insufficientPermissions")):
            sync.write_private(os.path.join(directory, "state-G.json"), {"calendars": {}, "events": {}, "tasks": old})
            state = sync.sync_account({"name": "G", "provider": "google"}, False, lambda *a: None)
        self.assertEqual(state["status"], "ok")
        self.assertEqual(state["tasksStatus"], "permission")
        self.assertEqual(state["tasks"], old)

    def test_success_replaces_snapshot_so_completed_tasks_disappear(self):
        state = {"tasks": {"old": {"title": "No longer pending"}}}
        with patch.object(tasks, "snapshot", return_value=([{"id": "list"}], {"new": {"title": "New"}})):
            sync.sync_tasks({"name": "G"}, "test-token", state, 123, lambda *a: None)
        self.assertEqual(state["tasks"], {"new": {"title": "New"}})
        self.assertEqual(state["tasksStatus"], "ok")
        self.assertEqual(state["tasksLastSync"], 123)

    def test_tasks_cache_is_separate_from_events(self):
        account = {"name": "G", "provider": "google"}
        state = {"known": [], "events": {}, "tasksStatus": "ok", "taskLists": [{"id": "L"}],
                 "tasks": {"T": {"uid": "T", "title": "Read", "account": "G", "status": "needsAction", "due": "2026-10-28"}}}
        with patch.object(sync, "write_private"):
            result = sync.publish([account], {"G": state})
        self.assertEqual(result["events"], [])
        self.assertEqual(result["tasks"][0]["uid"], "T")
        self.assertEqual(result["taskLists"][0]["account"], "G")
        self.assertEqual(result["accounts"][0]["tasksStatus"], "ok")


class TaskAuthorization(unittest.TestCase):
    def upgrade(self, email, scopes):
        account = {"name": "G", "provider": "google", "clientId": "client", "email": "me@example.test"}
        with patch.object(auth, "account", return_value=account), \
                patch.object(auth, "secret_load", return_value={"refresh_token": "old", "client_secret": "secret"}), \
                patch.object(auth, "google_authorize", return_value=({"refresh_token": "new", "scope": scopes}, email)), \
                patch.object(auth, "secret_store") as save, patch.object(auth, "save_account"):
            try:
                auth.enable_google_tasks("G")
            except auth.AuthError:
                self.assertFalse(save.called)
                raise
            return save.call_args.args[1]

    def test_upgrade_preserves_client_and_adds_write_scope(self):
        saved = self.upgrade("me@example.test", auth.GOOGLE_SCOPES)
        self.assertEqual(saved, {"refresh_token": "new", "client_secret": "secret"})
        self.assertIn("https://www.googleapis.com/auth/tasks", auth.GOOGLE_SCOPES.split())

    def test_wrong_account_does_not_overwrite_existing_signin(self):
        with self.assertRaises(auth.AuthError):
            self.upgrade("other@example.test", auth.GOOGLE_SCOPES)

    def test_declined_scope_does_not_overwrite_existing_signin(self):
        with self.assertRaises(auth.AuthError):
            self.upgrade("me@example.test", "openid email https://www.googleapis.com/auth/calendar")
