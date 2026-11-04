import QtQuick
import Quickshell
import "@CANVAS_LOCK_URL@" as Lock
import "@CANVAS_LOCK_URL@/Agenda.js" as Agenda
import "@CANVAS_CALENDAR_URL@/Tasks.js" as Tasks

ShellRoot {
  QtObject {
    id: runner
    property var command: []
    property bool running: false
    signal exited(int code, int status)
  }
  Lock.TaskCompletion {
    id: completion
    watchCache: false
    executor: runner
    locked: true
    secure: true
    cache: ({accounts:[{name:"Canvas Local",provider:"canvas-local",tasksWritable:true}],
      tasks:[{uid:"canvas-local/school/7/34/12", account:"Canvas Local", editable:true, status:"needsAction", etag:"v1"}]})
  }
  Lock.CalendarAgenda {
    id: agenda
    width: 700
    height: 280
    watchCache: false
    available: true
    currentTime: new Date(2026,10,4,10,0)
    eventData: ({calendars:[{account:"Test",id:"calendar",shown:true}],
      events:[{account:"Test",calendar:"calendar",title:"Meeting",start:new Date(2026,10,4,12,0).toISOString(),end:new Date(2026,10,4,13,0).toISOString()}],
      tasks:[{uid:"morning",title:"Earlier task",dueAt:new Date(2026,10,4,11,0).toISOString(),status:"needsAction"},
        {uid:"afternoon",title:"Later task",dueAt:new Date(2026,10,4,14,0).toISOString(),status:"needsAction"}]})
  }
  Timer {
    interval: 50
    running: true
    onTriggered: {
      function check(value, message) { if (!value) throw new Error(message) }
      var uid = "canvas-local/school/7/34/12"
      check(agenda.rows.length === 3 && agenda.rows[0].uid === "morning" && agenda.rows[1].kind === "event" && agenda.rows[2].uid === "afternoon", "Running agenda component must interleave tasks and events by time")
      var timed = {uid:uid,title:"Essay",due:"2026-11-08",dueAt:"2026-11-08T23:59:00Z",listName:"English",status:"needsAction"}
      check(Agenda.remainingTasks({tasks:[timed]},new Date(),true)[0].location.indexOf("Due ") === 0, "Lock screen must show the exact due time")
      check(Tasks.dueLabel(timed,"2026-11-08").indexOf("Today · ") === 0, "Datebook must show the exact due time")
      check(!completion.canComplete(uid), "Canvas tasks must remain read-only before authentication")
      completion.authenticated = true
      check(completion.canComplete(uid), "Authenticated Canvas tasks must be checkable")
      check(completion.complete(uid), "Canvas task completion should start")
      check(runner.command[1] === "task-complete" && runner.command[2] === uid && runner.command[3] === "--no-sync", "Canvas tasks must go through the shared Datebook writer")
      check(!completion.canComplete(uid), "Pending tasks must not allow duplicate writes")
      runner.running = false
      runner.exited(0, 0)
      check(!completion.canComplete(uid), "Confirmed task version must not be completed twice")
      completion.cache = {accounts:[{name:"Canvas Local",provider:"canvas-local",tasksWritable:true}],
        tasks:[{uid:uid,account:"Canvas Local",editable:true,status:"needsAction",etag:"v2"}]}
      check(completion.canComplete(uid), "Manually reopened tasks must be checkable again")
      completion.secure = false
      check(!completion.canComplete(uid), "An insecure lock must not allow task edits")
      console.log("CANVAS_LOCK_PASS: authentication, secure lock, shared writer, duplicate gating, and reopened task versions")
      Qt.quit()
    }
  }
}
