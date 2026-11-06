"""Google Tasks snapshots and writes, kept separate from Calendar events."""
import os
import re
import urllib.parse
from datetime import date

from . import auth

API = "https://tasks.googleapis.com/tasks/v1"


def pages(path, token, **params):
    while True:
        result = auth.get_json(API + path + "?" + urllib.parse.urlencode(params), token)
        yield from result.get("items", [])
        page = result.get("nextPageToken")
        if not page:
            break
        params["pageToken"] = page


def normalise(account, tasklist, task, editable=False):
    # Google's due timestamp is DATE-ONLY, even when it contains a time/zone.
    # Converting midnight UTC to local time would put tasks on the previous day.
    due = str(task.get("due") or "")[:10]
    try:
        due = date.fromisoformat(due).isoformat() if re.fullmatch(r"\d{4}-\d{2}-\d{2}", due) else ""
    except ValueError:
        due = ""
    link = task.get("webViewLink") or (task.get("assignmentInfo") or {}).get("linkToTask") or ""
    return {
        "uid": "%s/tasks/%s/%s" % (account, tasklist["id"], task["id"]),
        "id": task["id"], "account": account, "taskList": tasklist["id"],
        "listName": tasklist.get("title") or "Tasks", "title": task.get("title") or "Untitled task",
        "due": due, "notes": task.get("notes") or "", "parent": task.get("parent") or "",
        "position": task.get("position") or "", "status": task.get("status", "needsAction"),
        "etag": task.get("etag", ""), "editable": editable,
        "webLink": link if link.startswith("https://") else "https://tasks.google.com/",
    }


def snapshot(account, token, writable=False):
    lists = list(pages("/users/@me/lists", token, maxResults=100))
    lists = [dict(item, editable=writable) for item in lists]
    tasks = {}
    for tasklist in lists:
        path = "/lists/%s/tasks" % urllib.parse.quote(tasklist["id"], safe="")
        for task in pages(path, token, maxResults=100, showCompleted="false", showDeleted="false",
                          showHidden="false", showAssigned="true"):
            if task.get("deleted") or task.get("hidden") or task.get("status") == "completed":
                continue
            item = normalise(account, tasklist, task, writable)
            tasks[item["uid"]] = item
    return lists, tasks


def due_value(text):
    if not text:
        return None
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        raise RuntimeError("Use YYYY-MM-DD for a task date; Google Tasks does not expose scheduled times.")
    try:
        return date.fromisoformat(text).isoformat() + "T00:00:00.000Z"
    except ValueError:
        raise RuntimeError("That task date is not valid.") from None


def writable_account(name):
    a = auth.account(name)
    if a["provider"] != "google" or not a.get("tasksWritable"):
        raise RuntimeError("Allow read/write Tasks access first: calendar-ctl enable-tasks %s" % name)
    return a


def locate(uid):
    from . import sync
    name = uid.split("/", 1)[0]
    a = writable_account(name)
    path = os.path.join(sync.CACHE, "state-%s.json" % name)
    state = sync.read_json(path, {})
    item = state.get("tasks", {}).get(uid)
    if not item:
        raise RuntimeError("That task is no longer in the local copy; sync and try again.")
    tasklist = next((x for x in state.get("taskLists", []) if x["id"] == item["taskList"]), None)
    if not tasklist:
        raise RuntimeError("That task list is no longer available; sync and try again.")
    return a, path, state, item, tasklist


def create(ref, title, due="", notes=""):
    from . import sync
    name, separator, list_id = ref.partition("/")
    if not separator or not list_id:
        raise RuntimeError("Choose a task list first.")
    title = title.strip()
    if not title:
        raise RuntimeError("A task needs a title.")
    body = {"title": title, "notes": notes}
    if due:
        body["due"] = due_value(due)
    with sync.locked():
        a = writable_account(name)
        path = os.path.join(sync.CACHE, "state-%s.json" % name)
        state = sync.read_json(path, {})
        tasklist = next((x for x in state.get("taskLists", []) if x["id"] == list_id), None)
        if not tasklist:
            raise RuntimeError("That task list is no longer available; sync and try again.")
        url = API + "/lists/%s/tasks" % urllib.parse.quote(list_id, safe="")
        reply = auth.send_json("POST", url, auth.google_access(a), body)
        item = normalise(name, tasklist, reply, True)
        state.setdefault("tasks", {})[item["uid"]] = item
        sync.write_private(path, state)
        sync.republish()
        return item["uid"]


def update(uid, title=None, due=None, notes=None, completed=None):
    from . import sync
    body = {}
    if title is not None:
        if not title.strip():
            raise RuntimeError("A task needs a title.")
        body["title"] = title.strip()
    if due is not None:
        body["due"] = due_value(due)
    if notes is not None:
        body["notes"] = notes
    if completed is not None:
        body["status"] = "completed" if completed else "needsAction"
        if not completed:
            body["completed"] = None
    if not body:
        return
    with sync.locked():
        a, path, state, item, tasklist = locate(uid)
        url = API + "/lists/%s/tasks/%s" % (urllib.parse.quote(item["taskList"], safe=""), urllib.parse.quote(item["id"], safe=""))
        guard = {"If-Match": item["etag"]} if item.get("etag") else {}
        reply = auth.send_json("PATCH", url, auth.google_access(a), body, guard)
        state["tasks"][uid] = normalise(a["name"], tasklist, reply, True)
        sync.write_private(path, state)
        sync.republish()


def delete(uid):
    from . import sync
    with sync.locked():
        a, path, state, item, tasklist = locate(uid)
        url = API + "/lists/%s/tasks/%s" % (urllib.parse.quote(item["taskList"], safe=""), urllib.parse.quote(item["id"], safe=""))
        guard = {"If-Match": item["etag"]} if item.get("etag") else {}
        auth.send_json("DELETE", url, auth.google_access(a), None, guard)
        state["tasks"].pop(uid, None)
        sync.write_private(path, state)
        sync.republish()
