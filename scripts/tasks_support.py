"""Install the custom Google Tasks subsystem onto a stock Datebook base.

Upstream Datebook never shipped task support; the task UI, task sync, the
creation flow and the AM/PM clock helpers below were added locally. This
planner lays that base down. The feature planners (deadlines, 12-hour
display, class colors, event colors, editor state) and integrate_desktop's
own edits then apply on top, so this must run first.

Idempotent: whole files are created once; later planners match-and-extend.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def plan(plugins, pending):
    from plugin_scope import installed
    result = dict(pending)
    sources = {
        'blacksheep.calendar/Tasks.js': 'integrations/desktop/Tasks.js',
        'blacksheep.calendar/TaskEditor.qml': 'integrations/desktop/TaskEditor.qml',
        'blacksheep.calendar/TaskList.qml': 'integrations/desktop/TaskList.qml',
        'blacksheep.calendar/CreationEditor.qml': 'integrations/desktop/CreationEditor.qml',
        'blacksheep.calendar/scripts/omcal/tasks.py': 'integrations/tasks.py',
        'blacksheep.calendar/tests/creation.test.js': 'integrations/desktop/tests/creation.test.js',
        'blacksheep.calendar/tests/task_cli_test.py': 'integrations/desktop/tests/task_cli_test.py',
        'blacksheep.calendar/tests/task_write_test.py': 'integrations/desktop/tests/task_write_test.py',
        'blacksheep.calendar/tests/tasks.test.js': 'integrations/desktop/tests/tasks.test.js',
        'blacksheep.calendar/tests/tasks_test.py': 'integrations/desktop/tests/tasks_test.py',
    }
    for relative, source in sources.items():
        if not installed(plugins, relative):
            continue
        target = plugins / relative
        if not target.exists():
            result[target] = (ROOT / source).read_text()

    # Already-applied marker per file: later planners edit inside these
    # regions, so a second run skips the whole file instead of matching
    # a base anchor that is legitimately gone.
    applied = {
      'blacksheep.calendar/BarWidget.qml': 'function newTask(): void',
      'blacksheep.calendar/ModernLayout.qml': 'id: viewButtons',
      'blacksheep.calendar/MonthGrid.qml': 'signal createItem(string key, int minutes)',
      'blacksheep.calendar/TimeGrid.qml': 'objectName: "timeGridScroller"',
      'blacksheep.calendar/Panel.qml': 'function openTask(task)',
      'blacksheep.calendar/Model.js': 'function creationSlot(',
      'blacksheep.calendar/scripts/omcal/sync.py': 'def sync_tasks(',
      'blacksheep.calendar/scripts/omcal/auth.py': 'def enable_google_tasks',
      'blacksheep.calendar/scripts/calendar-ctl': 'calendar-ctl enable-tasks',
      'blacksheep.calendar/tests/run.sh': 'node tests/tasks.test.js',
    }
    replacements = {
      'blacksheep.calendar/BarWidget.qml': [
        ('    function newEvent(): void { root.newEvent() }',
         '    function newEvent(): void { root.newEvent() }\n    function newTask(): void {\n      if (!panelLoader.item) return\n      panelLoader.item.open()\n      panelLoader.item.newTask()\n    }\n    function showTask(uid: string): void {\n      if (!panelLoader.item) return\n      panelLoader.item.open()\n      panelLoader.item.showTask(uid)\n    }'),
      ],
      'blacksheep.calendar/ModernLayout.qml': [
        ('      ButtonGroup {\n        anchors.verticalCenter: parent.verticalCenter',
         '      ButtonGroup {\n        id: viewButtons\n        objectName: "datebookViewButtons"\n        anchors.verticalCenter: parent.verticalCenter'),
        ('''      Button {
        anchors.verticalCenter: parent.verticalCenter
        visible: layout.p && layout.p.editableCalendars.length > 0
        bordered: true
        iconText: "󰐕"
        text: "New"
        tooltipText: "New event on the selected day (n)"
        foreground: Color.accent
        fontFamily: layout.fontName
        onClicked: layout.p.newEvent()''',
         '''      Button {
        objectName: "datebookNewButton"
        anchors.verticalCenter: parent.verticalCenter
        height: viewButtons.height
        visible: layout.p && layout.p.creationOptions.length > 0
        bordered: true
        iconText: "󰐕"
        text: "New"
        tooltipText: "New event or task on the selected day (n)"
        foreground: viewButtons.foreground
        fontFamily: layout.fontName
        fontSize: viewButtons.fontSize
        iconSize: viewButtons.fontSize
        onClicked: layout.p.newItem()'''),
        ('''        byDay: layout.p ? layout.p.eventIndex.byDay : ({})
        foreground: layout.fg
        fontFamily: layout.fontName
        onPickDay: function(key) { layout.p.pickDay(key) }
      }

      // Calendars, by account: click one to show or hide it.''',
         '''        byDay: layout.p ? layout.p.calendarDayRows : ({})
        foreground: layout.fg
        fontFamily: layout.fontName
        onPickDay: function(key) { layout.p.pickDay(key) }
      }

      TaskList {
        width: parent.width
        p: layout.p
      }

      // Calendars, by account: click one to show or hide it.'''),
        ('''      byDay: layout.p ? layout.p.eventIndex.byDay : ({})
      use24h: layout.p ? layout.p.use24h : false
      foreground: layout.fg
      fontFamily: layout.fontName
      onPickDay: function(key) { layout.p.pickDay(key) }
      onOpenDay: function(key) { layout.p.openDay(key) }
      onOpenEvent: function(ev) { layout.p.openEditor(ev) }''',
         '''      byDay: layout.p ? layout.p.calendarDayRows : ({})
      use24h: layout.p ? layout.p.use24h : false
      foreground: layout.fg
      fontFamily: layout.fontName
      onPickDay: function(key) { layout.p.pickDay(key) }
      onOpenDay: function(key) { layout.p.openDay(key) }
      onCreateItem: function(key, minutes) { layout.p.newItem(key, minutes) }
      onOpenEvent: function(ev) { if (ev.kind === "task") layout.p.openTask(ev); else layout.p.openEditor(ev) }'''),
        ('''      byDay: layout.p ? layout.p.eventIndex.byDay : ({})
      todayKey: layout.p ? layout.p.todayKey : ""
      use24h: layout.p ? layout.p.use24h : false
      foreground: layout.fg
      fontFamily: layout.fontName
      // As many hours as the space allows; the rest scroll.''',
         '''      byDay: layout.p ? layout.p.calendarDayRows : ({})
      todayKey: layout.p ? layout.p.todayKey : ""
      use24h: layout.p ? layout.p.use24h : false
      foreground: layout.fg
      fontFamily: layout.fontName
      // As many hours as the space allows; the rest scroll.'''),
        ('''      onOpenEvent: function(ev) { layout.p.openEditor(ev) }
      onJoinEvent: function(url) { layout.p.openUrl(url) }
      onPickDay: function(key) { layout.p.openDay(key) }
    }

    YearView {''',
         '''      onOpenEvent: function(ev) { if (ev.kind === "task") layout.p.openTask(ev); else layout.p.openEditor(ev) }
      onJoinEvent: function(url) { layout.p.openUrl(url) }
      onPickDay: function(key) { layout.p.openDay(key) }
      onCreateItem: function(key, minutes) { layout.p.newItem(key, minutes) }
    }

    YearView {'''),
        ('''      yearNumber: layout.p ? Model.keyToDate(layout.p.selectedKey).getFullYear() : 2026
      byDay: layout.p ? layout.p.eventIndex.byDay : ({})''',
         '''      yearNumber: layout.p ? Model.keyToDate(layout.p.selectedKey).getFullYear() : 2026
      byDay: layout.p ? layout.p.calendarDayRows : ({})'''),
        ('    Flickable {\n      anchors.fill: parent\n      anchors.margins: Style.space(14)\n      contentHeight: sheetEditor.implicitHeight\n      clip: true\n      boundsBehavior: Flickable.StopAtBounds\n\n      EventEditor {\n        id: sheetEditor\n        width: parent.width\n        draft: layout.p && layout.p.modern ? layout.p.draft : null\n        event: layout.p ? layout.p.draftEvent : null\n        calendars: layout.p ? layout.p.editableCalendars : []\n        saving: layout.p ? layout.p.writingUid !== "" : false\n        error: layout.p ? layout.p.editorError : ""\n        foreground: layout.fg\n        fontFamily: layout.fontName\n        onSave: function(d) { layout.p.saveDraft(d) }\n        onCancel: layout.p.closeEditor()\n        onRemove: function(series) { layout.p.removeDraftEvent(series) }\n        onRespond: function(answer, series) { layout.p.respondFromEditor(answer, series) }\n        onOpenLink: function(url) { layout.p.openUrl(url) }\n      }',
         '    Flickable {\n      anchors.fill: parent\n      anchors.margins: Style.space(14)\n      contentHeight: sheetEditors.implicitHeight\n      clip: true\n      boundsBehavior: Flickable.StopAtBounds\n\n      Column {\n        id: sheetEditors\n        width: parent.width\n\n      EventEditor {\n        id: sheetEditor\n        visible: !!layout.p && !layout.p.creating && layout.p.draft !== null\n        height: visible ? implicitHeight : 0\n        width: parent.width\n        draft: layout.p && layout.p.modern && !layout.p.creating ? layout.p.draft : null\n        event: layout.p ? layout.p.draftEvent : null\n        calendars: layout.p ? layout.p.editableCalendars : []\n        saving: layout.p ? layout.p.writingUid !== "" : false\n        error: layout.p ? layout.p.editorError : ""\n        foreground: layout.fg\n        fontFamily: layout.fontName\n        onSave: function(d) { layout.p.saveDraft(d) }\n        onCancel: layout.p.closeEditor()\n        onRemove: function(series) { layout.p.removeDraftEvent(series) }\n        onRespond: function(answer, series) { layout.p.respondFromEditor(answer, series) }\n        onOpenLink: function(url) { layout.p.openUrl(url) }\n      }\n      TaskEditor {\n        visible: !!layout.p && !layout.p.creating && layout.p.taskDraft !== null\n        height: visible ? implicitHeight : 0\n        width: parent.width\n        draft: layout.p && layout.p.modern && !layout.p.creating ? layout.p.taskDraft : null\n        lists: layout.p ? layout.p.editableTaskLists : []\n        saving: !!layout.p && layout.p.writingUid !== ""\n        error: layout.p ? layout.p.editorError : ""\n        foreground: layout.fg\n        fontFamily: layout.fontName\n        onSave: function(task) { layout.p.saveTask(task) }\n        onCancel: layout.p.closeEditor()\n        onComplete: layout.p.completeTask(layout.p.taskDraft)\n        onRemove: layout.p.deleteTask(layout.p.taskDraft)\n        onOpenLink: function(url) { layout.p.openUrl(url) }\n      }\n      CreationEditor {\n        visible: !!layout.p && layout.p.creating\n        width: parent.width\n        height: visible ? implicitHeight : 0\n        p: layout.p && layout.p.modern ? layout.p : null\n      }\n      }'),
      ],
      'blacksheep.calendar/Panel.qml': [
        ('import "Model.js" as Model',
         'import "Model.js" as Model\nimport "Tasks.js" as Tasks'),
        ('  property var eventData: null',
         '  property var eventData: null\n  property bool showAllTasks: false\n  readonly property bool hasGoogleAccounts: !!eventData && (eventData.accounts || []).some(function(a) { return a.provider === "google" })\n  readonly property var selectedTasks: Tasks.forDay(eventData, selectedKey, todayKey, showAllTasks)\n  readonly property var tasksByDay: Tasks.indexByDay(eventData, String(Color.accent))\n  readonly property var calendarDayRows: Tasks.mergeDays(eventIndex.byDay, tasksByDay)\n  readonly property string tasksProblemText: {\n    var accounts = eventData && eventData.accounts || []\n    return accounts.filter(function(a) { return a.provider === "google" && a.tasksStatus !== "ok" }).map(function(a) {\n      return a.name + ": " + (a.tasksError || "Google Tasks has not synced yet.")\n    }).join("\\n")\n  }'),
        ('  property var draft: null\n  property var draftEvent: null',
         '  property var draft: null\n  property var taskDraft: null\n  property bool creating: false\n  property string creationKind: "event"\n  readonly property var creationOptions: {\n    var options = []\n    if (editableCalendars.length) options.push({label: "Event", value: "event"})\n    if (editableTaskLists.length) options.push({label: "Task", value: "task"})\n    return options\n  }\n  property var draftEvent: null'),
        ('  readonly property bool editorOpen: draft !== null\n\n  readonly property var editableCalendars: {',
        '  readonly property bool editorOpen: draft !== null || taskDraft !== null\n  readonly property var editableTaskLists: {\n    return ((eventData && eventData.taskLists) || []).filter(function(list) { return list.editable }).map(function(list) {\n      return { value: list.account + "/" + list.id, label: list.account + ": " + (list.title || "Tasks") }\n    })\n  }\n\n  function openTask(task) {\n    if (!task || !task.uid) return\n    root.creating = false\n    root.draft = null\n    root.draftEvent = null\n    root.editorError = ""\n    root.taskDraft = Object.assign({}, task, { mode: "update" })\n  }\n\n  function newTask() {\n    if (!root.editableTaskLists.length) return\n    root.newItem(root.selectedKey, -1, "task")\n  }\n\n  function newItem(day, minutes, kind) {\n    if (!root.creationOptions.length) return\n    var key = Model.parseDateText(day || root.selectedKey) || root.todayKey\n    root.selectedKey = key\n    root.editorError = ""\n    root.draftEvent = null\n    root.creating = true\n    root.creationKind = kind === "task" && root.editableTaskLists.length ? "task"\n      : root.editableCalendars.length ? "event" : "task"\n    root.draft = Model.newDraft(key, new Date(), root.defaultCalendar(), minutes)\n    root.taskDraft = { mode: "create", title: "", due: key, notes: "", listRef: root.editableTaskLists.length ? root.editableTaskLists[0].value : "", editable: true }\n  }\n\n  function switchCreationKind(kind, captured) {\n    if (kind === root.creationKind || !root.creating) return\n    var previous = root.creationKind\n    root.creationKind = kind\n    root.editorError = ""\n    if (previous === "event") {\n      root.draft = captured\n      root.taskDraft = Object.assign({}, root.taskDraft, {title: captured.title, due: captured.date})\n    } else {\n      root.taskDraft = captured\n      var date = Model.parseDateText(captured.due) || root.selectedKey\n      root.draft = Object.assign(Model.moveCreationDate(root.draft, date), {title: captured.title})\n    }\n  }\n\n  function showTask(uid) {\n    var tasks = (root.eventData && root.eventData.tasks) || []\n    for (var i = 0; i < tasks.length; i++) {\n      if (tasks[i].uid !== uid) continue\n      if (tasks[i].due) root.pickDay(tasks[i].due)\n      root.openTask(tasks[i])\n      return\n    }\n  }\n\n  function saveTask(task) {\n    var title = String(task.title || "").trim()\n    if (!title) { root.editorError = "A task needs a title."; return }\n    var due = Model.parseDateText(task.due)\n    if (task.due && !due) { root.editorError = "Use a valid date: YYYY-MM-DD."; return }\n    var args = [task.mode === "create" ? "task-create" : "task-update", task.mode === "create" ? task.listRef : task.uid]\n    if (task.mode === "create" || title !== root.taskDraft.title) args = args.concat(["--title", title])\n    if (task.mode === "create" || due !== (root.taskDraft.due || "")) args = args.concat(["--due", due])\n    if (task.mode === "create" || (task.notes || "") !== (root.taskDraft.notes || "")) args = args.concat(["--notes", task.notes || ""])\n    if (args.length === 2) { root.closeEditor(); return }\n    root.runWrite(task.uid, args)\n  }\n\n  function completeTask(task) {\n    if (task && task.editable) root.runWrite(task.uid, ["task-complete", task.uid])\n  }\n\n  function deleteTask(task) {\n    if (task && task.editable) root.runWrite(task.uid, ["task-delete", task.uid])\n  }\n\n  readonly property var editableCalendars: {'),
        ('  function openEditor(ev) {\n    if (!ev || !ev.uid) return\n    root.editorError = ""\n    root.draftEvent = ev\n    root.draft = Model.eventDraft(ev)\n  }',
         '  function openEditor(ev) {\n    if (!ev || !ev.uid) return\n    root.creating = false\n    root.editorError = ""\n    root.taskDraft = null\n    root.draftEvent = ev\n    root.draft = Model.eventDraft(ev)\n  }'),
        ('  function closeEditor() {\n    root.draft = null\n    root.draftEvent = null\n    root.editorError = ""',
         '  function closeEditor() {\n    root.creating = false\n    root.taskDraft = null\n    root.draft = null\n    root.draftEvent = null\n    root.editorError = ""'),
        ('  function newEvent() {\n    root.editorError = ""\n    root.draftEvent = null\n    root.draft = Model.newDraft(root.selectedKey, new Date(), root.defaultCalendar())\n  }',
         '  function newEvent() {\n    root.newItem(root.selectedKey, -1, "event")\n  }'),
        ('            visible: root.editorOpen',
         '            visible: !root.creating && root.draft !== null'),
        ('            draft: root.modern ? null : root.draft',
         '            draft: root.modern || root.creating ? null : root.draft'),
        ('            onOpenLink: function(url) { root.openUrl(url) }\n          }\n\n          // ---- Which view: only in the expanded layout now',
         '            onOpenLink: function(url) { root.openUrl(url) }\n          }\n\n          TaskEditor {\n            visible: !root.creating && root.taskDraft !== null\n            width: Math.min(parent.width, Style.space(520))\n            anchors.horizontalCenter: parent.horizontalCenter\n            height: visible ? implicitHeight : 0\n            draft: root.modern || root.creating ? null : root.taskDraft\n            lists: root.editableTaskLists\n            saving: root.writingUid !== ""\n            error: root.editorError\n            foreground: root.contentForeground\n            fontFamily: root.contentFontFamily\n            onSave: function(task) { root.saveTask(task) }\n            onCancel: root.closeEditor()\n            onComplete: root.completeTask(root.taskDraft)\n            onRemove: root.deleteTask(root.taskDraft)\n            onOpenLink: function(url) { root.openUrl(url) }\n          }\n\n          CreationEditor {\n            visible: root.creating\n            width: Math.min(parent.width, Style.space(520))\n            anchors.horizontalCenter: parent.horizontalCenter\n            height: visible ? implicitHeight : 0\n            p: root.modern ? null : root\n          }\n\n          // ---- Which view: only in the expanded layout now'),
        ('            byDay: root.eventIndex.byDay\n            todayKey: root.todayKey\n            use24h: root.use24h',
         '            byDay: root.calendarDayRows\n            todayKey: root.todayKey\n            use24h: root.use24h'),
        ('            onOpenEvent: function(ev) { root.openEditor(ev) }\n            onJoinEvent: function(url) { root.openUrl(url) }\n            onPickDay: function(key) { root.openDay(key) }\n          }\n\n          // ---- The year.',
         '            onOpenEvent: function(ev) { if (ev.kind === "task") root.openTask(ev); else root.openEditor(ev) }\n            onJoinEvent: function(url) { root.openUrl(url) }\n            onPickDay: function(key) { root.openDay(key) }\n            onCreateItem: function(key, minutes) { root.newItem(key, minutes) }\n          }\n\n          // ---- The year.'),
        ('                        onClicked: root.selectDay(dayCell.modelData)',
         '                        onClicked: root.selectDay(dayCell.modelData)\n                        onDoubleClicked: root.newItem(dayCell.modelData.key, -1)'),
        ('                text: "Nothing on."',
         '                text: root.selectedTasks.length ? "No events." : "Nothing on."'),
        ('              // An account that needs attention says so here, not silently.',
         '              TaskList {\n                width: agenda.width\n                p: root\n              }\n\n              // An account that needs attention says so here, not silently.'),
        ('                  text: "New"\n                  tooltipText: "New event on this day (n)"\n                  visible: root.editableCalendars.length > 0',
         '                  text: "New"\n                  tooltipText: "New event or task on this day (n)"\n                  visible: root.creationOptions.length > 0'),
        ('                  onClicked: root.newEvent()',
         '                  onClicked: root.newItem()'),
      ],
      'blacksheep.calendar/scripts/calendar-ctl': [
        ('    calendar-ctl add-google <name> <client_secret.json>\n',
         '    calendar-ctl add-google <name> <client_secret.json>\n    calendar-ctl enable-tasks <name>  # grant read/write Google Tasks access, then sync\n    calendar-ctl task-create <account>/<list id> --title <t> [--due YYYY-MM-DD] [--notes <text>]\n    calendar-ctl task-update <uid> [--title <t>] [--due YYYY-MM-DD] [--notes <text>]\n    calendar-ctl task-complete <uid> [--no-sync]  # always writes Google and publishes the cache\n    calendar-ctl task-delete <uid>\n'),
        ('    if cmd == "add-google" and len(args) == 2:\n        add_google(*args)\n',
         '    if cmd == "add-google" and len(args) == 2:\n        add_google(*args)\n    elif cmd == "enable-tasks" and len(args) == 1:\n        enable_google_tasks(args[0])\n        from omcal import sync\n        sync.main(["sync"])\n'),
        ('    elif cmd == "calendars" and not args:\n        cmd_calendars()\n',
         '    elif cmd == "calendars" and not args:\n        cmd_calendars()\n    elif cmd in ("task-create", "task-update") and args:\n        from omcal import tasks, sync\n        options, values = {}, iter(args[1:])\n        for flag in values:\n            if flag not in ("--title", "--due", "--notes"):\n                die("unknown task option: " + flag)\n            value = next(values, None)\n            if value is None:\n                die(flag + " needs a value")\n            options[flag[2:]] = value\n        if cmd == "task-create":\n            if "title" not in options:\n                die("task-create needs --title")\n            print(tasks.create(args[0], **options))\n        else:\n            tasks.update(args[0], **options)\n        sync.main(["sync", "--quiet"])\n    elif cmd == "task-complete" and len(args) in (1, 2) and args[1:] in ([], ["--no-sync"]):\n        from omcal import tasks, sync\n        tasks.update(args[0], completed=True)\n        if "--no-sync" not in args[1:]:\n            sync.main(["sync", "--quiet"])\n    elif cmd == "task-delete" and len(args) == 1:\n        from omcal import tasks, sync\n        tasks.delete(args[0])\n        sync.main(["sync", "--quiet"])\n'),
      ],
      'blacksheep.calendar/MonthGrid.qml': [
        ('// "+n more". Click a day to select it, double-click to open it in the day\n// view; click an event to open it.',
         '// "+n more". Click a day to select it, double-click to create on that date;\n// click an event to open it.'),
        ('  signal pickDay(string key)\n  signal openDay(string key)\n  signal openEvent(var ev)',
         '  signal pickDay(string key)\n  signal openDay(string key)\n  signal openEvent(var ev)\n  signal createItem(string key, int minutes)'),
        ('            onDoubleClicked: month.openDay(cell.modelData.key)',
         '            onDoubleClicked: month.createItem(cell.modelData.key, -1)'),
        ('                  text: (chip.modelData.allDay ? "" : month.timeOf(chip.modelData) + " ") + chip.modelData.title',
         '                  text: (chip.modelData.kind === "task" ? "\u25a1 " : chip.modelData.allDay ? "" : month.timeOf(chip.modelData) + " ") + chip.modelData.title'),
      ],
      'blacksheep.calendar/TimeGrid.qml': [
        ('  signal openEvent(var ev)\n  signal joinEvent(string url)\n  signal pickDay(string key)',
         '  signal openEvent(var ev)\n  signal joinEvent(string url)\n  signal pickDay(string key)\n  signal createItem(string key, int minutes)'),
        ('          text: "+" + (allDayCol.items.length - 2) + " more"\n          color: Qt.darker(grid.foreground, 1.5)\n          font.family: grid.fontFamily\n          font.pixelSize: Style.font.caption\n        }',
         '          text: "+" + (allDayCol.items.length - 2) + " more"\n          color: Qt.darker(grid.foreground, 1.5)\n          font.family: grid.fontFamily\n          font.pixelSize: Style.font.caption\n          MouseArea {\n            anchors.fill: parent\n            cursorShape: Qt.PointingHandCursor\n            onClicked: grid.pickDay(allDayCol.modelData)\n          }\n        }'),
        ('  Flickable {\n    id: scroller\n    anchors.top: allDay.bottom',
         '  Flickable {\n    id: scroller\n    objectName: "timeGridScroller"\n    anchors.top: allDay.bottom'),
        ('      width: scroller.width\n      height: scroller.contentHeight',
         '      width: scroller.width\n      height: scroller.contentHeight\n\n      MouseArea {\n        objectName: "timeGridCreationArea"\n        x: grid.gutter\n        width: parent.width - x\n        height: parent.height\n        onDoubleClicked: function(mouse) {\n          var slot = Model.creationSlot(grid.days, mouse.x, mouse.y, grid.colWidth, grid.hourHeight, grid.hours.first)\n          if (slot) grid.createItem(slot.day, slot.minutes)\n        }\n      }'),
        ('              text: parent.modelData.title',
         '              text: (parent.modelData.kind === "task" ? "\u25a1 " : "") + parent.modelData.title'),
      ],
      'blacksheep.calendar/Model.js': [
        ('''// A new event on dayKey: the next whole hour today, 9am on any other day.
function newDraft(dayKey, now, calendarRef) {
  var start = dayKey === keyForDate(now) ? Math.min(23 * 60, (now.getHours() + 1) * 60) : 9 * 60
  return { mode: "create", uid: "", calendar: calendarRef || "", title: "", location: "",
           allDay: false, date: dayKey, endDate: dayKey,
           from: clockInput(start), to: clockInput(Math.min(start + 60, 23 * 60 + 59)),
           invite: "", series: false, recurring: false, busy: true, original: null }
}''',
         '''// A new event on dayKey: the next whole hour today, 9am on any other day.
function newDraft(dayKey, now, calendarRef, startMinutes) {
  var explicit = typeof startMinutes === "number" && isFinite(startMinutes) && startMinutes >= 0
  var start = explicit ? Math.min(1439, Math.round(startMinutes))
    : dayKey === keyForDate(now) ? Math.min(23 * 60, (now.getHours() + 1) * 60) : 9 * 60
  var end = explicit ? start + 60 : Math.min(start + 60, 23 * 60 + 59)
  return { mode: "create", uid: "", calendar: calendarRef || "", title: "", location: "",
           allDay: false, date: dayKey, endDate: end >= 1440 ? addDays(dayKey, 1) : dayKey,
           from: clockInput(start), to: clockInput(end % 1440),
           invite: "", series: false, recurring: false, busy: true, original: null }
}

// Pointer coordinates in the scroll CONTENT, so scrolling does not shift time.
function creationSlot(days, x, y, colWidth, hourHeight, firstHour) {
  if (!days || !days.length || !(colWidth > 0) || !(hourHeight > 0) || !isFinite(colWidth) || !isFinite(hourHeight) || !isFinite(firstHour) || !isFinite(x) || !isFinite(y) || x < 0 || y < 0) return null
  var col = Math.floor(x / colWidth)
  if (col >= days.length) return null
  var minutes = Math.floor((firstHour * 60 + y * 60 / hourHeight) / 15) * 15
  return { day: days[col], minutes: Math.max(0, Math.min(1425, minutes)) }
}

function moveCreationDate(draft, date) {
  var span = Math.round((Date.parse(draft.endDate + "T00:00:00Z") - Date.parse(draft.date + "T00:00:00Z")) / 86400000)
  return Object.assign({}, draft, {date: date, endDate: addDays(date, isFinite(span) ? Math.max(0, span) : 0)})
}'''),
        ('    reminderText: reminderText\n  }',
         '    reminderText: reminderText,\n    newDraft: newDraft,\n    creationSlot: creationSlot,\n    moveCreationDate: moveCreationDate\n  }'),
      ],
      'blacksheep.calendar/scripts/omcal/auth.py': [
        ('GOOGLE_SCOPES = "openid email https://www.googleapis.com/auth/calendar"',
         'GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks"\nGOOGLE_SCOPES = "openid email https://www.googleapis.com/auth/calendar " + GOOGLE_TASKS_SCOPE'),
    ('    verifier = secrets.token_urlsafe(64)\n    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()\n    state = secrets.token_urlsafe(24)\n    got = {}\n\n    class Handler(http.server.BaseHTTPRequestHandler):\n        timeout = 10  # a connection that sends nothing is dropped, not waited on\n\n        def do_GET(self):\n            q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)\n            if q.get("state", [""])[0] != state:\n                self.send_response(400); self.end_headers(); return\n            got["code"] = q.get("code", [""])[0]\n            got["error"] = q.get("error", [""])[0]\n            self.send_response(200)\n            self.send_header("Content-Type", "text/html; charset=utf-8")\n            self.end_headers()\n            self.wfile.write("<p>Signed in. You can close this tab and go back to the terminal.</p>".encode())\n\n        def log_message(self, *a):\n            pass\n\n    srv = http.server.HTTPServer(("127.0.0.1", 0), Handler)\n    redirect = "http://127.0.0.1:%d/" % srv.server_port\n    url = GOOGLE_AUTH + "?" + urllib.parse.urlencode({\n        "client_id": cid, "redirect_uri": redirect, "response_type": "code",\n        "scope": GOOGLE_SCOPES, "access_type": "offline", "prompt": "consent",\n        "code_challenge": challenge, "code_challenge_method": "S256", "state": state})\n    print("Opening your browser to sign in to Google. If it doesn\'t open, visit:\\n\\n  %s\\n" % url)\n    subprocess.Popen(["xdg-open", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)\n    # Serve until the real redirect arrives: a stray request (a favicon, or\n    # another local account poking the port) gets a 400 and doesn\'t end it.\n    srv.timeout = 1\n    deadline = time.time() + 300\n    while "code" not in got and time.time() < deadline:\n        srv.handle_request()\n    srv.server_close()\n    if got.get("error") or not got.get("code"):\n        die("Google sign-in did not finish: %s" % (got.get("error") or "timed out"))\n\n    t = post_form(GOOGLE_TOKEN, {\n        "client_id": cid, "client_secret": csecret, "code": got["code"],\n        "code_verifier": verifier, "redirect_uri": redirect, "grant_type": "authorization_code"})\n    if "refresh_token" not in t:\n        die("Google gave no refresh token (%s)" % token_error(t))\n    secret_store(name, {"refresh_token": t["refresh_token"], "client_secret": csecret})\n    who = get_json("https://openidconnect.googleapis.com/v1/userinfo", t["access_token"]).get("email", "")\n    save_account({"name": name, "provider": "google", "clientId": cid, "email": who})\n    print("Added %s (%s)." % (name, who))',
     '    t, who = google_authorize(cid, csecret)\n    secret_store(name, {"refresh_token": t["refresh_token"], "client_secret": csecret})\n    save_account({"name": name, "provider": "google", "clientId": cid, "email": who,\n                  "tasksWritable": not t.get("scope") or GOOGLE_TASKS_SCOPE in t["scope"].split()})\n    print("Added %s (%s)." % (name, who))\n\n\ndef enable_google_tasks(name):\n    """Upgrade an existing sign-in using the client secret already in the keyring."""\n    a = account(name)\n    if a["provider"] != "google":\n        die("Google Tasks requires a Google account")\n    saved = secret_load(name)\n    t, who = google_authorize(a["clientId"], saved["client_secret"], a.get("email", ""))\n    if a.get("email") and who.casefold() != a["email"].casefold():\n        raise AuthError("You selected a different Google account; the existing sign-in was kept.")\n    granted = set(t.get("scope", "").split())\n    if t.get("scope") and not {GOOGLE_TASKS_SCOPE, "https://www.googleapis.com/auth/calendar"}.issubset(granted):\n        raise AuthError("Calendar and read/write Tasks access must both be allowed; the existing sign-in was kept.")\n    saved["refresh_token"] = t["refresh_token"]\n    secret_store(name, saved)\n    a["tasksWritable"] = not t.get("scope") or GOOGLE_TASKS_SCOPE in granted\n    save_account(a)\n    print("Enabled read/write Google Tasks access for %s." % name)\n\n\ndef google_authorize(cid, csecret, login_hint=""):\n\n    verifier = secrets.token_urlsafe(64)\n    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()\n    state = secrets.token_urlsafe(24)\n    got = {}\n\n    class Handler(http.server.BaseHTTPRequestHandler):\n        timeout = 10  # a connection that sends nothing is dropped, not waited on\n\n        def do_GET(self):\n            q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)\n            if q.get("state", [""])[0] != state:\n                self.send_response(400); self.end_headers(); return\n            got["code"] = q.get("code", [""])[0]\n            got["error"] = q.get("error", [""])[0]\n            self.send_response(200)\n            self.send_header("Content-Type", "text/html; charset=utf-8")\n            self.end_headers()\n            self.wfile.write("<p>Signed in. You can close this tab and go back to the terminal.</p>".encode())\n\n        def log_message(self, *a):\n            pass\n\n    srv = http.server.HTTPServer(("127.0.0.1", 0), Handler)\n    redirect = "http://127.0.0.1:%d/" % srv.server_port\n    parameters = {\n        "client_id": cid, "redirect_uri": redirect, "response_type": "code",\n        "scope": GOOGLE_SCOPES, "access_type": "offline", "prompt": "consent",\n        "code_challenge": challenge, "code_challenge_method": "S256", "state": state,\n        "include_granted_scopes": "true"}\n    if login_hint:\n        parameters["login_hint"] = login_hint\n    url = GOOGLE_AUTH + "?" + urllib.parse.urlencode(parameters)\n    print("Opening your browser to sign in to Google. If it doesn\'t open, visit:\\n\\n  %s\\n" % url)\n    subprocess.Popen(["xdg-open", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)\n    # Serve until the real redirect arrives: a stray request (a favicon, or\n    # another local account poking the port) gets a 400 and doesn\'t end it.\n    srv.timeout = 1\n    deadline = time.time() + 900\n    while "code" not in got and time.time() < deadline:\n        srv.handle_request()\n    srv.server_close()\n    if got.get("error") or not got.get("code"):\n        die("Google sign-in did not finish: %s" % (got.get("error") or "timed out"))\n\n    t = post_form(GOOGLE_TOKEN, {\n        "client_id": cid, "client_secret": csecret, "code": got["code"],\n        "code_verifier": verifier, "redirect_uri": redirect, "grant_type": "authorization_code"})\n    if "refresh_token" not in t:\n        die("Google gave no refresh token (%s)" % token_error(t))\n    who = get_json("https://openidconnect.googleapis.com/v1/userinfo", t["access_token"]).get("email", "")\n    return t, who'),
      ],
      'blacksheep.calendar/scripts/omcal/sync.py': [
        ('from . import auth, files, google, graph',
         'from . import auth, files, google, graph, tasks'),
        ('        if a["provider"] == "google":\n            tok, prov = auth.google_access(a), google\n        else:',
         '        if a["provider"] == "google":\n            tok, prov = auth.google_access(a), google\n            sync_tasks(a, tok, st, now, log)\n        else:'),
        ('    except auth.AuthError as e:\n        status, error = "signin", str(e)',
         '    except auth.AuthError as e:\n        status, error = "signin", str(e)\n        if a["provider"] == "google":\n            st["tasksStatus"], st["tasksError"] = "signin", "Sign in again to sync Google Tasks."'),
        ('def _fetch(a, prov, tok, cal, window, cursor):',
         'def sync_tasks(a, token, state, now, log):\n    """A task permission/network failure never interrupts Calendar sync."""\n    try:\n        lists, items = tasks.snapshot(a["name"], token, bool(a.get("tasksWritable")))\n        state.update(taskLists=lists, tasks=items, tasksStatus="ok", tasksError="", tasksLastSync=now)\n        log("  %s / Google Tasks: %d lists, %d unfinished tasks" % (a["name"], len(lists), len(items)))\n    except auth.HttpError as e:\n        setup = e.code == 403 and any(s in str(e).lower() for s in ("has not been used", "disabled", "accessnotconfigured"))\n        state["tasksStatus"] = "setup" if setup else "permission" if e.code in (401, 403) else "error"\n        state["tasksError"] = ("Enable Google Tasks API in this account\'s Google Cloud project."\n                               if setup else "Run calendar-ctl enable-tasks %s to allow Tasks access." % a["name"]\n                               if e.code in (401, 403) else str(e))\n    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError, ValueError) as e:\n        state["tasksStatus"], state["tasksError"] = "offline", "Could not refresh Google Tasks; keeping the last copy."\n\n\ndef _fetch(a, prov, tok, cal, window, cursor):'),
        ('           "window": window_now()[1], "accounts": [], "calendars": [], "events": []}',
         '           "window": window_now()[1], "accounts": [], "calendars": [], "events": [],\n           "taskSchema": 1, "taskLists": [], "tasks": []}'),
        ('                                "lastSync": st.get("lastSync")})',
         '                                "lastSync": st.get("lastSync"),\n                                "tasksStatus": st.get("tasksStatus", "unknown") if a["provider"] == "google" else "unsupported",\n                                "tasksWritable": bool(a.get("tasksWritable")),\n                                "tasksError": st.get("tasksError", ""), "tasksLastSync": st.get("tasksLastSync")})\n        if a["provider"] == "google":\n            out["taskLists"].extend(dict(t, account=a["name"]) for t in st.get("taskLists", []))\n            out["tasks"].extend(t for t in st.get("tasks", {}).values() if t.get("status") != "completed")'),
        ('    out["events"].sort(key=sort_key)',
         '    out["events"].sort(key=sort_key)\n    out["tasks"].sort(key=lambda t: (t.get("due") or "9999-12-31", t["account"], t.get("taskList", ""), t.get("position", ""), t["title"]))'),
        ('    log("%d events from %d calendars" % (len(out["events"]), len(out["calendars"])))',
         '    log("%d events from %d calendars" % (len(out["events"]), len(out["calendars"])))\n    log("%d unfinished Google Tasks" % len(out["tasks"]))\n    for a in out["accounts"]:\n        if a["tasksStatus"] not in ("ok", "unsupported"):\n            log("%s Tasks: %s" % (a["name"], a["tasksError"] or a["tasksStatus"]))'),
      ],
      'blacksheep.calendar/tests/run.sh': [
        ('TZ=America/Toronto node tests/model.test.js',
         'TZ=America/Toronto node tests/model.test.js\nTZ=America/Toronto node tests/tasks.test.js\nTZ=America/Toronto node tests/creation.test.js'),
      ],
    }
    for relative, edits in replacements.items():
        if not installed(plugins, relative):
            continue
        path = plugins / relative
        if path in result:
            text = result[path]
        elif not path.exists():
            text = ''
        else:
            text = path.read_text()
        if relative in applied and applied[relative] in text:
            continue
        for before, after in edits:
            if after in text:
                continue
            if text.count(before) != 1:
                raise RuntimeError('Tasks integration stopped before changes: ' + relative + '\n' + before)
            text = text.replace(before, after, 1)
        if text != (path.read_text() if path.exists() else ''):
            result[path] = text
    return list(result.items())
