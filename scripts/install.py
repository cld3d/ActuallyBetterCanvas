#!/usr/bin/python3
"""Install the native bridge for Brave. Does not edit browser preferences."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    manifest_path = ROOT / 'extension/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    if 'key' not in manifest:
        # Only the PUBLIC key is retained, for a stable unpacked extension ID.
        with tempfile.TemporaryDirectory(prefix='canvas-key-', dir='/tmp/opencode') as temp:
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
    installed = []
    for name in ['Brave-Origin', 'Brave-Origin-Beta', 'Brave-Browser']:
        directory = config / 'BraveSoftware' / name
        if not directory.exists():
            continue
        target = directory / 'NativeMessagingHosts/com.canvas_local.feed.json'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(definition, indent=2) + '\n')
        installed.append(str(target))
    print('Extension ID:', extension_id)
    print('Load unpacked:', ROOT / 'extension')
    print('Native manifests:', *installed, sep='\n  ')


if __name__ == '__main__':
    main()
