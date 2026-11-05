"""Plan time-aware desktop edits without writing files or touching task data."""
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'blacksheep.calendar/Tasks.js': ('Tasks.js', '7aa27484ffad2018bcb589884a2895ceb6b8357d0557d2c52bb18772654a4604'),
    'gavin.lock/Agenda.js': ('Agenda.js', '25c5b824ed54b59170e84ed1edeafb80964b3bfe9117917aeedb182e9c91bdbb'),
}


def edits():
    return {
      'gavin.lock/CalendarAgenda.qml': [
        ('readonly property var rows: events.concat(tasks)', 'readonly property var rows: Agenda.mergeRows(events, tasks)')],
      'blacksheep.calendar/Panel.qml': [
        ('Tasks.forDay(eventData, selectedKey, todayKey, showAllTasks)', 'Tasks.forDay(eventData, selectedKey, todayKey, showAllTasks, root.clockNow)'),
        ('Tasks.indexByDay(eventData, String(Color.accent))', 'Tasks.indexByDay(eventData, String(Color.accent), root.use24h)')],
      'blacksheep.calendar/TaskList.qml': [
        ('Tasks.dueLabel(taskRow.modelData, root.p.todayKey)', 'Tasks.dueLabel(taskRow.modelData, root.p.todayKey, root.p.clockNow, root.p.use24h)')],
      'blacksheep.calendar/Model.js': [
        ('    if (e.allDay) continue\n    var s =', '''    if (e.allDay) continue
    if (e.kind === "task" && e.deadline) {
      var deadline = new Date(e.start)
      if (!isFinite(deadline.getTime())) continue
      // Deadline markers use wall-clock minutes, including on DST transition days.
      var minute = deadline.getHours() * 60 + deadline.getMinutes() + deadline.getSeconds() / 60
      blocks.push({event:e, top:minute, bottom:Math.min(1440, minute + 1)})
      continue
    }
    var s =''')],
      'blacksheep.calendar/TimeGrid.qml': [
        ('y: (modelData.top - grid.hours.first * 60) / 60 * grid.hourHeight + 1', 'y: Math.min((modelData.top - grid.hours.first * 60) / 60 * grid.hourHeight + 1, scroller.contentHeight - height)'),
        ('text: block.ev.title', 'text: block.ev.kind === "task" ? "□ Due " + block.ev.taskTime + " · " + block.ev.title : block.ev.title')],
      'blacksheep.calendar/TaskEditor.qml': [
        ('  readonly property bool creating:', '  // Canvas Local deadline editor v2\n  readonly property bool localAssignment: !!draft && draft.provider === "canvas-local"\n  readonly property bool creating:'),
        ('dueField.text = draft.provider === "canvas-local" ? (draft.dueAt ? Qt.formatDateTime(new Date(draft.dueAt), "yyyy-MM-dd HH:mm") : "") : draft.due || ""', 'dueField.text = draft.provider === "canvas-local" ? (draft.dueAt ? Qt.formatDateTime(new Date(draft.dueAt), "yyyy-MM-dd") : "") : draft.due || ""\n    timeField.text = draft.provider === "canvas-local" && draft.dueAt ? Qt.formatTime(new Date(draft.dueAt), "HH:mm") : ""'),
        ('due: dueField.text, notes:', 'due: localAssignment && dueField.text ? dueField.text + " " + timeField.text : dueField.text, notes:'),
        ('Caption { text: editor.draft && editor.draft.provider === "canvas-local" ? "PERSONAL DEADLINE (LOCAL TIME)" : "DUE DATE"; font.letterSpacing: 1 }', 'Caption { text: editor.localAssignment ? "PERSONAL DUE DATE" : "DUE DATE"; font.letterSpacing: 1 }'),
        ('      id: dueField\n      width:', '      id: dueField\n      objectName: "taskDueDateField"\n      width:'),
        ('placeholderText: editor.draft && editor.draft.provider === "canvas-local" ? "YYYY-MM-DD HH:MM · blank for no deadline" : "YYYY-MM-DD · leave blank for no date"', 'placeholderText: "YYYY-MM-DD · leave blank for no deadline"'),
        ('    Caption { text: "NOTES";', '''    Caption { visible: editor.localAssignment; text: "DUE TIME (LOCAL, 24-HOUR)"; font.letterSpacing: 1 }
    TextField {
      id: timeField
      objectName: "taskDueTimeField"
      visible: editor.localAssignment
      width: parent.width
      placeholderText: "HH:MM · required when a date is set"
      foreground: editor.foreground
      font.family: editor.fontFamily
      readOnly: !editor.editable || editor.saving
      Keys.onReturnPressed: editor.submit()
      Keys.onEscapePressed: editor.cancel()
    }
    Caption {
      visible: editor.localAssignment
      width: parent.width
      wrapMode: Text.WordWrap
      text: "Times use this laptop's time zone. Editing sets a personal deadline; Canvas is unchanged."
    }
    Caption { text: "NOTES";''')],
    }


def plan(plugins, pending):
    result = dict(pending)
    for relative, (source, baseline) in SOURCES.items():
        path = plugins / relative
        current = result.get(path, path.read_text())
        desired = (ROOT / 'integrations/desktop' / source).read_text()
        if current != desired:
            accepted = {baseline}
            if relative == 'blacksheep.calendar/Tasks.js':
                accepted.add('a110eb3d44931fe6e026f049f32016208d95623a785bde596e4491511160527d')
                accepted.add('fba49bc64c3ce663ed80eef53ce6f9f9cdbdc70e70f62067eb6ab72a7b5f1592')
                accepted.add('dc2cb3534af6e2514894b5aac8129b1c4d3abc1c9daeba31d8f86481a27cbcbd')
            if relative == 'gavin.lock/Agenda.js':
                accepted.add('6e772906992ff98ac24ac2de60659a39a606879f3ffc9f8bb37544d999350c05')
                accepted.add('a34794cb695b81ae811a74577582104632a3e11f3dadee8e72f114725380bb22')
                accepted.add('853737e2738aca6fbee094a4329f28577cb06464b861d0ba796e52083c14fe19')
            if hashlib.sha256(current.encode()).hexdigest() not in accepted:
                raise RuntimeError('Refusing to overwrite unfamiliar deadline logic: ' + relative)
            result[path] = desired
    for relative, replacements in edits().items():
        path = plugins / relative
        text = result.get(path, path.read_text())
        if relative == 'blacksheep.calendar/TaskEditor.qml' and 'Canvas Local deadline editor v3' in text:
            continue
        if relative == 'blacksheep.calendar/TaskEditor.qml':
            # onDraftChanged can fire before bindings derived from draft are reevaluated.
            text = text.replace('dueField.text = localAssignment ?', 'dueField.text = draft.provider === "canvas-local" ?')
            text = text.replace('timeField.text = localAssignment &&', 'timeField.text = draft.provider === "canvas-local" &&')
        for before, after in replacements:
            if after in text:
                continue
            if text.count(before) != 1:
                raise RuntimeError('Deadline integration stopped before changes: ' + relative + '\n' + before)
            text = text.replace(before, after, 1)
        if text != path.read_text():
            result[path] = text
    return list(result.items())
