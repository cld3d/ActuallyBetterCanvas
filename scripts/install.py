#!/usr/bin/python3
"""Install the native bridge for the default browser (Chromium or Brave families). Does not edit browser preferences."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

# Config-dir locations (under $XDG_CONFIG_HOME) that accept Chromium-style
# native-messaging manifests. Existing ones are always (re)written.
KNOWN_DIRS = [
    'chromium',
    'chromium-browser',
    'google-chrome',
    'google-chrome-beta',
    'google-chrome-unstable',
    'BraveSoftware/Brave-Origin',
    'BraveSoftware/Brave-Browser-Beta',
    'BraveSoftware/Brave-Browser',
]

# xdg default-browser .desktop names that map somewhere outside KNOWN_DIRS.
DESKTOP_ALIASES = {
    'brave-browser-nightly.desktop': 'BraveSoftware/Brave-Browser-Nightly',
}


def default_browser_dir():
    """Config subdir for the xdg default browser, or None if unknown."""
    try:
        result = subprocess.run(['xdg-settings', 'get', 'default-web-browser'],
                                capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return None
    desktop = result.stdout.strip().lower()
    if not desktop:
        return None
    if desktop in DESKTOP_ALIASES:
        return DESKTOP_ALIASES[desktop]
    stem = desktop[:-len('.desktop')] if desktop.endswith('.desktop') else desktop
    if stem in ('chromium', 'chromium-browser', 'google-chrome',
                'google-chrome-beta', 'google-chrome-unstable'):
        return stem
    if stem in ('brave-browser', 'brave'):
        return 'BraveSoftware/Brave-Browser'
    if stem in ('brave-browser-beta',):
        return 'BraveSoftware/Brave-Browser-Beta'
    if stem in ('brave-browser-nightly',):
        return 'BraveSoftware/Brave-Browser-Nightly'
    if 'brave' in stem and 'origin' in stem:
        return 'BraveSoftware/Brave-Origin'
    return None


def main():
    manifest_path = ROOT / 'extension/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    if 'key' not in manifest:
        # Only the PUBLIC key is retained, for a stable unpacked extension ID.
        preferred_temp = Path('/tmp/opencode')
        with tempfile.TemporaryDirectory(prefix='canvas-key-', dir=preferred_temp if preferred_temp.is_dir() else None) as temp:
            key = Path(temp) / 'key.pem'
            subprocess.run(['openssl', 'genrsa', '-out', str(key), '2048'], check=True, capture_output=True)
            public = subprocess.check_output(['openssl', 'rsa', '-in', str(key), '-pubout', '-outform', 'DER'], stderr=subprocess.DEVNULL)
        import base64
        manifest['key'] = base64.b64encode(public).decode()
        manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    import base64
    digest = hashlib.sha256(base64.b64decode(manifest['key'])).hexdigest()[:32]
    extension_id = ''.join(chr(ord('a') + int(c, 16)) for c in digest)
    host = ROOT / 'native/canvas_feed.py'
    host.chmod(0o755)
    definition = dict(name='com.canvas_local.feed', description='Private Canvas assignment feed',
                      path=str(host), type='stdio', allowed_origins=['chrome-extension://' + extension_id + '/'])
    config = Path(os.environ.get('XDG_CONFIG_HOME', Path.home() / '.config'))
    default_dir = default_browser_dir()
    targets = list(dict.fromkeys(KNOWN_DIRS + ([default_dir] if default_dir else [])))
    installed = []
    for name in targets:
        directory = config / name
        if not directory.exists() and name != default_dir:
            continue
        target = directory / 'NativeMessagingHosts/com.canvas_local.feed.json'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(definition, indent=2) + '\n')
        installed.append(str(target))
    print('Extension ID:', extension_id)
    print('Load unpacked:', ROOT / 'extension')
    if installed:
        print('Native manifests:', *installed, sep='\n  ')
    else:
        print('No Chromium-family browser config found. Install Chromium or Brave, run it once, then rerun.')


if __name__ == '__main__':
    main()
