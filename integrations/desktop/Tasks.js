// Canvas Local deadlines v2. dueAt is an instant; Google's due remains date-only.
function dueInstant(task) {
  var value = task.dueAt ? new Date(task.dueAt) : null
  return value && isFinite(value.getTime()) ? value : null
}

function dateKey(date) {
  return date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2)
}

function dueDay(task) {
  var date = dueInstant(task)
  return date ? dateKey(date) : task.due || ""
}

function timeLabel(task, use24h) {
  var date = dueInstant(task)
  if (!date) return ""
  var hours = date.getHours(), minutes = ("0" + date.getMinutes()).slice(-2)
  return use24h ? ("0" + hours).slice(-2) + ":" + minutes : (hours % 12 || 12) + ":" + minutes + (hours < 12 ? " AM" : " PM")
}

function overdue(task, now) {
  now = now || new Date()
  var date = dueInstant(task)
  return date ? date.getTime() <= now.getTime() : !!task.due && task.due < dateKey(now)
}

function compare(a, b) {
  var ad = dueDay(a) || "9999-12-31", bd = dueDay(b) || "9999-12-31"
  if (ad !== bd) return ad < bd ? -1 : 1
  var at = dueInstant(a), bt = dueInstant(b)
  // Date-only tasks have no exact deadline: keep them after timed deadlines that day.
  var am = at ? at.getTime() : Infinity, bm = bt ? bt.getTime() : Infinity
  if (am !== bm) return am < bm ? -1 : 1
  var ak = a.account + "/" + a.taskList + "/" + (a.position || "")
  var bk = b.account + "/" + b.taskList + "/" + (b.position || "")
  return ak < bk ? -1 : ak > bk ? 1 : 0
}

function forDay(data, day, today, all, now) {
  return ((data && data.tasks) || []).filter(function(t) {
    if (t.status === "completed" || t.deleted || t.hidden) return false
    if (all) return true
    var due = dueDay(t)
    if (day === today) return !due || due <= today
    return due === day
  }).slice().sort(compare)
}

function dueLabel(task, today, now, use24h) {
  var day = dueDay(task)
  if (!day) return "No date"
  var time = timeLabel(task, use24h)
  var late = now ? overdue(task, now) : day < today
  var label = day === today ? "Today" : day
  if (late) label = "Overdue · " + label
  return label + (time ? " · " + time : "")
}

function indexByDay(data, color, use24h) {
  var byDay = {}
  ;((data && data.tasks) || []).forEach(function(task) {
    var day = dueDay(task), date = dueInstant(task)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || task.status === "completed" || task.deleted || task.hidden) return
    // Local 11:59 PM means end-of-day work: display in the top strip only.
    // Preserve dueAt and source timestamps for editing, syncing, and overdue status.
    var endOfDay = !!date && date.getHours() === 23 && date.getMinutes() === 59
    var row = Object.assign({}, task, {
      kind: "task", allDay: !date || endOfDay, deadline: !!date, endOfDay: endOfDay,
      color: /^#[0-9a-f]{6}$/i.test(task.color || "") ? task.color : color || "#9ca3af", calendarName: task.listName || "Tasks", declined: false,
      taskTime: timeLabel(task, use24h), label: date ? "Due " + timeLabel(task, use24h) : "Task"
    })
    // A deadline is a point, not an invented work session. The grid supplies its visual footprint.
    if (date) { row.start = date.toISOString(); row.end = row.start }
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(row)
  })
  for (var day in byDay) byDay[day].sort(compare)
  return byDay
}

function mergeDays(events, tasks) {
  var days = {}
  for (var day in events) days[day] = events[day]
  for (var due in tasks) days[due] = tasks[due].concat(days[due] || [])
  return days
}

if (typeof module !== "undefined") module.exports = {dueInstant:dueInstant, dueDay:dueDay, timeLabel:timeLabel, overdue:overdue, compare:compare, forDay:forDay, dueLabel:dueLabel, indexByDay:indexByDay, mergeDays:mergeDays}
