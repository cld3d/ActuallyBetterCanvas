import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {browserPath} from './environment.mjs';

const content = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
const executablePath = browserPath();

test('sidebar URLs survive refresh, support history, and return to matching Original Canvas', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.chrome = {runtime: {sendMessage: async () => ({ok: true, state: {assignments: []}, courses: [], conversations: []})}};
    });
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body:
      `<button id="original">Original ${new URL(route.request().url()).pathname}</button><script>${content}</script>`}));
    await page.goto('https://canvas.test/courses/34');
    await page.getByRole('button', {name: 'Actually Better Canvas', exact: true}).click();
    for (const [name, path] of [['Tasks', '/dashboard'], ['Courses', '/courses'], ['Calendar', '/calendar'], ['Inbox', '/conversations']]) {
      await page.getByRole('button', {name, exact: true}).click();
      assert.equal(new URL(page.url()).pathname, path, name + ' updates the browser URL');
      await page.reload();
      await page.getByRole('main', {name, exact: true}).waitFor();
      assert.equal(await page.locator('nav [aria-current="page"]').textContent(), name, 'refresh restores the selected sidebar page');
    }
    await page.locator('#canvas-local-root').evaluate(node => {node.dataset.marker = 'same-document';});
    let previousIndicator = await page.locator('.sidebar-indicator').getAttribute('style');
    for (const name of ['Tasks', 'Courses', 'Calendar', 'Inbox']) {
      const button = page.getByRole('button', {name, exact: true});
      await button.click();
      const active = await button.evaluate(async node => {
        await Promise.all(node.getAnimations().map(animation => animation.finished));
        const style = getComputedStyle(node);
        return {background: style.backgroundColor, weight: style.fontWeight};
      });
      assert.equal(active.background, 'rgba(0, 0, 0, 0)', 'selected sidebar item has no background, even while hovered');
      assert.ok(Number(active.weight) >= 600, 'selected sidebar item stays bold');
      const indicator = await page.locator('.sidebar-indicator').getAttribute('style');
      assert.notEqual(indicator, previousIndicator, 'the shared sidebar rule moves between pages');
      previousIndicator = indicator;
    }
    assert.equal(await page.locator('.sidebar-indicator').count(), 1);
    assert.equal(await page.locator('.sidebar-indicator').evaluate(node => getComputedStyle(node).transitionProperty), 'transform');
    const historyLength = await page.evaluate(() => history.length);
    await page.getByRole('button', {name: 'Inbox', exact: true}).click();
    assert.equal(await page.evaluate(() => history.length), historyLength, 'reselecting the active page does not add duplicate history');
    await page.goBack();
    await page.getByRole('main', {name: 'Calendar', exact: true}).waitFor();
    assert.equal(new URL(page.url()).pathname, '/calendar');
    await page.goBack();
    await page.getByRole('main', {name: 'Courses', exact: true}).waitFor();
    await page.goForward();
    await page.getByRole('main', {name: 'Calendar', exact: true}).waitFor();
    assert.equal(await page.locator('#canvas-local-root').getAttribute('data-marker'), 'same-document', 'sidebar and history navigation retain the workspace document');
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', {name: 'Original Canvas', exact: true}).click()
    ]);
    assert.equal(new URL(page.url()).pathname, '/calendar');
    assert.equal(await page.locator('#original').textContent(), 'Original /calendar', 'Original Canvas loads the matching document, not the old inbox');
    assert.equal(await page.locator('.workspace').isVisible(), false, 'reloading the matching document preserves Original Canvas mode');
    await page.goto('https://canvas.test/conversations');
    assert.equal(await page.locator('.workspace').isVisible(), false, 'Original Canvas mode also survives subsequent navigation');
    await page.getByRole('button', {name: 'Actually Better Canvas', exact: true}).click();
    await page.getByRole('main', {name: 'Inbox', exact: true}).waitFor();
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});
