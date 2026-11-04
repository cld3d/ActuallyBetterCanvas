"""Datebook adapter. No Canvas cookies, credentials, or network access here."""
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime


def feed():
    path = Path(os.environ.get('XDG_CACHE_HOME', Path.home() / '.cache')) / 'canvas-local/feed.json'
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        return None


def append_to(output):
    data = feed()
    if data is None:
        return
    error = data.get('syncError', '')
    output['accounts'].append(dict(name='Canvas Local', provider='canvas-local', status='ok',
                                   tasksWritable=True, tasksStatus='error' if error else 'ok',
                                   tasksError=error, lastSync=data.get('lastSync'), tasksLastSync=data.get('lastSync')))
    output['tasks'].extend(t for t in data.get('tasks', []) if t.get('status') != 'completed')


def update(uid, title=None, due=None, notes=None, completed=None):
    from . import sync
    data = feed() or {}
    item = next((t for t in data.get('tasks', []) if t['uid'] == uid), None)
    if not item:
        raise RuntimeError('Canvas assignment is no longer in the local feed.')
    if title is not None and title != item['title']:
        raise RuntimeError('Assignment titles come from Canvas and cannot be edited here.')
    patch = {}
    if due is not None:
        if due:
            if len(due) < 16:
                raise RuntimeError('Canvas deadlines need a date AND time: YYYY-MM-DD HH:MM.')
            try:
                parsed = datetime.fromisoformat(due.replace('Z', '+00:00'))
                patch['personalDue'] = parsed.astimezone().isoformat()
            except ValueError:
                raise RuntimeError('Use a valid deadline: YYYY-MM-DD HH:MM (local time).') from None
        else:
            patch['personalDue'] = None
    if notes is not None:
        patch['notes'] = notes
    if completed is not None:
        patch['completion'] = bool(completed)
    config = Path(os.environ.get('XDG_CONFIG_HOME', Path.home() / '.config')) / 'canvas-local/integration.json'
    host = json.loads(config.read_text())['host']
    # Do not hold Datebook's lock while waiting for the local writer.
    result = subprocess.run([sys.executable, '-B', host, 'update', uid, '--patch', json.dumps(patch), '--no-publish'],
                            capture_output=True, text=True, timeout=20)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or 'Could not update Canvas assignment.')
    with sync.locked():
        sync.republish()


def delete(uid):
    raise RuntimeError('Canvas assignments cannot be deleted here. Mark completed or manage them in Canvas.')
