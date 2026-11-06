const assert = require("node:assert/strict")
const Tasks = require("../Tasks.js")
const today = "2026-10-28"
const data = { tasks: [
  { title: "Later", due: "2026-10-29" },
  { title: "Today", due: today },
  { title: "Overdue", due: "2026-10-27" },
  { title: "Undated", due: "" },
  { title: "Done", due: today, status: "completed" },
  { title: "Deleted", due: today, deleted: true },
  { title: "Hidden", due: today, hidden: true }
] }
assert.deepEqual(Tasks.forDay(data, today, today, false).map(t => t.title), ["Overdue", "Today", "Undated"])
assert.deepEqual(Tasks.forDay(data, "2026-10-29", today, false).map(t => t.title), ["Later"])
assert.deepEqual(Tasks.forDay(data, "2026-10-27", today, false).map(t => t.title), ["Overdue"])
assert.equal(Tasks.forDay(data, today, today, true).length, 4)
assert.equal(Tasks.dueLabel({due: ""}, today), "No date")
assert.equal(Tasks.dueLabel({due: today}, today), "Today")
assert.equal(Tasks.dueLabel({due: "2026-10-27"}, today), "Overdue · 2026-10-27")
assert.deepEqual(Tasks.forDay(null, today, today, false), [])
console.log("Google Tasks day selection, overdue/undated filtering, completion and date-only semantics passed")
const byDay = Tasks.indexByDay(data, "#abcdef")
assert.deepEqual(Object.keys(byDay).sort(), ["2026-10-27", "2026-10-28", "2026-10-29"])
assert.equal(byDay[today][0].kind, "task")
assert.equal(byDay[today][0].allDay, true)
assert.equal(byDay[today][0].color, "#abcdef")
const events = {[today]: [{title:"Timed event",start:"2026-10-28T14:00:00Z",allDay:false}]}
const merged = Tasks.mergeDays(events, byDay)
assert.deepEqual(merged[today].map(row=>row.title), ["Today", "Timed event"])
assert.equal(events[today].length, 1)
assert.equal(merged["2026-10-29"][0].title, "Later")
assert.equal(Object.values(byDay).flat().some(task=>task.title === "Undated"), false)
console.log("Tasks are indexed by their due date and precede events without changing the event model")
