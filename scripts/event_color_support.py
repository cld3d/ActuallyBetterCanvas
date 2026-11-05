"""Provider-synced Google event colors, with exact matched and backed-up integration."""
from pathlib import Path
import hashlib
ROOT = Path(__file__).resolve().parents[1]


def replacements():
    return {
      'blacksheep.calendar/scripts/omcal/google.py': [
        ('def labels(tok, calendar_id):', 'def labels(tok, calendar_id, options=None):'),
        ('    try:\n        r = _get(API + "/calendars/%s?fields=labelProperties"', '    from . import event_colors as event_color_support\n    if options is not None:\n        options.extend(event_color_support.palette())\n    try:\n        r = _get(API + "/calendars/%s?fields=labelProperties"'),
        ('    out = {}\n    for l in ((r.get("labelProperties")', '    if options is not None:\n        options.extend(event_color_support.palette((r.get("labelProperties") or {}).get("eventLabels") or [])[12:])\n    out = {}\n    for l in ((r.get("labelProperties")'),
        ('        "color": color,\n        "allDay":', '        "color": color, "provider": "google", "colorId": str(e.get("colorId") or ""),\n        "eventLabelId": str(e.get("eventLabelId") or ""),\n        "allDay":')],
      'blacksheep.calendar/scripts/omcal/sync.py': [
        ('                label_maps[cal["id"]] = prov.labels(tok, cal["id"])', '                options = []\n                label_maps[cal["id"]] = prov.labels(tok, cal["id"], options)\n                cal["eventColors"] = options'),
        ('"editable": c.get("editable", False), "shown": c.get("shown", True)})', '"editable": c.get("editable", False), "shown": c.get("shown", True),\n                                      "eventColors": st.get("calendars", {}).get(c["id"], {}).get("eventColors", [])})')],
      'blacksheep.calendar/scripts/calendar-ctl': [
        ('"--location": "location"}', '"--location": "location", "--event-color": "color"}')],
      'blacksheep.calendar/scripts/omcal/edit.py': [
        ('from . import auth, sync', 'from . import auth, sync, event_colors'),
        ('def create(ref, title, start, end=None, all_day=False, location="", invite=(), busy=None):', 'def create(ref, title, start, end=None, all_day=False, location="", invite=(), busy=None, color=None):'),
        ('    a, cal = calendar_of(ref)\n    all_day', '    a, cal = calendar_of(ref)\n    if color is not None:\n        if a["provider"] != "google":\n            raise EditError("Event colors are supported only for Google Calendar.")\n        event_colors.validate(color)\n    all_day'),
        ('        ev = auth.send_json("POST", GOOGLE + "/calendars/%s/events?sendUpdates=all" % q(cal["id"]), tok, body)\n        new = google.normalise(a["name"], cal, ev)', '        if color is not None:\n            body.update(event_colors.fields(color, tok, cal["id"]))\n        suffix = "&eventLabelVersion=1" if color is not None else ""\n        ev = auth.send_json("POST", GOOGLE + "/calendars/%s/events?sendUpdates=all" % q(cal["id"]) + suffix, tok, body)\n        new = event_colors.normalize(a["name"], cal, ev, token=tok)'),
        ('def update(uid, title=None, start=None, end=None, all_day=None, location=None, series=False, busy=None):', 'def update(uid, title=None, start=None, end=None, all_day=None, location=None, series=False, busy=None, color=None):'),
        ('    series = bool(series and e.get("seriesId"))', '    if color is not None:\n        if a["provider"] != "google":\n            raise EditError("Event colors are supported only for Google Calendar.")\n        event_colors.validate(color)\n    series = bool(series and e.get("seriesId"))'),
        ('        ev = auth.send_json("PATCH", GOOGLE + "/calendars/%s/events/%s?sendUpdates=all" % (q(e["calendar"]), q(target)),\n                            tok, body, guard)', '''        if color is not None:
            body.update(event_colors.fields(color, tok, e["calendar"]))
            if series:
                master = auth.get_json(GOOGLE + "/calendars/%s/events/%s" % (q(e["calendar"]), q(target)), tok)
                if not master.get("etag"):
                    raise EditError("Could not verify the recurring event version. Sync and try again.")
                guard = {"If-Match": master["etag"]}
        color_only = color is not None and title is None and location is None and busy is None and not timing
        query = "?sendUpdates=" + ("none" if color_only else "all")
        if color is not None:
            query += "&eventLabelVersion=1"
        ev = auth.send_json("PATCH", GOOGLE + "/calendars/%s/events/%s" % (q(e["calendar"]), q(target)) + query,
                            tok, body, guard)'''),
        ('        _apply(a["name"], lambda x: x.get("seriesId") == e["seriesId"], fields)', '        if color is not None:\n            normalized = event_colors.normalize(a["name"], cal, ev, previous=e, token=tok)\n            fields.update({k: normalized[k] for k in ("color", "colorId", "eventLabelId")})\n        _apply(a["name"], lambda x: x.get("seriesId") == e["seriesId"], fields)'),
        ('        new = (google if a["provider"] == "google" else graph).normalise(a["name"], cal, ev)', '        new = event_colors.normalize(a["name"], cal, ev, previous=e, token=tok) if a["provider"] == "google" else graph.normalise(a["name"], cal, ev)')],
      'blacksheep.calendar/Model.js': [
        ('        uid: e.uid, title: e.title, label: day.label, sort: day.sort,', '        uid: e.uid, title: e.title, label: day.label, sort: day.sort,\n        provider: e.provider || "", colorId: e.colorId || "", eventLabelId: e.eventLabelId || "",'),
        ('    mode: "edit", uid: ev.uid, calendar:', '    eventColor: ev.eventLabelId ? "label:" + ev.eventLabelId : ev.colorId ? "color:" + ev.colorId : "",\n    mode: "edit", uid: ev.uid, calendar:')],
      'blacksheep.calendar/Panel.qml': [
        ('import "Model.js" as Model', 'import "Model.js" as Model\nimport "EventColors.js" as EventColors'),
        ('var out = Model.draftArgs(d)', 'var out = EventColors.args(d, Model.draftArgs(d))'),
        ('label: c.account + ": " + (c.name || c.id), primary: c.primary', 'label: c.account + ": " + (c.name || c.id), primary: c.primary, eventColors: c.eventColors || [], provider: ((root.eventData.accounts || []).filter(function(a) {return a.name === c.account})[0] || {}).provider || ""')],
      'blacksheep.calendar/EventEditor.qml': [
        ('import "Clock.js" as Clock', 'import "Clock.js" as Clock\nimport "EventColors.js" as EventColors'),
        ('  property bool confirmingDelete: false', '''  property bool confirmingDelete: false
  property string eventColorChoice: ""
  property bool eventColorChanged: false
  readonly property var colorCalendar: calendars.filter(function(c) {return c.value === editor.calendarRef})[0] || null
  readonly property bool googleCalendar: !!colorCalendar && colorCalendar.provider === "google"
  readonly property var colorOptions: EventColors.options(colorCalendar, event)'''),
        ('    editor.calendarRef = draft.calendar', '    editor.calendarRef = draft.calendar\n    editor.eventColorChoice = draft.eventColor || ""\n    editor.eventColorChanged = false'),
        ('    d.calendar = editor.calendarRef', '    d.calendar = editor.calendarRef\n    d.eventColor = editor.eventColorChoice\n    d.eventColorChanged = editor.googleCalendar && editor.eventColorChanged'),
        ('onChanged: function(v) { editor.calendarRef = v }', 'onChanged: function(v) { editor.calendarRef = v; editor.eventColorChoice = ""; editor.eventColorChanged = false }'),
        ('    // Starts and ends. All-day events', '''    Caption { visible: editor.googleCalendar && editor.editable; text: "EVENT COLOR" }
    Dropdown {
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
    Caption {
      visible: editor.googleCalendar && editor.editable
      width: parent.width
      wrapMode: Text.WordWrap
      text: "Saves to Google Calendar. Calendar default removes the event's color override. Sync to refresh calendar-specific labels."
      font.letterSpacing: 0
    }
    // Starts and ends. All-day events'''),
        ('Title, place and delete apply to the whole series; times move one at a time', 'Title, place, color and delete apply to the whole series; times move one at a time')],
    }


