import QtQuick
import qs.Commons
import qs.Ui

Item {
  id: root
  property var p: null
  readonly property bool eventMode: !p || p.creationKind === "event"
  implicitHeight: form.implicitHeight

  Column {
    id: form
    width: parent.width
    spacing: Style.space(14)

    ButtonGroup {
      objectName: "creationKindSelector"
      options: root.p ? root.p.creationOptions : []
      value: root.p ? root.p.creationKind : "event"
      foreground: root.p ? root.p.contentForeground : Color.foreground
      fontFamily: root.p ? root.p.contentFontFamily : Style.font.family
      fontSize: Style.font.bodySmall
      onChanged: function(kind) {
        if (!root.p || kind === root.p.creationKind) return
        root.p.switchCreationKind(kind, root.eventMode ? eventForm.collect() : taskForm.collect())
      }
    }

    EventEditor {
      id: eventForm
      objectName: "creationEventForm"
      visible: root.eventMode
      width: parent.width
      height: visible ? implicitHeight : 0
      draft: root.p && root.p.creating && root.eventMode ? root.p.draft : null
      event: null
      calendars: root.p ? root.p.editableCalendars : []
      saving: !!root.p && root.p.writingUid !== ""
      error: root.p ? root.p.editorError : ""
      foreground: root.p ? root.p.contentForeground : Color.foreground
      fontFamily: root.p ? root.p.contentFontFamily : Style.font.family
      onSave: function(draft) { root.p.saveDraft(draft) }
      onCancel: root.p.closeEditor()
    }

    TaskEditor {
      id: taskForm
      objectName: "creationTaskForm"
      visible: !root.eventMode
      width: parent.width
      height: visible ? implicitHeight : 0
      draft: root.p && root.p.creating && !root.eventMode ? root.p.taskDraft : null
      lists: root.p ? root.p.editableTaskLists : []
      saving: !!root.p && root.p.writingUid !== ""
      error: root.p ? root.p.editorError : ""
      foreground: root.p ? root.p.contentForeground : Color.foreground
      fontFamily: root.p ? root.p.contentFontFamily : Style.font.family
      onSave: function(task) { root.p.saveTask(task) }
      onCancel: root.p.closeEditor()
    }
  }
}
