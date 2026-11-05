import QtQuick
import qs.Commons
import qs.Ui

// Event color swatch grid in Omarchy panel style.
//
// Options are provider-owned {value, label, color} entries; the empty value
// means Calendar default. Emits changed(value) on selection and never assigns
// root.value internally, so the parent's value binding survives selection.
Item {
  id: root
  property var options: []
  property string value: ""
  property bool enabled: true
  property color foreground: Color.foreground
  property string fontFamily: Style.font.family
  signal changed(string value)

  function currentLabel() {
    for (var i = 0; i < options.length; i++) {
      if (String(options[i].value) === root.value) return String(options[i].label)
    }
    return root.value
  }
  function choose(v) { root.changed(String(v)) }
  function contrast(hex) {
    var m = String(hex || "").match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    if (!m) return "white"
    var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "black" : "white"
  }

  readonly property var swatches: options.filter(function(o) { return o.value !== "" })
  implicitHeight: layout.implicitHeight

  Column {
    id: layout
    width: parent.width
    spacing: Style.space(8)

    Button {
      text: "Calendar default"
      iconText: root.value === "" ? "󰄬" : ""
      bordered: root.value === ""
      selected: root.value === ""
      focusable: root.enabled
      enabled: root.enabled
      foreground: root.foreground
      fontFamily: root.fontFamily
      tooltipText: "Remove the event's color override"
      onClicked: if (root.enabled) root.changed("")
    }

    Grid {
      columns: 9
      columnSpacing: Style.space(8)
      rowSpacing: Style.space(8)

      Repeater {
        model: root.swatches
        delegate: Item {
          id: swatch
          required property var modelData
          required property int index
          width: Style.space(28)
          height: width
          activeFocusOnTab: root.enabled
          Accessible.name: modelData.label
          Accessible.role: Accessible.Button
          Accessible.selected: modelData.value === root.value

          Keys.onReturnPressed: if (root.enabled) root.changed(modelData.value)
          Keys.onSpacePressed: if (root.enabled) root.changed(modelData.value)

          Rectangle {
            anchors.centerIn: parent
            width: Style.space(24)
            height: width
            radius: width / 2
            color: modelData.color
            // No selection outline: the checkmark alone marks the current
            // color. The accent ring appears only for keyboard focus.
            border.width: swatch.activeFocus ? 2 : 0
            border.color: Color.accent
            opacity: root.enabled ? 1 : 0.5

            Text {
              anchors.centerIn: parent
              // The check glyph's ink sits high and left in its em box, so
              // geometric centering reads off-center: nudge it optically.
              anchors.verticalCenterOffset: 1
              anchors.horizontalCenterOffset: -1
              textFormat: Text.PlainText
              text: "✓"
              visible: modelData.value === root.value
              color: root.contrast(modelData.color)
              font.pixelSize: Style.font.body
              font.bold: true
            }
          }

          MouseArea {
            id: swatchMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: root.enabled ? Qt.PointingHandCursor : Qt.ArrowCursor
            enabled: root.enabled
            objectName: "eventSwatch:" + modelData.value
            property string tipText: modelData.label
            onClicked: root.changed(modelData.value)

            PanelToolTip {
              visible: swatchMouse.containsMouse
              text: swatchMouse.tipText
              fontFamily: root.fontFamily
            }
          }
        }
      }
    }
  }
}
