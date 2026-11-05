// Class names identify the requested preset colors; their stored hex values stay unchanged.
var options = [
  {value:"#7cb342",label:"Philosophy"}, {value:"#0b8043",label:"Chemistry"},
  {value:"#039be5",label:"Calculus"}, {value:"#3f51b5",label:"Engineering"},
  {value:"#c0ca33",label:"Physics"}, {value:"#7986cb",label:"Honors"},
  {value:"#616161",label:"Other"}
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
