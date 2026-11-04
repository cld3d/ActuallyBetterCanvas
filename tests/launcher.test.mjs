import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {browserPath} from './environment.mjs';

const content = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
const executablePath = browserPath();

test('Original Canvas launcher stays in the bottom right on desktop and mobile', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    await page.setContent('<p>Original Canvas</p>');
    await page.evaluate(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.chrome = {runtime: {sendMessage: async () => ({ok: true, state: {assignments: []}})}};
    });
    await page.addScriptTag({content});
    const launcher = page.getByRole('button', {name: 'Actually Better Canvas', exact: true});
    for (const width of [1366, 390]) {
      await page.setViewportSize({width, height: 844});
      const box = await launcher.boundingBox();
      assert.ok(box, 'launcher is visible on Original Canvas');
      assert.equal(width - box.x - box.width, 18);
      assert.equal(844 - box.y - box.height, 24);
    }
    await launcher.click();
    await page.getByRole('button', {name: 'Original Canvas', exact: true}).click();
    assert.equal(await launcher.isVisible(), true, 'launcher returns after closing the workspace');
  } finally {await browser.close();}
});
