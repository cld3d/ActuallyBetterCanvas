#!/usr/bin/python3
"""Canvas local feed. Native messaging on stdin/stdout; CLI for desktop consumers."""
import argparse
import contextlib
import fcntl
import json
import os
from pathlib import Path
import sqlite3
import struct
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from urllib.parse import urlsplit

DATA = Path(os.environ.get('XDG_DATA_HOME', Path.home() / '.local/share')) / 'canvas-local'
CACHE = Path(os.environ.get('XDG_CACHE_HOME', Path.home() / '.cache')) / 'canvas-local'
CALENDAR = Path.home() / '.config/omarchy/plugins/blacksheep.calendar/scripts'


def now():
    return datetime.now(timezone.utc).isoformat()


def instant(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError('Deadline must be an ISO timestamp with a time zone, or null.')
    date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if date.tzinfo is None:
        raise ValueError('Deadline needs a time zone.')
    return date.astimezone(timezone.utc).isoformat()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, name = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream, ensure_ascii=False)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


@contextlib.contextmanager
def database():
    DATA.mkdir(parents=True, exist_ok=True, mode=0o700)
    with open(DATA / 'write.lock', 'a') as lock:
        os.chmod(DATA / 'write.lock', 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX)
        db = sqlite3.connect(DATA / 'assignments.sqlite3', timeout=15)
        os.chmod(DATA / 'assignments.sqlite3', 0o600)
        db.row_factory = sqlite3.Row
        db.executescript('''
            CREATE TABLE IF NOT EXISTS assignments (
                uid TEXT PRIMARY KEY, source TEXT NOT NULL,
                personal_due TEXT, due_override INTEGER NOT NULL DEFAULT 0,
                completion INTEGER, notes TEXT NOT NULL DEFAULT '',
                active INTEGER NOT NULL DEFAULT 1, updated TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        ''')
        try:
            yield db
        finally:
            db.close()


def meta(db, key, value):
    db.execute('INSERT OR REPLACE INTO metadata VALUES (?,?)', (key, json.dumps(value)))


def snapshot(db):
    metadata = {r['key']: json.loads(r['value']) for r in db.execute('SELECT * FROM metadata')}
    rows = []
    for row in db.execute('SELECT * FROM assignments WHERE active=1'):
        item = json.loads(row['source'])
        item.update(uid=row['uid'], personalDue=row['personal_due'], dueOverride=bool(row['due_override']),
                    completionOverride=None if row['completion'] is None else bool(row['completion']),
                    notes=row['notes'], updated=row['updated'])
        item['effectiveDue'] = row['personal_due'] if row['due_override'] else item['canvasDue']
        item['completed'] = bool(row['completion']) if row['completion'] is not None else item['submitted']
        rows.append(item)
    rows.sort(key=lambda a: (a['effectiveDue'] or '9999', a['course'], a['title']))
    return dict(schema=1, generatedAt=now(), assignments=rows, **metadata)


def desktop_feed(state):
    tasks = []
    for a in state['assignments']:
        due = datetime.fromisoformat(a['effectiveDue']).astimezone() if a['effectiveDue'] else None
        tasks.append(dict(uid=a['uid'], id=a['uid'], account='Canvas Local', provider='canvas-local',
                          taskList='assignments', listName=a['course'], title=a['title'],
                          due=due.strftime('%Y-%m-%d') if due else '', dueAt=a['effectiveDue'],
                          canvasDue=a['canvasDue'], personalDue=a['personalDue'],
                          dueOverride=a['dueOverride'], completionOverride=a['completionOverride'],
                          submitted=a['submitted'], graded=a['graded'],
                          status='completed' if a['completed'] else 'needsAction', notes=a['notes'],
                          editable=True, webLink=a['url'], etag=a['updated'], position=a['effectiveDue'] or '9999'))
    return dict(schema=1, generatedAt=state['generatedAt'], lastSync=state.get('lastSync'),
                syncError=state.get('syncError', ''), tasks=tasks)


def republish_calendar():
    if (CALENDAR / 'omcal/sync.py').exists():
        result = subprocess.run([sys.executable, '-B', '-c',
                                 'from omcal import sync\nwith sync.locked(): sync.republish()'],
                                cwd=CALENDAR, capture_output=True, text=True, timeout=25)
        if result.returncode:
            raise RuntimeError('Assignments saved, but Datebook cache could not refresh: ' + result.stderr[-500:])


