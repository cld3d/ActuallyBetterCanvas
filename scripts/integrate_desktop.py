#!/usr/bin/python3
"""Apply narrowly matched, backed-up changes to this laptop's custom Datebook/lock."""
import json
import os
from pathlib import Path
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
PLUGINS = Path.home() / '.config/omarchy/plugins'


def changes():
    return {
      'blacksheep.calendar/scripts/omcal/sync.py': [
        ('    out["events"] = dedupe(out["events"], out["calendars"])',
         '    from . import canvas_local\n    canvas_local.append_to(out)\n    out["events"] = dedupe(out["events"], out["calendars"])')],
      'blacksheep.calendar/scripts/omcal/tasks.py': [
        ('def update(uid, title=None, due=None, notes=None, completed=None):\n    from . import sync',
         'def update(uid, title=None, due=None, notes=None, completed=None):\n    if uid.startswith("canvas-local/"):\n        from . import canvas_local\n        return canvas_local.update(uid, title, due, notes, completed)\n    from . import sync'),
        ('def delete(uid):\n    from . import sync',
         'def delete(uid):\n    if uid.startswith("canvas-local/"):\n        from . import canvas_local\n        return canvas_local.delete(uid)\n    from . import sync')],
      'blacksheep.calendar/scripts/calendar-ctl': [
        ('            tasks.update(args[0], **options)\n        sync.main(["sync", "--quiet"])',
         '            tasks.update(args[0], **options)\n        if cmd == "task-update" and args[0].startswith("canvas-local/"):\n            return\n        sync.main(["sync", "--quiet"])'),
        ('        if "--no-sync" not in args[1:]:',
         '        if "--no-sync" not in args[1:] and not args[0].startswith("canvas-local/"):')],
      'gavin.lock/TaskCompletion.qml': [
        ('if (!account || account.provider !== "google" || account.tasksWritable !== true) return false',
         'if (!account || (account.provider !== "google" && account.provider !== "canvas-local") || account.tasksWritable !== true) return false')],
      'gavin.lock/Agenda.js': [
        ('return String(a.position || "").localeCompare(String(b.position || ""))',
         'return String(a.dueAt || a.position || "").localeCompare(String(b.dueAt || b.position || ""))'),
        ('location: "", color: "", dueLabel:',
         'location: task.dueAt ? "Due " + new Date(task.dueAt).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) + " · " + (task.listName || "Canvas") : "", color: "", dueLabel:')],
      'blacksheep.calendar/Panel.qml': [
        ('return a.provider === "google" })', 'return a.provider === "google" || a.provider === "canvas-local" })'),
        ('return a.provider === "google" && a.tasksStatus !== "ok"', 'return (a.provider === "google" || a.provider === "canvas-local") && a.tasksStatus !== "ok"'),
        ('  function saveTask(task) {\n    var title', '''  function saveTask(task) {
    if (task.provider === "canvas-local") {
      var localArgs = ["task-update", task.uid]
      var originalDue = root.taskDraft.dueAt ? Qt.formatDateTime(new Date(root.taskDraft.dueAt), "yyyy-MM-dd HH:mm") : ""
      if (task.due !== originalDue) localArgs = localArgs.concat(["--due", task.due || ""])
      if ((task.notes || "") !== (root.taskDraft.notes || "")) localArgs = localArgs.concat(["--notes", task.notes || ""])
      if (localArgs.length === 2) { root.closeEditor(); return }
      root.runWrite(task.uid, localArgs)
      return
    }
    var title''')],
      'blacksheep.calendar/TaskEditor.qml': [
        ('dueField.text = draft.due || ""', 'dueField.text = draft.provider === "canvas-local" ? (draft.dueAt ? Qt.formatDateTime(new Date(draft.dueAt), "yyyy-MM-dd HH:mm") : "") : draft.due || ""'),
        ('font.pixelSize: Style.font.subtitle\n      readOnly: !editor.editable || editor.saving', 'font.pixelSize: Style.font.subtitle\n      readOnly: !editor.editable || editor.saving || !!editor.draft && editor.draft.provider === "canvas-local"'),
        ('Caption { text: "DUE DATE"; font.letterSpacing: 1 }', 'Caption { text: editor.draft && editor.draft.provider === "canvas-local" ? "PERSONAL DEADLINE (LOCAL TIME)" : "DUE DATE"; font.letterSpacing: 1 }'),
        ('placeholderText: "YYYY-MM-DD · leave blank for no date"', 'placeholderText: editor.draft && editor.draft.provider === "canvas-local" ? "YYYY-MM-DD HH:MM · blank for no deadline" : "YYYY-MM-DD · leave blank for no date"'),
        ('text: editor.confirmingDelete ? "Confirm delete" : "Delete"\n        visible: !editor.creating && editor.editable', 'text: editor.confirmingDelete ? "Confirm delete" : "Delete"\n        visible: !editor.creating && editor.editable && editor.draft.provider !== "canvas-local"'),
        ('text: "Open in Google Tasks"', 'text: editor.draft && editor.draft.provider === "canvas-local" ? "Open in Canvas" : "Open in Google Tasks"')],
      'blacksheep.calendar/TaskList.qml': [
        ('"All unfinished Google Tasks"', '"All unfinished tasks"'),
        ('tooltipText: "Open Google Tasks"', 'tooltipText: "Open task website"'),
        ('onClicked: root.p.openUrl("https://tasks.google.com/")', 'onClicked: { var items = root.p.selectedTasks; root.p.openUrl(items.length && items[0].provider === "canvas-local" ? items[0].webLink : "https://tasks.google.com/") }')],
      'blacksheep.calendar/Tasks.js': [
        ('  if (task.due < today) return "Overdue · " + task.due\n  return task.due === today ? "Today" : task.due',
         '  var time = task.dueAt ? " · " + new Date(task.dueAt).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) : ""\n  if (task.due < today) return "Overdue · " + task.due + time\n  return (task.due === today ? "Today" : task.due) + time'),
        ('declined: false, label: "Task"', 'declined: false, taskTime: task.dueAt ? new Date(task.dueAt).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) : "", label: "Task"')],
      'blacksheep.calendar/MonthGrid.qml': [
        ('chip.modelData.kind === "task" ? "□ "', 'chip.modelData.kind === "task" ? "□ " + (chip.modelData.taskTime ? chip.modelData.taskTime + " " : "")')],
      'blacksheep.calendar/TimeGrid.qml': [
        ('parent.modelData.kind === "task" ? "□ "', 'parent.modelData.kind === "task" ? "□ " + (parent.modelData.taskTime ? parent.modelData.taskTime + " " : "")')],
    }


