// Provider-owned choices only: custom Google labels come from the calendar cache.
function baseOptions(calendar) {
  var list = calendar && calendar.eventColors || []
  if (!list.length) list = [{value:"",label:"Calendar default",color:""}].concat([
    ["1","Lavender","#7986cb"],["2","Sage","#33b679"],["3","Grape","#8e24aa"],
    ["4","Flamingo","#e67c73"],["5","Banana","#f6bf26"],["6","Tangerine","#f4511e"],
    ["7","Peacock","#039be5"],["8","Graphite","#616161"],["9","Blueberry","#3f51b5"],
    ["10","Basil","#0b8043"],["11","Tomato","#d50000"]
  ].map(function(o) {return {value:"color:" + o[0],label:o[1],color:o[2]}}))
  return list.slice()
}
function selection(event, calendar) {
  if (event && event.eventLabelId) return "label:" + event.eventLabelId
  if (event && event.colorId) return "color:" + event.colorId
  // Old caches did not retain provider IDs. Match their visible color only for
  // display; merely opening the editor must never write this inferred choice.
  if (event && event.eventColorKnown === false && event.color) {
    var color = String(event.color).toLowerCase()
    if (calendar && String(calendar.color || "").toLowerCase() === color) return ""
    var match = baseOptions(calendar).filter(function(o) {return String(o.color || "").toLowerCase() === color})[0]
    if (match) return match.value
  }
  return ""
}
function initial(draft, calendar) {
  if (draft.eventColor || draft.eventColorKnown !== false) return draft.eventColor || ""
  return selection({eventColorKnown:false,color:draft.eventColorHint},calendar)
}
function options(calendar, event) {
  var list = baseOptions(calendar)
  var current = selection(event, calendar)
  if (current && !list.some(function(o) {return o.value === current}))
    list.push({value:current,label:"Current event color",color:event.color || ""})
  return list
}
function args(draft, result) {
  if (!result || result.error || !draft.eventColorChanged) return result
  var args = (result.args || []).slice()
  if (!args.length) args = ["update",draft.uid]
  args.push("--event-color",draft.eventColor || "")
  if (draft.series && args.indexOf("--series") < 0) args.push("--series")
  return {args:args}
}
if (typeof module !== "undefined") module.exports = {selection:selection,initial:initial,options:options,args:args}
