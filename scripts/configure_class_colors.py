#!/usr/bin/python3
"""Choose a Datebook color for each Canvas class.

Lists the classes in the local assignment database with their current
colors, then prompts for a replacement per class. Accepts any Google
Calendar event color (name or 1-11 id) or any #RRGGBB hex. Blank keeps the
current color; `default` clears the override back to the class default.

Colors are stored per class group in the local SQLite table, exactly like
the Datebook class-color editor writes them, so they survive syncs and never
touch Canvas or Google. Run any time; safe to rerun.
"""
import importlib.util
import os
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def google_colors():
    """(id_or_name -> hex) for every usable Google Calendar color."""
    events = load_module('class_color_setup.event_colors', ROOT / 'integrations/event_colors.py')
    lookup = {}
    for key, name, color in events.STANDARD:
        lookup[key] = color
        lookup[name.casefold()] = color
    for color, name in events.COLOR_NAMES.items():
        lookup.setdefault(name.casefold(), color)
    return lookup


GOOGLE_NAMES = None


def parse_selection(text):
    """('keep'|'clear'|'color', hex_or_None) for one setup answer."""
    global GOOGLE_NAMES
    if GOOGLE_NAMES is None:
        GOOGLE_NAMES = google_colors()
    cleaned = str(text or '').strip()
    if not cleaned:
        return ('keep', None)
    if cleaned.casefold() in ('default', 'none', 'clear'):
        return ('clear', None)
    if cleaned.isdigit() and cleaned in GOOGLE_NAMES:
        return ('color', GOOGLE_NAMES[cleaned])
    lowered = cleaned.casefold()
    if lowered in GOOGLE_NAMES:
        return ('color', GOOGLE_NAMES[lowered])
    hexed = cleaned if cleaned.startswith('#') else '#' + cleaned
    if len(hexed) == 7 and all(c in '0123456789abcdefABCDEF' for c in hexed[1:]):
        return ('color', hexed.lower())
    raise ValueError("Use a Google color name or 1-11 id, a #RRGGBB hex, blank to keep, or 'default'.")


def database_path():
    return Path(os.environ.get('XDG_DATA_HOME', Path.home() / '.local/share')) / 'canvas-local/assignments.sqlite3'


def load_courses(db_path):
    """[(course, course_id, group, current_hex)] for classes in the database."""
    feed = load_module('class_color_setup.canvas_feed', ROOT / 'native/canvas_feed.py')
    db = sqlite3.connect(str(db_path))
    try:
        try:
            rows = db.execute('SELECT source FROM assignments').fetchall()
        except sqlite3.OperationalError:
            raise RuntimeError('No assignments table yet. Open the extension once so it syncs, then rerun.')
        seen = {}
        for (raw,) in rows:
            try:
                import json
                source = json.loads(raw)
            except ValueError:
                continue
            course, course_id = source.get('course'), source.get('courseId')
            if course is None or course_id is None or course_id in seen:
                continue
            seen[course_id] = course
        if not seen:
            raise RuntimeError('No Canvas classes in the local database yet. Sync the extension first, then rerun.')
        try:
            overrides = dict(db.execute('SELECT class_group, color FROM course_colors'))
        except sqlite3.OperationalError:
            overrides = {}
    finally:
        db.close()
    courses = []
    for course_id, course in sorted(seen.items(), key=lambda item: str(item[1]).casefold()):
        group = feed.color_group(course, course_id)
        current = overrides.get(group, feed.COURSE_COLORS.get(group, feed.DEFAULT_COURSE_COLOR))
        courses.append((course, course_id, group, current))
    return courses


def apply_choices(db_path, choices):
    """choices: [(group, hex_or_None)]. None clears the override."""
    db = sqlite3.connect(str(db_path))
    try:
        db.execute('CREATE TABLE IF NOT EXISTS course_colors (class_group TEXT PRIMARY KEY, color TEXT NOT NULL)')
        with db:
            for group, color in choices:
                if color is None:
                    db.execute('DELETE FROM course_colors WHERE class_group=?', (group,))
                else:
                    db.execute('INSERT OR REPLACE INTO course_colors VALUES (?,?)', (group, color))
    finally:
        db.close()


def color_name(hex_value, lookup=None):
    events = load_module('class_color_setup.event_colors_names', ROOT / 'integrations/event_colors.py')
    names = {color: name for _, name, color in events.STANDARD}
    names.update({color: name for color, name in events.COLOR_NAMES.items()})
    return names.get(str(hex_value).lower(), str(hex_value))


def describe_current(courses):
    lines = []
    for course, _, _, current in courses:
        lines.append('  %-28s %s (%s)' % (course, current, color_name(current)))
    return '\n'.join(lines)


def interactive(courses):
    print('Current class colors:')
    print(describe_current(courses))
    print("Answer per class: Google color name or 1-11 id, #RRGGBB hex, blank to keep, 'default' to clear.")
    print('Google palette: ' + ', '.join('%s=%s' % (name, color) for _, name, color in
          load_module('x', ROOT / 'integrations/event_colors.py').STANDARD))
    choices = []
    for course, _, group, current in courses:
        while True:
            try:
                answer = input('Color for %r [%s]: ' % (course, current))
            except EOFError:
                print()
                return []
            try:
                action, value = parse_selection(answer)
            except ValueError as error:
                print('  ' + str(error))
                continue
            if action == 'keep':
                break
            choices.append((group, value if action == 'color' else None))
            break
    return choices


def main(argv=None):
    args = list(sys.argv[1:] if argv is None else argv)
    sets = {}
    show_only = False
    rest = []
    i = 0
    while i < len(args):
        if args[i] == '--list':
            show_only = True
        elif args[i] == '--set' and i + 1 < len(args):
            i += 1
            if '=' not in args[i]:
                print("Expected --set 'Class name=#rrggbb'.")
                return 2
            name, value = args[i].split('=', 1)
            sets[name.strip().casefold()] = value.strip()
        else:
            rest.append(args[i])
        i += 1
    if rest:
        print('Usage: configure_class_colors.py [--list] [--set Class=value ...]')
        return 2
    try:
        db_path = database_path()
        if not db_path.is_file():
            print('No local assignment database yet at ' + str(db_path) + '.')
            print('Open the extension once so it syncs your classes, then rerun.')
            return 1
        courses = load_courses(db_path)
    except RuntimeError as error:
        print(str(error))
        return 1
    if show_only or (not sys.stdin.isatty() and not sets):
        print(describe_current(courses))
        return 0
    if sets:
        choices = []
        by_name = {str(course).casefold(): (course, group) for course, _, group, _ in courses}
        for name, value in sets.items():
            if name not in by_name:
                close = [course for key, (course, _) in by_name.items() if key.startswith(name) or name.startswith(key)]
                hint = (' Did you mean: ' + ', '.join(close[:3]) + '?') if close else ' Run with --list to see class names.'
                print('Unknown class %r.%s' % (name, hint))
                return 2
            course, group = by_name[name]
            try:
                action, resolved = parse_selection(value)
            except ValueError as error:
                print('%r: %s' % (course, error))
                return 2
            if action != 'keep':
                choices.append((group, resolved if action == 'color' else None))
    else:
        choices = interactive(courses)
        if not choices and sys.stdin.isatty():
            print('No changes.')
            return 0
    if not choices:
        print('No changes.')
        return 0
    apply_choices(db_path, choices)
    print('Saved %d class color(s). Press Sync now in the extension to refresh Datebook.' % len(choices))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
