"""Backed-up class-color controls and local-only task-update routing."""
from pathlib import Path
import hashlib
ROOT = Path(__file__).resolve().parents[1]


def plan(plugins, pending):
    from plugin_scope import installed
    result = dict(pending)
    if not installed(plugins, 'blacksheep.calendar/CourseColors.js'):
        return list(result.items())
    module = plugins / 'blacksheep.calendar/CourseColors.js'
    desired = (ROOT / 'integrations/desktop/CourseColors.js').read_text()
    if module.exists() and module.read_text() != desired and hashlib.sha256(module.read_bytes()).hexdigest() != '1d8030015c16dd4a9bb3bbd63b94f6058f783e59a7734aac4268a84718ae24b2':
        raise RuntimeError('Refusing to overwrite unfamiliar CourseColors.js')
    if not module.exists() or module.read_text() != desired:
        result[module] = desired
    replacements = {
      'blacksheep.calendar/scripts/calendar-ctl': [
        ('if flag not in ("--title", "--due", "--notes"):', 'if flag not in ("--title", "--due", "--notes", "--color"):'),
        ('        if cmd == "task-create":\n            if "title" not in options:', '''        if cmd == "task-update" and args[0].startswith("canvas-local/"):
            from omcal import canvas_local
            canvas_local.update(args[0], **options)
            return
        if "color" in options:
            die("Class colors are only available for local Canvas assignments.")
        if cmd == "task-create":
            if "title" not in options:''')],
      'blacksheep.calendar/Panel.qml': [
        ('      if (localArgs.length === 2)', '''      // Canvas Local class colors: editing one task updates its class/labs together.
      if (typeof task.classColor === "string" && task.classColor !== (root.taskDraft.color || "#616161")) localArgs = localArgs.concat(["--color", task.classColor])
      if (localArgs.length === 2)''')],
      'blacksheep.calendar/TaskList.qml': [
        ('tooltipText: taskRow.modelData.editable ? "Mark complete" : "Read-only task"\n        foreground: root.foreground',
         'tooltipText: taskRow.modelData.editable ? "Mark complete" : "Read-only task"\n        foreground: taskRow.modelData.color || root.foreground')],
      'blacksheep.calendar/TaskEditor.qml': [
        ('import "Clock.js" as Clock', 'import "Clock.js" as Clock\nimport "CourseColors.js" as CourseColors'),
        ('    notesField.text = draft.notes || ""', '    notesField.text = draft.notes || ""\n    classColorField.text = draft.color || "#616161"'),
        ('notes: notesField.text, listRef:', 'notes: notesField.text, classColor: classColorField.text.trim(), listRef:'),
        ('    Caption { text: "NOTES";', '''    Caption { visible: editor.localAssignment; text: "CLASS COLOR"; font.letterSpacing: 1 }
    Dropdown {
      objectName: "taskClassColorPreset"
      visible: editor.localAssignment
      width: parent.width
      showLabel: false
      options: CourseColors.options
      value: classColorField.text
      enabled: !editor.saving
      foreground: editor.foreground
      fontFamily: editor.fontFamily
      onChanged: function(value) { classColorField.text = value }
    }
    Row {
      visible: editor.localAssignment
      width: parent.width
      spacing: Style.space(8)
      Rectangle {
        width: Style.space(22); height: width
        anchors.verticalCenter: parent.verticalCenter
        radius: Style.cornerRadius
        color: /^#[0-9a-f]{6}$/i.test(classColorField.text) ? classColorField.text : "#616161"
      }
      TextField {
        id: classColorField
        objectName: "taskClassColorField"
        width: parent.width - Style.space(30)
        placeholderText: "Custom #RRGGBB, or blank to restore default"
        foreground: editor.foreground
        font.family: editor.fontFamily
        readOnly: !editor.editable || editor.saving
        Keys.onReturnPressed: editor.submit()
        Keys.onEscapePressed: editor.cancel()
      }
    }
    Caption {
      visible: editor.localAssignment
      width: parent.width
      wrapMode: Text.WordWrap
      text: "Applies to every assignment in this class, including its labs. Blank restores the class default."
    }
    Caption { text: "NOTES";''')],
    }
    for relative, edits in replacements.items():
        if not installed(plugins, relative):
            continue
        path = plugins / relative
        text = result.get(path, path.read_text())
        if relative == 'blacksheep.calendar/TaskEditor.qml' and 'Canvas Local picker state v2' in text:
            continue
        for before, after in edits:
            if after in text:
                continue
            if text.count(before) != 1:
                raise RuntimeError('Class color integration stopped before changes: ' + relative + '\n' + before)
            text = text.replace(before, after, 1)
        if text != path.read_text():
            result[path] = text
    return list(result.items())