def handle(request, publish=True):
    action = request.get('action')
    changed = False
    with database() as db:
        if action == 'sync':
            origin = request['origin']
            parsed = urlsplit(origin)
            if parsed.scheme != 'https' or parsed.netloc != parsed.hostname or parsed.path not in ('', '/'):
                raise ValueError('Use an HTTPS Canvas origin without a path or port.')
            origin = 'https://' + parsed.hostname
            user = str(request['user'])
            if not user.isdigit():
                raise ValueError('Invalid Canvas user.')
            identity = origin + '/' + user
            previous = db.execute("SELECT value FROM metadata WHERE key='identity'").fetchone()
            if previous and json.loads(previous[0]) != identity:
                raise ValueError('Different Canvas account detected. The existing feed was kept unchanged.')
            assignments = request['assignments']
            if not isinstance(assignments, list) or len(assignments) > 30000:
                raise ValueError('Invalid assignment snapshot.')
            clean = []
            seen = set()
            for item in assignments:
                aid, cid = str(item['id']), str(item['courseId'])
                if not aid.isdigit() or not cid.isdigit():
                    raise ValueError('Invalid assignment ID.')
                uid = 'canvas-local/' + parsed.hostname + '/' + user + '/' + cid + '/' + aid
                if uid in seen:
                    raise ValueError('Duplicate assignment in snapshot.')
                seen.add(uid)
                # Construct source links ourselves: never trust API-provided external URLs.
                source = dict(id=aid, courseId=cid, title=str(item['title'])[:2000],
                              course=str(item['course'])[:500], canvasDue=instant(item.get('canvasDue')),
                              submitted=item.get('submitted') is True, graded=item.get('graded') is True,
                              url=origin + '/courses/' + cid + '/assignments/' + aid)
                clean.append((uid, json.dumps(source), now()))
            with db:
                db.execute('UPDATE assignments SET active=0')
                db.executemany('''INSERT INTO assignments(uid,source,updated) VALUES (?,?,?)
                    ON CONFLICT(uid) DO UPDATE SET source=excluded.source, active=1,
                    updated=CASE WHEN source != excluded.source THEN excluded.updated ELSE updated END''', clean)
                meta(db, 'identity', identity)
                meta(db, 'origin', origin)
                meta(db, 'lastSync', now())
                meta(db, 'syncError', '')
            changed = True
        elif action == 'update':
            uid = request['uid']
            if not db.execute('SELECT 1 FROM assignments WHERE uid=? AND active=1', (uid,)).fetchone():
                raise ValueError('Assignment not found in the active feed.')
            patch = request['patch']
            if not isinstance(patch, dict) or set(patch) - {'personalDue', 'followCanvasDue', 'completion', 'notes'}:
                raise ValueError('Unknown assignment edit.')
            with db:
                if 'personalDue' in patch:
                    db.execute('UPDATE assignments SET personal_due=?,due_override=1 WHERE uid=?', (instant(patch['personalDue']), uid))
                if patch.get('followCanvasDue') is True:
                    db.execute('UPDATE assignments SET personal_due=NULL,due_override=0 WHERE uid=?', (uid,))
                if 'completion' in patch:
                    value = patch['completion']
                    if value is not None and type(value) is not bool:
                        raise ValueError('Completion must be true, false, or null.')
                    db.execute('UPDATE assignments SET completion=? WHERE uid=?', (value, uid))
                if 'notes' in patch:
                    if not isinstance(patch['notes'], str) or len(patch['notes']) > 20000:
                        raise ValueError('Notes must be text of at most 20000 characters.')
                    db.execute('UPDATE assignments SET notes=? WHERE uid=?', (patch['notes'], uid))
                db.execute('UPDATE assignments SET updated=? WHERE uid=?', (now(), uid))
            changed = True
        elif action == 'status':
            with db:
                meta(db, 'syncError', str(request.get('error', ''))[:1000])
            changed = True
        elif action != 'list':
            raise ValueError('Unknown action.')
        state = snapshot(db)
        # Serialize publication with writes so an older writer cannot replace a newer feed.
        write_json(CACHE / 'feed.json', desktop_feed(state))
    warning = ''
    if changed and publish:
        try:
            republish_calendar()
        except (RuntimeError, subprocess.TimeoutExpired) as error:
            warning = str(error)
    return dict(ok=True, state=state, warning=warning)


def read_exact(stream, count):
    value = b''
    while len(value) < count:
        chunk = stream.read(count - len(value))
        if not chunk:
            raise EOFError('Incomplete native message.')
        value += chunk
    return value


def native_main():
    while True:
        header = sys.stdin.buffer.read(4)
        if not header:
            return
        try:
            if len(header) != 4:
                raise EOFError('Incomplete native header.')
            size = struct.unpack('=I', header)[0]
            if size > 16 * 1024 * 1024:
                raise ValueError('Native request too large.')
            reply = handle(json.loads(read_exact(sys.stdin.buffer, size)))
        except Exception as error:
            reply = dict(ok=False, error=str(error))
        payload = json.dumps(reply).encode()
        if len(payload) > 1024 * 1024 - 1024:
            payload = json.dumps(dict(ok=False, error='Feed exceeds the Chromium 1 MB native response limit.')).encode()
        sys.stdout.buffer.write(struct.pack('=I', len(payload)) + payload)
        sys.stdout.buffer.flush()


def main():
    os.umask(0o077)
    if len(sys.argv) == 1 or sys.argv[1].startswith('chrome-extension://'):
        native_main()
        return
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['list', 'update'])
    parser.add_argument('uid', nargs='?')
    parser.add_argument('--patch', default='{}')
    parser.add_argument('--no-publish', action='store_true')
    args = parser.parse_args()
    try:
        print(json.dumps(handle(dict(action=args.action, uid=args.uid, patch=json.loads(args.patch)), not args.no_publish)))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