def main():
    pending = []
    for relative, edits in changes().items():
        path = PLUGINS / relative
        text = original = path.read_text()
        if 'Canvas Local deadlines v2' in text or 'Canvas Local deadline editor v2' in text or 'Canvas Local deadline editor v3' in text:
            continue
        for before, after in edits:
            if 'Canvas Local class colors' in text and before.startswith('  function saveTask(task)'):
                continue
            if after in text:
                continue
            if text.count(before) != 1:
                raise RuntimeError('Integration stopped without changes: unmatched or ambiguous text in ' + relative + '\n' + before)
            text = text.replace(before, after, 1)
        if original != text:
            pending.append((path, text))
    from deadline_support import plan
    pending = plan(PLUGINS, dict(pending))
    from twelve_hour_support import plan as plan_twelve_hour
    pending = plan_twelve_hour(PLUGINS, dict(pending))
    from color_support import plan as plan_colors
    pending = plan_colors(PLUGINS, dict(pending))
    from event_color_support import plan as plan_event_colors
    pending = plan_event_colors(PLUGINS, dict(pending))
    backup = Path.home() / '.local/state/canvas-local/backups' / datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    # Backups stay outside watched plugin directories (which trigger shell reloads).
    for path, text in pending:
        target = backup / path.relative_to(PLUGINS)
        target.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            shutil.copy2(path, target)
    adapter = PLUGINS / 'blacksheep.calendar/scripts/omcal/canvas_local.py'
    shutil.copy2(ROOT / 'integrations/canvas_local.py', adapter)
    config = Path(os.environ.get('XDG_CONFIG_HOME', Path.home() / '.config')) / 'canvas-local'
    config.mkdir(exist_ok=True, mode=0o700)
    (config / 'integration.json').write_text(json.dumps({'host': str(ROOT / 'native/canvas_feed.py')}))
    for path, text in pending:
        path.write_text(text)
    print('Updated', len(pending), 'desktop files. Backups:', backup)


if __name__ == '__main__':
    main()
