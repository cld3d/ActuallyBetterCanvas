import {existsSync, accessSync, constants} from 'node:fs';
import {homedir} from 'node:os';
import {delimiter, join} from 'node:path';

export const skipDesktop = process.env.CANVAS_SKIP_DESKTOP_TESTS === '1';
export const pluginDir = process.env.CANVAS_DESKTOP_PLUGIN_DIR || join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'omarchy/plugins');
if (!skipDesktop && process.env.CANVAS_DESKTOP_PLUGIN_DIR && !existsSync(pluginDir)) {
  throw new Error('CANVAS_DESKTOP_PLUGIN_DIR does not exist: ' + pluginDir);
}

export function browserPath() {
  if (process.env.CANVAS_SKIP_BROWSER_TESTS === '1') return undefined;
  if (process.env.CANVAS_BROWSER_PATH) {
    accessSync(process.env.CANVAS_BROWSER_PATH, constants.X_OK);
    return process.env.CANVAS_BROWSER_PATH;
  }
  for (const name of ['chromium', 'chromium-browser', 'google-chrome', 'brave-browser', 'brave', 'brave-origin']) {
    for (const directory of (process.env.PATH || '').split(delimiter)) {
      const candidate = join(directory, name);
      try {accessSync(candidate, constants.X_OK); return candidate;} catch {}
    }
  }
  return undefined;
}
