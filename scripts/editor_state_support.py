"""Restore color-picker bindings after selection and when reopening an editor."""


def plan(plugins, pending):
    result = dict(pending)
    edits = {
      'blacksheep.calendar/Panel.qml': [
        ('Tasks.forDay(eventData, selectedKey, todayKey, showAllTasks, root.clockNow)', 'Tasks.forDay(eventData, selectedKey, todayKey, showAllTasks, root.clockNow).filter(Tasks.hasDate)'),
        ('provider: ((root.eventData.accounts || []).filter(function(a) {return a.name === c.account})[0] || {}).provider || ""', 'provider: ((root.eventData.accounts || []).filter(function(a) {return a.name === c.account})[0] || {}).provider || "", color: c.color || ""')],
      'blacksheep.calendar/TaskEditor.qml': [
        ('    classColorField.text = draft.color || "#616161"', '''    // Canvas Local picker state v2: Dropdown selection assigns value imperatively.
    classColorField.text = CourseColors.normalize(draft.color || "#616161")
    classColorPicker.value = Qt.binding(function() { return CourseColors.normalize(classColorField.text) })'''),
        ('      objectName: "taskClassColorPreset"', '      id: classColorPicker\n      objectName: "taskClassColorPreset"'),
        ('      options: CourseColors.options\n      value: classColorField.text', '      options: CourseColors.optionsFor(classColorField.text)\n      value: CourseColors.normalize(classColorField.text)'),
        ('      onChanged: function(value) { classColorField.text = value }', '''      onChanged: function(value) {
        classColorField.text = value
        classColorPicker.value = Qt.binding(function() { return CourseColors.normalize(classColorField.text) })
      }''')],
      'blacksheep.calendar/Model.js': [
        ('        provider: e.provider || "", colorId: e.colorId || "", eventLabelId: e.eventLabelId || "",', '        provider: e.provider || "", colorId: e.colorId || "", eventLabelId: e.eventLabelId || "",\n        eventColorKnown: e.provider === "google" || ("colorId" in e) || ("eventLabelId" in e),'),
        ('    eventColor: ev.eventLabelId ?', '    eventColorKnown: ev.eventColorKnown !== false, eventColorHint: ev.color || "",\n    eventColor: ev.eventLabelId ?')],
      'blacksheep.calendar/EventEditor.qml': [
        ('    editor.eventColorChoice = draft.eventColor || ""', '''    // Canvas Local picker state v2: use this draft, not potentially stale event bindings.
    var selectedCalendar = calendars.filter(function(c) { return c.value === draft.calendar })[0] || null
    editor.eventColorChoice = EventColors.initial(draft, selectedCalendar)
    eventColorPicker.value = Qt.binding(function() { return editor.eventColorChoice })'''),
        ('      objectName: "eventColorPicker"', '      id: eventColorPicker\n      objectName: "eventColorPicker"'),
        ('      onChanged: function(value) { editor.eventColorChoice = value; editor.eventColorChanged = true }', '''      onChanged: function(value) {
        editor.eventColorChoice = value
        editor.eventColorChanged = true
        eventColorPicker.value = Qt.binding(function() { return editor.eventColorChoice })
      }''')],
    }
    for relative, replacements in edits.items():
        path = plugins / relative
        text = result.get(path, path.read_text())
        for before, after in replacements:
            if after in text:
                continue
            if text.count(before) != 1:
                raise RuntimeError('Editor state integration stopped before changes: ' + relative + '\n' + before)
            text = text.replace(before, after, 1)
        if text != path.read_text():
            result[path] = text
    return list(result.items())
