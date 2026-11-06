import QtQuick
import qs.Commons
import qs.Ui
import "Tasks.js" as Tasks

Column {
  id: root
  property var p: null
  readonly property color foreground: p ? p.contentForeground : Color.foreground
  readonly property string fontName: p ? p.contentFontFamily : Style.font.family
  visible: !!p && p.hasGoogleAccounts
  spacing: Style.space(7)

  Row {
    width: parent.width
    spacing: Style.space(6)
    Text {
      width: parent.width - allButton.width - openButton.width - parent.spacing * 2 - (newButton.visible ? newButton.width + parent.spacing : 0)
      anchors.verticalCenter: parent.verticalCenter
      text: root.p && root.p.showAllTasks ? "ALL TASKS" : "TASKS"
      color: Qt.darker(root.foreground, 1.4)
      font.family: root.fontName
      font.pixelSize: Style.font.caption
      font.letterSpacing: 1
      font.bold: true
    }
    Button {
      id: allButton
      text: root.p && root.p.showAllTasks ? "Day" : "All"
      tooltipText: root.p && root.p.showAllTasks ? "Tasks for the selected day" : "All unfinished Google Tasks"
      foreground: root.foreground
      fontFamily: root.fontName
      onClicked: root.p.showAllTasks = !root.p.showAllTasks
    }
    PanelActionButton {
      id: newButton
      visible: !!root.p && root.p.editableTaskLists.length > 0
      iconText: "󰐕"
      tooltipText: "New task"
      foreground: root.foreground
      fontFamily: root.fontName
      onClicked: root.p.newTask()
    }
    PanelActionButton {
      id: openButton
      iconText: "󰏌"
      tooltipText: "Open Google Tasks"
      foreground: root.foreground
      fontFamily: root.fontName
      onClicked: root.p.openUrl("https://tasks.google.com/")
    }
  }

  Text {
    width: parent.width
    visible: text.length > 0
    text: root.p ? root.p.tasksProblemText : ""
    textFormat: Text.PlainText
    wrapMode: Text.WordWrap
    color: Qt.darker(root.foreground, 1.4)
    font.family: root.fontName
    font.pixelSize: Style.font.caption
  }

  Repeater {
    model: root.p ? root.p.selectedTasks : []
    delegate: Rectangle {
      id: taskRow
      required property var modelData
      width: root.width
      height: taskText.implicitHeight + Style.space(10)
      radius: Style.cornerRadius
      color: mouse.containsMouse ? Style.hoverFillFor(root.foreground, Color.accent) : "transparent"
      Column {
        id: taskText
        x: Style.space(26); y: Style.space(5)
        width: parent.width - x - Style.space(4)
        spacing: Style.space(3)
        Text {
          width: parent.width
          text: taskRow.modelData.title
          textFormat: Text.PlainText
          wrapMode: Text.WordWrap
          maximumLineCount: 2
          elide: Text.ElideRight
          color: root.foreground
          font.family: root.fontName
          font.pixelSize: Style.font.bodySmall
        }
        Text {
          width: parent.width
          text: Tasks.dueLabel(taskRow.modelData, root.p.todayKey) + " · " + taskRow.modelData.listName
          textFormat: Text.PlainText
          elide: Text.ElideRight
          color: Qt.darker(root.foreground, 1.5)
          font.family: root.fontName
          font.pixelSize: Style.font.caption
        }
      }
      MouseArea {
        id: mouse
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: root.p.openTask(taskRow.modelData)
      }
      PanelActionButton {
        x: 0; y: Style.space(1)
        iconText: "󰄱"
        enabled: !!taskRow.modelData.editable && root.p.writingUid === ""
        tooltipText: taskRow.modelData.editable ? "Mark complete" : "Read-only task"
        foreground: root.foreground
        fontFamily: root.fontName
        onClicked: root.p.completeTask(taskRow.modelData)
      }
    }
  }

  Text {
    width: parent.width
    visible: !!root.p && root.p.selectedTasks.length === 0 && root.p.tasksProblemText.length === 0
    text: root.p && root.p.showAllTasks ? "No unfinished tasks." : "No tasks for this day."
    color: Qt.darker(root.foreground, 1.5)
    font.family: root.fontName
    font.pixelSize: Style.font.bodySmall
  }
}
