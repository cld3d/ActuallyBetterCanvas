"""Provider-synced Google event colors, with exact matched and backed-up integration."""
from pathlib import Path
import hashlib
ROOT = Path(__file__).resolve().parents[1]


def replacements():
    return {
      'blacksheep.calendar/scripts/omcal/google.py': [
        ('def normalise(account, cal, e):',
         '# The colours Google Calendar itself shows: saturated, and readable on a\n# dark panel. /colors hands back pale backgrounds made for a white page\n# (Basil as #51b749, Peacock as #46d6db...); at the widget\'s 28% fill alpha\n# those wash out to nearly white, so colorIds resolve here instead. Unknown\n# ids fall back to the API table (Google keeps adding colours), then to ""\n# (the calendar\'s colour).\nEVENT_COLORS = {\n    "1": "#7986cb",   # Lavender\n    "2": "#33b679",   # Sage\n    "3": "#8e24aa",   # Grape\n    "4": "#e67c73",   # Flamingo\n    "5": "#f6bf26",   # Banana\n    "6": "#f4511e",   # Tangerine\n    "7": "#039be5",   # Peacock\n    "8": "#616161",   # Graphite\n    "9": "#3f51b5",   # Blueberry\n    "10": "#0b8043",  # Basil\n    "11": "#d50000",  # Tomato\n}\n\n\ndef event_colors(tok):\n    """{colorId: background hex} for per-event colours (see normalise).\n\n    Fetched once per sync: ids are stable ("1".."11") and the mapping only\n    changes if Google ever repaints its palette. Never fatal: an empty map\n    just leaves events in their calendar\'s colour.\n    """\n    try:\n        r = _get(API + "/colors", tok)\n    except Exception:\n        return {}\n    out = {}\n    for cid, c in (r.get("event") or {}).items():\n        bg = (c or {}).get("background", "")\n        if isinstance(bg, str) and len(bg) == 7 and bg.startswith("#"):\n            out[str(cid)] = bg\n    return out\n\n\ndef labels(tok, calendar_id):\n    """{label id: background hex} for this calendar\'s event labels.\n\n    Labels are Google\'s successor to colorId: a per-calendar palette (up to\n    200 entries, e.g. Pistachio #7cb342, Avocado #c0ca33) applied to events\n    by eventLabelId, which supersedes colorId. Never fatal: an empty map\n    just leaves labelled events in their fallback colour.\n    """\n    try:\n        r = _get(API + "/calendars/%s?fields=labelProperties" % urllib.parse.quote(calendar_id, safe=""), tok)\n    except Exception:\n        return {}\n    out = {}\n    for l in ((r.get("labelProperties") or {}).get("eventLabels") or []):\n        bg = l.get("backgroundColor", "")\n        if isinstance(bg, str) and len(bg) == 7 and bg.startswith("#"):\n            out[str(l.get("id"))] = bg\n    return out\n\n\ndef normalise(account, cal, e, colors=None, labels=None):'),
        ('    else:\n        remind = sorted({int(x["minutes"]) for x in rem.get("overrides", [])\n                         if x.get("method") == "popup" and "minutes" in x})\n    return {',
         '    else:\n        remind = sorted({int(x["minutes"]) for x in rem.get("overrides", [])\n                         if x.get("method") == "popup" and "minutes" in x})\n    # An event coloured in Google Calendar carries colorId ("1".."11") or,\n    # since labels superseded it, eventLabelId (a UUID from the calendar\'s\n    # own labelProperties). The label wins when both are present, per the\n    # API docs; its hex comes from labels(tok, calendar). A colorId resolves\n    # through EVENT_COLORS above (the UI\'s saturated colours), with the\n    # /colors table as fallback for ids Google adds later. Without either\n    # the widget falls back to the calendar\'s colour.\n    color = (labels or {}).get(str(e.get("eventLabelId") or ""), "")\n    if not color:\n        cid = str(e.get("colorId") or "")\n        color = EVENT_COLORS.get(cid, (colors or {}).get(cid, ""))\n    return {'),
        ('        "title": e.get("summary") or "(no title)",\n        "allDay": all_day, "start": start, "end": end,',
         '        "title": e.get("summary") or "(no title)",\n        "color": color,\n        "allDay": all_day, "start": start, "end": end,'),
        ('def fetch(account, tok, cal, window, updated_min=None):\n    """Events in the window: all of them, or only those changed since updated_min.\n\n    Returns (events, removed_ids, fetched_at). Cancelled events are removals.\n    """',
         'def fetch(account, tok, cal, window, updated_min=None, colors=None, labels=None):\n    """Events in the window: all of them, or only those changed since updated_min.\n\n    Returns (events, removed_ids, fetched_at). Cancelled events are removals.\n    colors is event_colors(tok): per-event colorIds resolve through it.\n    labels is labels(tok, calendar id): per-event eventLabelIds resolve\n    through it, taking precedence over colorIds.\n    """'),
        ('                events.append(normalise(account, cal, e))',
         '                events.append(normalise(account, cal, e, colors, labels))'),
        ('def labels(tok, calendar_id):', 'def labels(tok, calendar_id, options=None):'),
        ('    try:\n        r = _get(API + "/calendars/%s?fields=labelProperties"', '    from . import event_colors as event_color_support\n    if options is not None:\n        options.extend(event_color_support.palette())\n    try:\n        r = _get(API + "/calendars/%s?fields=labelProperties"'),
        ('    out = {}\n    for l in ((r.get("labelProperties")', '    if options is not None:\n        options.extend(event_color_support.palette((r.get("labelProperties") or {}).get("eventLabels") or [])[12:])\n    out = {}\n    for l in ((r.get("labelProperties")'),
        ('        "color": color,\n        "allDay":', '        "color": color, "provider": "google", "colorId": str(e.get("colorId") or ""),\n        "eventLabelId": str(e.get("eventLabelId") or ""),\n        "allDay":'),
      ],
      'blacksheep.calendar/scripts/omcal/sync.py': [
        ('        else:\n            tok, prov = auth.ms_access(a), graph\n        # Hidden calendars are not fetched',
         '        else:\n            tok, prov = auth.ms_access(a), graph\n        # Google events can carry their own colour: a legacy colorId (resolved\n        # through /colors) or a label (eventLabelId, resolved through the\n        # calendar\'s own labelProperties). Both tables are fetched once per\n        # pass; a failure is not fatal, events just keep the calendar colour.\n        colors = prov.event_colors(tok) if a["provider"] == "google" else {}\n        # Hidden calendars are not fetched'),
        ('        st["events"] = {u: e for u, e in st["events"].items() if e["calendar"] in keep}\n        for cal in cals:',
         '        st["events"] = {u: e for u, e in st["events"].items() if e["calendar"] in keep}\n        label_maps = {}\n        if a["provider"] == "google":\n            for cal in cals:\n                label_maps[cal["id"]] = prov.labels(tok, cal["id"])\n        for cal in cals:'),
        ('            whole = full or moved or not cursor or stale\n            try:',
         '            whole = full or moved or not cursor or stale\n            cal_labels = label_maps.get(cal["id"], {})\n            try:'),
        ('                events, removed, cursor = _fetch(a, prov, tok, cal, window, None if whole else cursor)',
         '                events, removed, cursor = _fetch(a, prov, tok, cal, window, None if whole else cursor, colors, cal_labels)'),
        ('                events, removed, cursor = _fetch(a, prov, tok, cal, window, None)',
         '                events, removed, cursor = _fetch(a, prov, tok, cal, window, None, colors, cal_labels)'),
        ('def _fetch(a, prov, tok, cal, window, cursor):\n    if prov is google:\n        events, removed, at = google.fetch(a["name"], tok, cal, window, cursor)\n        return events, removed, google.since(at)',
         'def _fetch(a, prov, tok, cal, window, cursor, colors=None, labels=None):\n    if prov is google:\n        events, removed, at = google.fetch(a["name"], tok, cal, window, cursor, colors, labels)\n        return events, removed, google.since(at)'),
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
        ('// {calendars, byDay, accounts} for the panel: hidden calendars dropped, each\n// event carrying its colour and calendar name, each day\'s list in order.\nfunction indexEvents(data, use24h) {',
         '// {calendars, byDay, accounts} for the panel: hidden calendars dropped, each\n// event carrying its colour and calendar name, each day\'s list in order.\n// An event coloured in its provider app (Google\'s per-event colours) keeps\n// its own colour; otherwise it takes its calendar\'s.\nfunction eventColor(e, calendarColor) {\n  var c = e && e.color ? String(e.color) : ""\n  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c\n  return calendarColor\n}\n\nfunction indexEvents(data, use24h) {'),
        ('        uid: e.uid, title: e.title, label: day.label, sort: day.sort,\n        color: cinfo.color, calendarName: cinfo.name, account: e.account,',
         '        uid: e.uid, title: e.title, label: day.label, sort: day.sort,\n        provider: e.provider || "", colorId: e.colorId || "", eventLabelId: e.eventLabelId || "",\n        eventColorKnown: e.provider === "google" || ("colorId" in e) || ("eventLabelId" in e),\n        color: eventColor(e, cinfo.color), calendarName: cinfo.name, account: e.account,'),
        ('    colorFor: colorFor,',
         '    colorFor: colorFor,\n    eventColor: eventColor,'),
        ('    mode: "edit", uid: ev.uid, calendar:', '    eventColor: ev.eventLabelId ? "label:" + ev.eventLabelId : ev.colorId ? "color:" + ev.colorId : "",\n    mode: "edit", uid: ev.uid, calendar:')],
      'blacksheep.calendar/Panel.qml': [
        ('import "Model.js" as Model', 'import "Model.js" as Model\nimport "EventColors.js" as EventColors'),
        ('var out = Model.draftArgs(d)', 'var out = EventColors.args(d, Model.draftArgs(d))'),
        ('label: c.account + ": " + (c.name || c.id), primary: c.primary', 'label: c.account + ": " + (c.name || c.id), primary: c.primary, eventColors: c.eventColors || [], provider: ((root.eventData.accounts || []).filter(function(a) {return a.name === c.account})[0] || {}).provider || ""')],
      'blacksheep.calendar/EventEditor.qml': [
        ('import "Model.js" as Model', 'import "Model.js" as Model\nimport "Clock.js" as Clock'),
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
    Caption { visible: editor.googleCalendar && editor.editable; text: "EVENT COLOR" }
    EventColorSwatches {
      id: eventColorPicker
      objectName: "eventColorPicker"
      visible: editor.googleCalendar && editor.editable
      width: parent.width
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
        ('      id: titleField', '      id: titleField\n      objectName: "eventTitleField"'),
    ('Title, place and delete apply to the whole series; times move one at a time', 'Title, place, color and delete apply to the whole series; times move one at a time')],
      'blacksheep.calendar/scripts/omcal/graph.py': [
        ('        "title": e.get("subject") or "(no title)",\n        "allDay": all_day, "start": start, "end": end,',
         '        "title": e.get("subject") or "(no title)",\n        "color": "",\n        "allDay": all_day, "start": start, "end": end,'),
      ],
      'blacksheep.calendar/scripts/omcal/model.py': [
        ("""    title        "(no title)" when there is none
    allDay       True for date-only events""",
         """    title        "(no title)" when there is none
    color        per-event hex ("#0b8043") when the provider gives the event
                 its own colour: Google's eventLabelId (resolved through the
                 calendar's labelProperties) first, then its legacy colorId
                 (resolved through the saturated UI palette). Else "": the
                 widget falls back to the calendar's colour
    allDay       True for date-only events"""),
      ],
    }


def plan(plugins, pending):
    from plugin_scope import installed
    result = dict(pending)
    modules = {
        'blacksheep.calendar/scripts/omcal/event_colors.py': 'integrations/event_colors.py',
        'blacksheep.calendar/EventColors.js': 'integrations/desktop/EventColors.js',
        'blacksheep.calendar/EventColorSwatches.qml': 'integrations/desktop/EventColorSwatches.qml',
    }
    for relative, source in modules.items():
        if not installed(plugins, relative):
            continue
        target = plugins / relative
        desired = (ROOT / source).read_text()
        if relative.endswith('/EventColorSwatches.qml'):
            # Our own generated component: safe to refresh when it carries our
            # marker; refuse anything else rather than overwriting by surprise.
            if target.exists() and target.read_text() != desired and 'Event color swatch grid' not in target.read_text():
                raise RuntimeError('Refusing unfamiliar event-color module: ' + relative)
            if not target.exists() or target.read_text() != desired:
                result[target] = desired
            continue
        accepted = {'3fa7e14ce395c6e4ff26b863a7871d6ff7da5bcf2923a53a9481f09e32001f22',
                    'be34cb297414d313a68ff4c23a951f1e422fa783b50001a95758dace14fa0526',
                    '72030e0cdd20c72715feaf7797a760cfd1323972570c050263ad8403f2c58b22'} if relative.endswith('/EventColors.js') else {
                    'bd12d77b25c40c9b42a006c440596dd595cb1c646d348d66448244bdda8dbd77',
                    '5e118cb37150a6252ae77fa2a474de6f2a0da90ac8e1d6dfc7eb37d7966863a6'}
        if target.exists() and target.read_text() != desired and hashlib.sha256(target.read_bytes()).hexdigest() not in accepted:
            raise RuntimeError('Refusing unfamiliar event-color module: ' + relative)
        if not target.exists() or target.read_text() != desired:
            result[target] = desired
    for relative, edits in replacements().items():
        if not installed(plugins, relative):
            continue
        path = plugins / relative
        if path in result:
            text = result[path]
        elif not path.exists():
            text = ''
        else:
            text = path.read_text()
        if relative == 'blacksheep.calendar/scripts/omcal/google.py' and 'def event_colors(tok):' in text:
            continue
        if relative == 'blacksheep.calendar/scripts/omcal/sync.py' and 'label_maps = {}' in text:
            continue
        for before, after in edits:
            if after in text:
                continue
            if relative == 'blacksheep.calendar/EventEditor.qml' and before == '    editor.calendarRef = draft.calendar' and ('picker state v2' in text or 'picker state v3' in text):
                # Load-block migration is owned by editor_state_support; applying
                # the fresh-install variant here would corrupt it.
                continue
            if text.count(before) != 1:
                raise RuntimeError('Event color integration stopped before changes: ' + relative + '\n' + before)
            text = text.replace(before, after, 1)
        if text != path.read_text():
            result[path] = text
    return list(result.items())
