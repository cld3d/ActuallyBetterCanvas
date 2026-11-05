#!/usr/bin/python3
"""Run QML integration tests offscreen against installed plugins, or explicitly skip."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--strict', action='store_true', help='fail if desktop dependencies are missing/disabled')
    args = parser.parse_args()
    plugins = Path(os.environ.get('CANVAS_DESKTOP_PLUGIN_DIR', Path(os.environ.get('XDG_CONFIG_HOME', Path.home() / '.config')) / 'omarchy/plugins')).resolve()
    shell = Path(os.environ.get('CANVAS_OMARCHY_SHELL_DIR', '/usr/share/omarchy/shell')).resolve()
    for variable, path in [('CANVAS_DESKTOP_PLUGIN_DIR', plugins), ('CANVAS_OMARCHY_SHELL_DIR', shell)]:
        if variable in os.environ and not path.is_dir():
            parser.error(variable + ' does not exist: ' + str(path))
    missing = []
    if os.environ.get('CANVAS_SKIP_DESKTOP_TESTS') == '1':
        missing.append('desktop tests explicitly disabled')
    if not shutil.which('quickshell'):
        missing.append('quickshell not installed')
    for path in [shell / 'Commons/qmldir', plugins / 'blacksheep.calendar/TaskEditor.qml',
                 plugins / 'blacksheep.calendar/EventEditor.qml', plugins / 'blacksheep.calendar/EventColors.js',
                 plugins / 'blacksheep.calendar/EventColorSwatches.qml',
                 plugins / 'gavin.lock/TaskCompletion.qml']:
        if not path.is_file():
            missing.append(str(path))
    if missing:
        print('SKIP desktop QML tests: ' + '; '.join(missing))
        return 1 if args.strict else 0
    preferred_temp = Path('/tmp/opencode')
    with tempfile.TemporaryDirectory(prefix='canvas-qml-', dir=preferred_temp if preferred_temp.is_dir() else None) as directory:
        temp = Path(directory)
        imports = temp / 'imports'
        imports.mkdir()
        (imports / 'qs').symlink_to(shell, target_is_directory=True)
        env = dict(os.environ, QT_QPA_PLATFORM='offscreen', QML_IMPORT_PATH=str(imports) + os.pathsep + os.environ.get('QML_IMPORT_PATH', ''))
        for filename, marker in [('deadline-editor.qml', 'DEADLINE_EDITOR_PASS'), ('lock-canvas.qml', 'CANVAS_LOCK_PASS'), ('event-colors.qml', 'EVENT_COLORS_PASS')]:
            text = (ROOT / 'tests' / filename).read_text()
            text = text.replace('@CANVAS_CALENDAR_URL@', (plugins / 'blacksheep.calendar').as_uri())
            text = text.replace('@CANVAS_LOCK_URL@', (plugins / 'gavin.lock').as_uri())
            config = temp / filename
            config.write_text(text)
            try:
                result = subprocess.run(['quickshell', '--no-color', '-p', str(config)], env=env,
                                        capture_output=True, text=True, timeout=20)
            except subprocess.TimeoutExpired as error:
                print('FAIL ' + filename + ': timed out')
                print(error.stdout or '', error.stderr or '')
                return 1
            output = result.stdout + result.stderr
            print(output)
            if result.returncode or marker not in output:
                print('FAIL ' + filename + ': no successful completion marker')
                return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
