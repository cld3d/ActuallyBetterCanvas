"""Native bridge installer: manifest targets follow installed browsers."""
import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('canvas_install', ROOT / 'scripts/install.py')
install = importlib.util.module_from_spec(spec)
spec.loader.exec_module(install)


class InstallTests(unittest.TestCase):
    def run_main(self, config, xdg_browser=None):
        env = dict(os.environ, XDG_CONFIG_HOME=str(config))
        real_run = subprocess.run

        def fake_run(cmd, **kwargs):
            if cmd[:2] == ['xdg-settings', 'get']:
                return subprocess.CompletedProcess(cmd, 0, (xdg_browser or '') + '\n', '')
            return real_run(cmd, **kwargs)

        with patch.object(os, 'environ', env), patch.object(subprocess, 'run', fake_run):
            install.main()
        return config

    def manifest_for(self, config, *parts):
        target = config.joinpath(*parts, 'NativeMessagingHosts/com.canvas_local.feed.json')
        if not target.is_file():
            return None
        return json.loads(target.read_text())

    def test_existing_browsers_get_manifests_without_default(self):
        with tempfile.TemporaryDirectory(prefix='canvas-install-xdg-') as fake_home:
            config = Path(fake_home) / 'config'
            (config / 'chromium').mkdir(parents=True)
            env = dict(os.environ, XDG_CONFIG_HOME=str(config))
            with patch.object(os, 'environ', env), patch.object(
                    subprocess, 'run', side_effect=OSError('no xdg-settings')):
                install.main()
            manifest = self.manifest_for(config, 'chromium')
            self.assertIsNotNone(manifest)
            self.assertEqual(manifest['name'], 'com.canvas_local.feed')
            self.assertTrue(manifest['allowed_origins'][0].startswith('chrome-extension://'))
            self.assertIsNone(self.manifest_for(config, 'google-chrome'))

    def test_default_browser_dir_is_created_when_missing(self):
        with tempfile.TemporaryDirectory(prefix='canvas-install-xdg-') as fake_home:
            config = self.run_main(Path(fake_home) / 'config', xdg_browser='chromium.desktop')
            manifest = self.manifest_for(config, 'chromium')
            self.assertIsNotNone(manifest)
            self.assertTrue(manifest['path'].endswith('native/canvas_feed.py'))

    def test_no_browser_no_manifest_no_crash(self):
        with tempfile.TemporaryDirectory(prefix='canvas-install-xdg-') as fake_home:
            config = self.run_main(Path(fake_home) / 'config', xdg_browser='')
            self.assertFalse(any(config.rglob('com.canvas_local.feed.json')))


if __name__ == '__main__':
    unittest.main()
