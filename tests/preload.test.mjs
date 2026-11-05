import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {browserPath} from './environment.mjs';

const preload = await readFile(new URL('../extension/preload.js', import.meta.url), 'utf8');
const content = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
const executablePath = browserPath();

test('document-start guard paints the saved theme instead of the default', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body: '<button id="original">Original Canvas content</button>'}));
    await page.addInitScript(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.chrome = {runtime: {sendMessage: async () => ({ok: true, state: {assignments: []}, courses: [], conversations: []})}};
      try {localStorage.setItem('canvas-local-boot', JSON.stringify({bg: '#0f1720', scheme: 'dark'}));} catch {}
    });
    await page.addInitScript({content: preload});
    await page.goto('https://canvas.test/dashboard');
    assert.equal(await page.locator('#canvas-local-preload-style').count(), 1);
    assert.equal(await page.locator('html').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(15, 23, 32)', 'first paint uses the saved theme, not the matcha default');
    assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).opacity), '0', 'the guard still masks Canvas until the workspace mounts');
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('document-start guard prevents Canvas flashes, respects Original mode, and fails open', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body: '<button id="original">Original Canvas content</button>'}));
    await page.addInitScript(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.chrome = {runtime: {sendMessage: async () => ({ok: true, state: {assignments: []}, courses: [], conversations: []})}};
    });
    await page.addInitScript({content: preload});
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({colorScheme});
      for (const path of ['/dashboard', '/announcements', '/courses', '/calendar/', '/conversations']) {
        await page.goto('https://canvas.test' + path);
        assert.equal(await page.locator('#canvas-local-preload-style').count(), 1);
        assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).opacity), '0', 'Original Canvas is hidden before the workspace script runs');
        assert.equal(await page.locator('html').evaluate(node => getComputedStyle(node).backgroundColor), colorScheme === 'dark' ? 'rgb(16, 16, 19)' : 'rgb(243, 243, 244)');
        await page.addScriptTag({content});
        await page.locator('.workspace').waitFor();
        assert.equal(await page.locator('#canvas-local-preload-style').count(), 0, 'guard is released only once the workspace is mounted');
        assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).opacity), '1');
      }
    }
    await page.getByRole('button', {name: 'Original Canvas', exact: true}).click();
    for (const path of ['/dashboard', '/announcements', '/courses', '/calendar', '/conversations']) {
      await page.goto('https://canvas.test' + path);
      assert.equal(await page.locator('#canvas-local-preload-style').count(), 0, 'Original Canvas mode is never hidden');
      assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).opacity), '1');
      await page.addScriptTag({content});
      assert.equal(await page.locator('.workspace').isVisible(), false);
    }
    await page.evaluate(() => sessionStorage.removeItem('actually-better-canvas-mode'));
    await page.goto('https://canvas.test/courses/34/assignments/1');
    assert.equal(await page.locator('#canvas-local-preload-style').count(), 0, 'original assignment pages are never hidden');

    // No main script: advance the browser's virtual clock to exercise the failsafe.
    await page.clock.install();
    await page.evaluate(() => history.replaceState(null, '', '/dashboard'));
    await page.addScriptTag({content: preload});
    assert.equal(await page.locator('#canvas-local-preload-style').count(), 1);
    await page.clock.fastForward(10000);
    assert.equal(await page.locator('#canvas-local-preload-style').count(), 0);
    assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).opacity), '1', 'Canvas remains usable if workspace startup fails');
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});
