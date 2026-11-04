// Human-facing AM/PM times; writes stay canonical to avoid changing deadline instants.
function minutes(value) {
  var match = String(value || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return -1
  var h = Number(match[1]), m = Number(match[2] || 0), ap = (match[3] || "").toLowerCase()
  if (m > 59 || (ap ? h < 1 || h > 12 : h > 23)) return -1
  if (ap) h = h % 12 + (ap === "pm" ? 12 : 0)
  return h * 60 + m
}
function canonical(value) {
  var n = minutes(value)
  return n < 0 ? value : ("0" + Math.floor(n / 60)).slice(-2) + ":" + ("0" + n % 60).slice(-2)
}
function display(value) {
  var n = minutes(value)
  if (n < 0) return value
  var h = Math.floor(n / 60)
  return (h % 12 || 12) + ":" + ("0" + n % 60).slice(-2) + (h < 12 ? " AM" : " PM")
}
if (typeof module !== "undefined") module.exports = {minutes:minutes,canonical:canonical,display:display}
