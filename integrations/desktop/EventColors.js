// Provider-owned choices only: custom Google labels come from the calendar cache.
var colorNames = {
  "#7986cb":"Lavender","#33b679":"Sage","#8e24aa":"Grape","#e67c73":"Flamingo",
  "#f6bf26":"Banana","#f4511e":"Tangerine","#039be5":"Peacock","#616161":"Graphite",
  "#3f51b5":"Blueberry","#0b8043":"Basil","#d50000":"Tomato","#795548":"Cocoa",
  "#ef6c00":"Pumpkin","#f09300":"Mango","#009688":"Eucalyptus","#7cb342":"Pistachio",
  "#c0ca33":"Avocado","#e4c441":"Citron","#4285f4":"Cobalt","#b39ddb":"Wisteria",
  "#a79b8e":"Birch","#ad1457":"Beetroot","#d81b60":"Cherry Blossom","#9e69af":"Amethyst"
}
function baseOptions(calendar) {
  var list = calendar && calendar.eventColors || []
  if (!list.length) list = [{value:"",label:"Calendar default",color:""}].concat([
    ["1","Lavender","#7986cb"],["2","Sage","#33b679"],["3","Grape","#8e24aa"],
    ["4","Flamingo","#e67c73"],["5","Banana","#f6bf26"],["6","Tangerine","#f4511e"],
    ["7","Peacock","#039be5"],["8","Graphite","#616161"],["9","Blueberry","#3f51b5"],
    ["10","Basil","#0b8043"],["11","Tomato","#d50000"]
  ].map(function(o) {return {value:"color:" + o[0],label:o[1],color:o[2]}}))
  // Sanitize old cached labels too: Google may leave label names empty or hex-only.
  return list.filter(function(o) {return o.value === "" || !!colorNames[String(o.color || "").toLowerCase()]}).map(function(o) {
    var color = String(o.color || "").toLowerCase()
    return {value:o.value,label:o.value === "" ? "Calendar default" : colorNames[color],color:color}
  })
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
  var current = selection(event, calendar)
  var list = [], byColor = {}
  baseOptions(calendar).forEach(function(option) {
    var key = option.color || "default"
    if (byColor[key] === undefined) {byColor[key] = list.length; list.push(option)}
    else if (option.value === current) list[byColor[key]] = option
  })
  if (current && !list.some(function(o) {return o.value === current})) {
    var color = String(event.color || "").toLowerCase()
    var option = {value:current,label:colorNames[color] || "Current event color",color:color}
    if (color && byColor[color] !== undefined) list[byColor[color]] = option
    else list.push(option)
  }
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
if (typeof module !== "undefined") module.exports = {selection:selection,initial:initial,options:options,args:args,colorNames:colorNames}