def plan(plugins, pending):
    result = dict(pending)
    modules = {
        'blacksheep.calendar/scripts/omcal/event_colors.py': 'integrations/event_colors.py',
        'blacksheep.calendar/EventColors.js': 'integrations/desktop/EventColors.js',
    }
    for relative, source in modules.items():
        target = plugins / relative
        desired = (ROOT / source).read_text()
        accepted = {'3fa7e14ce395c6e4ff26b863a7871d6ff7da5bcf2923a53a9481f09e32001f22'} if relative.endswith('/EventColors.js') else set()
        if target.exists() and target.read_text() != desired and hashlib.sha256(target.read_bytes()).hexdigest() not in accepted:
            raise RuntimeError('Refusing unfamiliar event-color module: ' + relative)
        if not target.exists() or target.read_text() != desired:
            result[target] = desired
    for relative, edits in replacements().items():
        path = plugins / relative
        text = result.get(path, path.read_text())
        if relative == 'blacksheep.calendar/EventEditor.qml' and 'Canvas Local picker state v2' in text:
            continue
        for before, after in edits:
            if after in text:
                continue
            if text.count(before) != 1:
                raise RuntimeError('Event color integration stopped before changes: ' + relative + '\n' + before)
            text = text.replace(before, after, 1)
        if text != path.read_text():
            result[path] = text
    return list(result.items())
