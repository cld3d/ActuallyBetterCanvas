// Provider-owned choices only: custom Google labels come from the calendar cache.
function selection(event) {
  return event && event.eventLabelId ? "label:" + event.eventLabelId
    : event && event.colorId ? "color:" + event.colorId : ""
}
function options(calendar, event) {
  var list = calendar && calendar.eventColors || []
  if (!list.length) list = [{value:"",label:"Calendar default",color:""}].concat([
    ["1","Lavender","#7986cb"],["2","Sage","#33b679"],["3","Grape","#8e24aa"],
    ["4","Flamingo","#e67c73"],["5","Banana","#f6bf26"],["6","Tangerine","#f4511e"],
    ["7","Peacock","#039be5"],["8","Graphite","#616161"],["9","Blueberry","#3f51b5"],
    ["10","Basil","#0b8043"],["11","Tomato","#d50000"]
  ].map(function(o) {return {value:"color:" + o[0],label:o[1],color:o[2]}}))
  list = list.slice()
  var current = selection(event)
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
if (typeof module !== "undefined") module.exports = {selection:selection,options:options,args:args}
