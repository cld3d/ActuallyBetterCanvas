import QtQuick
import Quickshell
import "@CANVAS_CALENDAR_URL@" as Calendar

ShellRoot {
  Calendar.TaskEditor {
    id: editor
    width: 500
    draft: ({provider:"canvas-local", title:"Essay", due:"2026-11-08", dueAt:"2026-11-08T23:59:00Z", notes:"Keep this", editable:true, account:"Canvas Local", taskList:"assignments"})
  }
  Timer {
    interval: 100
    running: true
    onTriggered: {
      function check(value,message) {if (!value) throw new Error(message)}
      function find(item,name) {
        if (item.objectName === name) return item
        var children = item.children || []
        for (var i=0;i<children.length;i++) {var found=find(children[i],name);if(found)return found}
        return null
      }
      var date = find(editor,"taskDueDateField"), time = find(editor,"taskDueTimeField")
      var classColor = find(editor,"taskClassColorField")
      check(classColor && classColor.text === "#616161","Color picker must load the class color, with gray fallback")
      classColor.text = "#7cb342"
      check(editor.collect().classColor === "#7cb342","Saving a class color must include it in the local write")
      var preset = find(editor,"taskClassColorPreset")
      check(preset && preset.options.length === 7,"Named class palette must be available")
      check(preset.value === "#7cb342" && preset.currentLabel() === "Philosophy","Picker must preselect the current class color")
      // Ui.Dropdown assigns value before emitting changed, which breaks a plain QML binding.
      preset.value = "#0b8043"
      preset.changed("#0b8043")
      check(editor.collect().classColor === "#0b8043","Choosing a palette color must update the write")
      var original = editor.draft
      editor.draft = Object.assign({},original,{color:"#039be5"})
      check(preset.value === "#039be5" && preset.currentLabel() === "Calculus","Reopening a different task must reset the selected option")
      classColor.text = "#AABBCC"
      check(preset.value === "#aabbcc" && preset.currentLabel().indexOf("Custom") === 0,"Custom current colors must remain selected")
      editor.draft = Object.assign({},original,{color:"#616161"})
      check(preset.currentLabel() === "Other","Gray must be named Other")
      classColor.text = ""
      check(editor.collect().classColor === "","Clearing a class color must restore its default")
      check(date && time,"Datebook must expose separate date and time fields")
      check(date.text === Qt.formatDate(new Date(editor.draft.dueAt),"yyyy-MM-dd"),"Date must load in local time")
      check(time.text === Qt.formatTime(new Date(editor.draft.dueAt),"h:mm AP"),"Time must load in local time with AM/PM")
      date.text = "2026-11-09"; time.text = "4:30 PM"
      check(editor.collect().due === "2026-11-09 16:30","Saving must preserve both date and time")
      check(editor.collect().notes === "Keep this","Notes must be preserved")
      date.text = ""
      check(editor.collect().due === "","Clearing the date must clear the personal deadline")
      editor.draft = {provider:"google",title:"Date only",due:"2026-11-10",editable:true,account:"Personal",taskList:"tasks"}
      check(time.visible === false,"Google Tasks must not pretend to support due times")
      check(editor.collect().due === "2026-11-10","Google Tasks must remain date-only")
      console.log("DEADLINE_EDITOR_PASS: separate date/time, local zone, save payloads, notes, clearing, and Google date-only compatibility")
      Qt.quit()
    }
  }
}
