// Class-color presets use Google Calendar's event color names; any #RRGGBB
// also works. The stored value is always a hex string, so labels are just
// shortcuts and per-class choices persist in the local color table.
var options = [
  {value:"#7986cb",label:"Lavender"}, {value:"#33b679",label:"Sage"},
  {value:"#8e24aa",label:"Grape"}, {value:"#e67c73",label:"Flamingo"},
  {value:"#f6bf26",label:"Banana"}, {value:"#f4511e",label:"Tangerine"},
  {value:"#039be5",label:"Peacock"}, {value:"#616161",label:"Graphite"},
  {value:"#3f51b5",label:"Blueberry"}, {value:"#0b8043",label:"Basil"},
  {value:"#d50000",label:"Tomato"}
]
function normalize(value) { return String(value || "").trim().toLowerCase() }
function optionsFor(value) {
  var current = normalize(value), list = options.slice()
  if (!current) list.push({value:"",label:"Class default"})
  else if (!list.some(function(option) {return option.value === current}))
    list.push({value:current,label:"Custom (" + current + ")"})
  return list
}
if (typeof module !== "undefined") module.exports = {options:options,optionsFor:optionsFor,normalize:normalize}
