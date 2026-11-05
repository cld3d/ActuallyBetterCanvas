import QtQuick
import Quickshell
import "@CANVAS_CALENDAR_URL@" as Calendar
import "@CANVAS_CALENDAR_URL@/Model.js" as Model
import "@CANVAS_CALENDAR_URL@/EventColors.js" as EventColors

ShellRoot {
  Calendar.EventEditor {
    id: editor
    width: 500
    event: ({uid:"Test/calendar/event",account:"Test",calendar:"calendar",title:"Synthetic meeting",location:"",start:"2026-11-10T15:00:00Z",end:"2026-11-10T16:00:00Z",editable:true,colorId:"9",provider:"google"})
    draft: Model.eventDraft(event)
    calendars: [{value:"Test/calendar",label:"Calendar",provider:"google",eventColors:[
      {value:"",label:"Calendar default",color:""},
      {value:"color:9",label:"Blueberry",color:"#3f51b5"},
      {value:"label:pistachio",label:"#7cb342",color:"#7cb342"}]}]
  }
  Timer {
    interval: 100
    running: true
    onTriggered: {
      function check(value,message) {if(!value) throw new Error(message)}
      function find(item,name) {
        if(item.objectName === name) return item
        var children = item.children || []
        for(var i=0;i<children.length;i++) {var match=find(children[i],name);if(match)return match}
        return null
      }
      function swatches() {
        var out = []
        function walk(item) {
          if(item.objectName && item.objectName.indexOf("eventSwatch:") === 0) out.push(item)
          var children = item.children || []
          for(var i=0;i<children.length;i++) walk(children[i])
        }
        walk(editor)
        return out
      }
      var picker = find(editor,"eventColorPicker")
      check(picker && picker.visible && picker.value === "color:9","Editable Google events preselect their current provider color")
      check(picker.currentLabel() === "Blueberry","Preselected swatch must show the color name, not a hex code")
      var original = editor.collect()
      check(!original.eventColorChanged,"Opening an event must not rewrite its color")
      var cells = swatches()
      check(cells.length === 2,"Swatch grid shows one circle per color (Calendar default is a separate button)")
      for(var i=0;i<cells.length;i++) {
        check(cells[i].tipText && cells[i].tipText.indexOf("#") < 0,"Hovering a swatch must name its color, never a hex code: " + cells[i].tipText)
      }
      picker.choose("label:pistachio")
      var draft = editor.collect()
      var args = EventColors.args(draft,Model.draftArgs(draft)).args
      check(args.length === 4 && args[0] === "update" && args[2] === "--event-color" && args[3] === "label:pistachio","Color-only saves must reach the Google event writer without rescheduling")
      check(picker.value === "label:pistachio" && picker.currentLabel() === "Pistachio","Selecting a swatch updates the checked color by name")
      picker.choose("")
      check(editor.collect().eventColorChanged && editor.collect().eventColor === "","Calendar default must explicitly clear a color override")
      var original = editor.event
      editor.event = Object.assign({},original,{colorId:"",eventLabelId:"pistachio"})
      check(picker.value === "label:pistachio" && picker.currentLabel() === "Pistachio","Reopening a labelled event must preselect its saved label")
      check(!editor.collect().eventColorChanged,"Reopening must not cause an automatic provider write")
      editor.event = Object.assign({},original,{colorId:"",eventLabelId:"",eventColorKnown:false,color:"#3f51b5"})
      check(picker.value === "color:9","Legacy cached colors must be recognized for display")
      check(!editor.collect().eventColorChanged,"Inferring an old cache color must not write to Google")
      editor.event = Object.assign({},original,{colorId:"",eventLabelId:"",eventColorKnown:true,color:"#3f51b5"})
      check(picker.value === "","Known inherited colors must select Calendar default, not an override")
      editor.event = Object.assign({},editor.event,{editable:false})
      check(!picker.visible,"Read-only events must not expose color editing")
      editor.event = Object.assign({},editor.event,{editable:true})
      editor.calendars = [{value:"Test/calendar",label:"Outlook",provider:"microsoft"}]
      check(!picker.visible && !editor.collect().eventColorChanged,"Non-Google calendars must not pretend to support Google colors")
      console.log("EVENT_COLORS_PASS: swatch grid, named tooltips, preselected check, color-only writes, reset, permissions and provider gating")
      Qt.quit()
    }
  }
}
