"""AM/PM display and input across Datebook; keep backend timestamps unchanged."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]


def plan(plugins, pending):
    result = dict(pending)
    clock = plugins / 'blacksheep.calendar/Clock.js'
    desired = (ROOT / 'integrations/desktop/Clock.js').read_text()
    if clock.exists() and clock.read_text() != desired:
        raise RuntimeError('Refusing to overwrite unfamiliar Datebook Clock.js')
    if not clock.exists():
        result[clock] = desired
    replacements = {
      'Panel.qml': [('readonly property bool use24h: !/ap/i.test(String(setting("format", "HH:mm")))', 'readonly property bool use24h: false // Personal preference: all Datebook times use AM/PM.')],
      'TaskEditor.qml': [
        ('import QtQuick.Controls as Controls', 'import QtQuick.Controls as Controls\nimport "Clock.js" as Clock'),
        ('// Canvas Local deadline editor v2', '// Canvas Local deadline editor v3 (AM/PM)'),
        ('Qt.formatTime(new Date(draft.dueAt), "HH:mm")', 'Qt.formatTime(new Date(draft.dueAt), "h:mm AP")'),
        ('dueField.text + " " + timeField.text', 'dueField.text + " " + Clock.canonical(timeField.text)'),
        ('DUE TIME (LOCAL, 24-HOUR)', 'DUE TIME (LOCAL, AM/PM)'),
        ('HH:MM · required when a date is set', 'h:mm AM/PM · e.g. 4:30 PM')],
      'EventEditor.qml': [
        ('import "Model.js" as Model', 'import "Model.js" as Model\nimport "Clock.js" as Clock'),
        ('fromField.text = draft.from', 'fromField.text = Clock.display(draft.from)'),
        ('toField.text = draft.to', 'toField.text = Clock.display(draft.to)'),
        ('d.from = fromField.text', 'd.from = Clock.canonical(fromField.text)'),
        ('d.to = toField.text', 'd.to = Clock.canonical(toField.text)'),
        ('placeholderText: "14:30"', 'placeholderText: "2:30 PM"'),
        ('placeholderText: "15:30"', 'placeholderText: "3:30 PM"')]
    }
    for relative, edits in replacements.items():
        path = plugins / 'blacksheep.calendar' / relative
        text = result.get(path, path.read_text())
        for before, after in edits:
            if after in text:
                continue
            if text.count(before) != 1:
                raise RuntimeError('AM/PM integration stopped before changes: ' + relative + '\n' + before)
            text = text.replace(before, after, 1)
        if text != path.read_text():
            result[path] = text
    return list(result.items())
