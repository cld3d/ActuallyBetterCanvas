import QtQuick
import QtQuick.Controls as Controls
import "Clock.js" as Clock
import qs.Commons
import qs.Ui

Item {
  id: editor
  property var draft: null
  property var lists: []
  property bool saving: false
  property string error: ""
  property color foreground: Color.foreground
  property string fontFamily: Style.font.family
  property string listRef: ""
  property bool confirmingDelete: false
  readonly property bool creating: !!draft && draft.mode === "create"
  readonly property bool editable: !!draft && draft.editable
  implicitHeight: form.implicitHeight

  signal save(var task)
  signal cancel()
  signal complete()
  signal remove()
  signal openLink(string url)

  function load() {
    if (!draft) return
    titleField.text = draft.title || ""
    dueField.text = draft.due || ""
    notesField.text = draft.notes || ""
    listRef = draft.listRef || draft.account + "/" + draft.taskList
    confirmingDelete = false
    Qt.callLater(function() { if (editor.editable) titleField.forceActiveFocus() })
  }
  onDraftChanged: load()

  function submit() {
    if (saving || !editable) return
    editor.save(collect())
  }

  function collect() {
    return Object.assign({}, draft, {title: titleField.text, due: dueField.text, notes: notesField.text, listRef: listRef})
  }

  component Caption: Text {
    color: Qt.darker(editor.foreground, 1.4)
    font.family: editor.fontFamily
    font.pixelSize: Style.font.bodySmall
    textFormat: Text.PlainText
  }

  Column {
    id: form
    width: parent.width
    spacing: Style.space(10)
    Caption { text: editor.creating ? "NEW TASK" : "TASK"; font.letterSpacing: 1 }
    TextField {
      id: titleField
      objectName: "taskTitleField"
      width: parent.width
      placeholderText: "Title"
      foreground: editor.foreground
      font.family: editor.fontFamily
      font.pixelSize: Style.font.subtitle
      readOnly: !editor.editable || editor.saving
      Keys.onReturnPressed: editor.submit()
      Keys.onEscapePressed: editor.cancel()
    }
    Dropdown {
      visible: editor.creating
      width: parent.width
      showLabel: false
      options: editor.lists
      value: editor.listRef
      foreground: editor.foreground
      fontFamily: editor.fontFamily
      onChanged: function(value) { editor.listRef = value }
    }
    Caption {
      visible: !editor.creating
      text: editor.draft ? editor.draft.listName || "Google Tasks" : ""
    }
    Caption { text: "DUE DATE"; font.letterSpacing: 1 }
    TextField {
      id: dueField
      width: parent.width
      placeholderText: "YYYY-MM-DD · leave blank for no date"
      foreground: editor.foreground
      font.family: editor.fontFamily
      readOnly: !editor.editable || editor.saving
      Keys.onReturnPressed: editor.submit()
      Keys.onEscapePressed: editor.cancel()
    }
    Caption { text: "NOTES"; font.letterSpacing: 1 }
    Controls.TextArea {
      id: notesField
      objectName: "taskNotesField"
      width: parent.width
      implicitHeight: Math.max(Style.space(80), contentHeight + topPadding + bottomPadding)
      placeholderText: "Notes"
      placeholderTextColor: Qt.darker(editor.foreground, 1.6)
      color: editor.foreground
      selectionColor: Color.accent
      font.family: editor.fontFamily
      font.pixelSize: Style.font.body
      wrapMode: TextEdit.Wrap
      padding: Style.space(8)
      readOnly: !editor.editable || editor.saving
      background: Rectangle {
        radius: Style.cornerRadius
        color: Qt.rgba(editor.foreground.r, editor.foreground.g, editor.foreground.b, 0.05)
        border.width: 1
        border.color: Qt.rgba(editor.foreground.r, editor.foreground.g, editor.foreground.b, 0.2)
      }
      Keys.onEscapePressed: editor.cancel()
    }
    Caption {
      visible: !editor.editable && !!editor.draft
      width: parent.width
      wrapMode: Text.WordWrap
      text: "Allow read/write Tasks access with calendar-ctl enable-tasks " + (editor.draft ? editor.draft.account : "")
    }
    Caption {
      visible: editor.error.length > 0
      width: parent.width
      wrapMode: Text.WordWrap
      text: editor.error
      color: Color.urgent
    }
    Flow {
      width: parent.width
      spacing: Style.space(6)
      Button {
        text: editor.saving ? "Saving…" : "Save"
        visible: editor.editable
        enabled: !editor.saving
        bordered: true
        foreground: editor.foreground
        fontFamily: editor.fontFamily
        onClicked: editor.submit()
      }
      Button {
        text: "Complete"
        visible: !editor.creating && editor.editable
        enabled: !editor.saving
        foreground: editor.foreground
        fontFamily: editor.fontFamily
        onClicked: editor.complete()
      }
      Button {
        text: "Close"
        enabled: !editor.saving
        foreground: editor.foreground
        fontFamily: editor.fontFamily
        onClicked: editor.cancel()
      }
      Button {
        text: editor.confirmingDelete ? "Confirm delete" : "Delete"
        visible: !editor.creating && editor.editable
        enabled: !editor.saving
        foreground: editor.confirmingDelete ? Color.urgent : editor.foreground
        fontFamily: editor.fontFamily
        onClicked: {
          if (editor.confirmingDelete) editor.remove()
          else editor.confirmingDelete = true
        }
      }
      Button {
        text: "Open in Google Tasks"
        visible: !editor.creating && !!editor.draft
        foreground: editor.foreground
        fontFamily: editor.fontFamily
        onClicked: editor.openLink(editor.draft.webLink || "https://tasks.google.com/")
      }
    }
  }
}
