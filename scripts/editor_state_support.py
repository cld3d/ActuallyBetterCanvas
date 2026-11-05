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
        ('      objectName: "eventColorPicker"', '      id: eventColorPicker\n      objectName: "eventColorPicker"'),
        ('''    // Canvas Local picker state v2: use this draft, not potentially stale event bindings.
    var selectedCalendar = calendars.filter(function(c) { return c.value === draft.calendar })[0] || null
    editor.eventColorChoice = EventColors.initial(draft, selectedCalendar)
    eventColorPicker.value = Qt.binding(function() { return editor.eventColorChoice })''', '''    // Canvas Local picker state v3: swatches emit changed() without
    // assigning value, so the declarative value binding below survives
    // selection and reopening. Use this draft, not stale event bindings.
    var selectedCalendar = calendars.filter(function(c) { return c.value === draft.calendar })[0] || null
    editor.eventColorChoice = EventColors.initial(draft, selectedCalendar)'''),
        ('    editor.eventColorChoice = draft.eventColor || ""', '''    // Canvas Local picker state v3: see above.
    var selectedCalendar = calendars.filter(function(c) { return c.value === draft.calendar })[0] || null
    editor.eventColorChoice = EventColors.initial(draft, selectedCalendar)'''),
        ('''      onChanged: function(value) {
        editor.eventColorChoice = value
        editor.eventColorChanged = true
        eventColorPicker.value = Qt.binding(function() { return editor.eventColorChoice })
      }''', '      onChanged: function(value) { editor.eventColorChoice = value; editor.eventColorChanged = true }'),
      ],
    }
    optional = {
      # Fresh-install fallback: absent when the v2->v3 migration above already ran.
      'blacksheep.calendar/EventEditor.qml:    editor.eventColorChoice = draft.eventColor || ""',
    }
    # Dropdown->swatches migration: remove the legacy color Dropdown left behind
    # by the earlier integration (fresh installs never have it). Anchored on the
    # Dropdown's id so the swatch block's identical Caption cannot mismatch.
    legacy_dropdown = '''    Dropdown {
      id: eventColorPicker
      objectName: "eventColorPicker"
      visible: editor.googleCalendar && editor.editable
      width: parent.width
      showLabel: false
      options: editor.colorOptions
      value: editor.eventColorChoice
      enabled: !editor.saving
      foreground: editor.foreground
      fontFamily: editor.fontFamily
      onChanged: function(value) { editor.eventColorChoice = value; editor.eventColorChanged = true }
    }
'''
    legacy_caption = '''    Caption {
      visible: editor.googleCalendar && editor.editable
      width: parent.width
      wrapMode: Text.WordWrap
      text: "Saves to Google Calendar. Calendar default removes the event's color override. Sync to refresh calendar-specific labels."
      font.letterSpacing: 0
    }
'''
    editor_path = plugins / 'blacksheep.calendar/EventEditor.qml'
    editor_text = result.get(editor_path, editor_path.read_text())
    if editor_text.count(legacy_dropdown) == 1 and 'EventColorSwatches' in editor_text:
        editor_text = editor_text.replace(legacy_dropdown, '', 1)
        if editor_text.count(legacy_caption) == 2:
            editor_text = editor_text.replace(legacy_caption, '', 1)
        if editor_text != editor_path.read_text():
            result[editor_path] = editor_text
    for relative, replacements in edits.items():
        path = plugins / relative
        text = result.get(path, path.read_text())
        for before, after in replacements:
            if after in text:
                continue
            if text.count(before) != 1:
                if relative + ':' + before in optional:
                    continue
                raise RuntimeError('Editor state integration stopped before changes: ' + relative + '\n' + before)
            text = text.replace(before, after, 1)
        if text != path.read_text():
            result[path] = text
    return list(result.items())
