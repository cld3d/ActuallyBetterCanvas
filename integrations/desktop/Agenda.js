// Canvas Local deadlines v2. Date-only tasks and exact deadline instants stay distinct.
function remaining(data, now) {
  if (!data || !Array.isArray(data.events)) return []
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  function key(d) {
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2)
  }
  var dayKey = key(today)
  var calendars = {}
  ;(data.calendars || []).forEach(function(c) { calendars[c.account + "/" + c.id] = c })
  return data.events.filter(function(e) {
    var cal = calendars[e.account + "/" + e.calendar]
    if (!cal || cal.shown === false || e.status === "cancelled" || e.response === "declined") return false
    if (e.allDay) return e.start <= dayKey && e.end > dayKey
    var start = new Date(e.start), end = new Date(e.end)
    return isFinite(start.getTime()) && isFinite(end.getTime()) && end > now && start < tomorrow && end > today
  }).sort(function(a, b) {
    if (!!a.allDay !== !!b.allDay) return a.allDay ? -1 : 1
    return a.start < b.start ? -1 : a.start > b.start ? 1 : String(a.title || "").localeCompare(String(b.title || ""))
  }).map(function(e) {
    var cal = calendars[e.account + "/" + e.calendar]
    return {
      kind: "event",
      title: e.title || "Untitled event", start: e.start, end: e.end,
      allDay: !!e.allDay, ongoing: !e.allDay && new Date(e.start) <= now,
      location: e.location || "", calendar: cal.name || "",
      color: /^#[0-9a-f]{6}$/i.test(e.color || "") ? e.color : (/^#[0-9a-f]{6}$/i.test(cal.color || "") ? cal.color : "")
    }
  })
}

function taskDeadline(task) {
  var date = task.dueAt ? new Date(task.dueAt) : null
  return date && isFinite(date.getTime()) ? date : null
}

function taskDay(task) {
  var date = taskDeadline(task)
  return date ? date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2) : task.due || ""
}

function taskTime(task) {
  var date = taskDeadline(task)
  return date ? (date.getHours() % 12 || 12) + ":" + ("0" + date.getMinutes()).slice(-2) + (date.getHours() < 12 ? " AM" : " PM") : ""
}

function remainingTasks(data, now, includeFuture) {
  var today = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2)
  function late(task) {
    var deadline = taskDeadline(task)
    return deadline ? deadline.getTime() <= now.getTime() : !!task.due && task.due < today
  }
  function priority(task) {
    var day = taskDay(task)
    return late(task) ? 0 : day === today ? 1 : !day ? 3 : 2
  }
  return ((data && data.tasks) || []).filter(function(task) {
    var day = taskDay(task)
    return task.status !== "completed" && !task.deleted && !task.hidden && (includeFuture || !day || day <= today)
  }).slice().sort(function(a, b) {
    var ap = priority(a), bp = priority(b)
    if (ap !== bp) return ap - bp
    var ad = taskDay(a) || "9999-12-31", bd = taskDay(b) || "9999-12-31"
    if (ad !== bd) return ad < bd ? -1 : 1
    var at = taskDeadline(a), bt = taskDeadline(b)
    var am = at ? at.getTime() : Infinity, bm = bt ? bt.getTime() : Infinity
    if (am !== bm) return am < bm ? -1 : 1
    return String(a.position || "").localeCompare(String(b.position || ""))
  }).map(function(task) {
    var day = taskDay(task), time = taskTime(task), isLate = late(task)
    var label = !day ? "No date" : day === today ? "Today"
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(day.slice(5, 7)) - 1] + " " + Number(day.slice(8, 10))
    return {
      kind: "task", title: task.title || "Untitled task", calendar: task.listName || "Tasks",
      uid: task.uid || "", editable: task.editable === true,
      dueAt: taskDeadline(task) ? task.dueAt : "", due: day,
      version: String(task.etag || task.updated || data && data.generatedAt || ""),
      location: time ? (isLate ? "Overdue · " : "Due ") + time + " · " + (task.listName || "Canvas") : "",
      color: "", overdue: isLate, dueLabel: isLate && !time ? "Overdue" : label, timeLabel: time
    }
  })
}

function mergeRows(events, tasks) {
  function time(row) {
    var value = row.kind === "task" ? row.dueAt || row.due : row.start
    if (!value) return Infinity
    // Date-only rows belong at the beginning of their LOCAL day, not midnight UTC.
    var date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + "T00:00:00") : new Date(value)
    return isFinite(date.getTime()) ? date.getTime() : Infinity
  }
  return (events || []).concat(tasks || []).map(function(row, index) {
    return {row:row, time:time(row), index:index}
  }).sort(function(a, b) {
    if (a.time !== b.time) return a.time < b.time ? -1 : 1
    return a.index - b.index
  }).map(function(entry) { return entry.row })
}

if (typeof module !== "undefined") module.exports = {remaining:remaining, remainingTasks:remainingTasks, mergeRows:mergeRows}
