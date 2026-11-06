import os
import runpy
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
from omcal import tasks, sync


class TaskCompletionCLI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.command = runpy.run_path(os.path.join(os.path.dirname(__file__), "..", "scripts", "calendar-ctl"))

    def test_no_sync_still_writes_and_publishes_via_tasks_update(self):
        with patch.object(tasks, "update") as update, patch.object(sync, "main") as refresh:
            self.command["main"](["calendar-ctl", "task-complete", "School/tasks/list/id", "--no-sync"])
        update.assert_called_once_with("School/tasks/list/id", completed=True)
        refresh.assert_not_called()

    def test_default_completion_still_refreshes(self):
        with patch.object(tasks, "update") as update, patch.object(sync, "main") as refresh:
            self.command["main"](["calendar-ctl", "task-complete", "School/tasks/list/id"])
        update.assert_called_once_with("School/tasks/list/id", completed=True)
        refresh.assert_called_once_with(["sync", "--quiet"])
