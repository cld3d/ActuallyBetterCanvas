import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {browserPath} from './environment.mjs';

const content = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
const executablePath = browserPath();

test('inbox waits for data before showing an empty state or conversation layout', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    for (const result of ['empty', 'populated', 'error']) {
      const page = await browser.newPage();
      await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body: '<p>Canvas</p>'}));
      await page.goto('https://canvas.test/conversations');
      await page.evaluate(() => {
        const attach = Element.prototype.attachShadow;
        Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
        window.chrome = {runtime: {sendMessage: async message => {
          if (message.action === 'inbox') return new Promise(resolve => {window.finishInbox = resolve;});
          return {ok: true, state: {assignments: []}};
        }}};
      });
      await page.addScriptTag({content});
      await page.waitForFunction(() => typeof window.finishInbox === 'function');
      assert.equal(await page.locator('.page-content').getAttribute('aria-busy'), 'true');
      assert.equal(await page.locator('.inbox-layout').count(), 0);
      assert.equal(await page.getByText('Choose a conversation to read.', {exact: true}).count(), 0);
      assert.equal(await page.getByText('Your inbox is empty.', {exact: true}).count(), 0);
      await page.evaluate(result => window.finishInbox(result === 'error' ? {ok: false, error: 'Inbox unavailable'} : {
        ok: true, conversations: result === 'empty' ? [] : [{id: 1, subject: 'Course update', participants: []}]
      }), result);
      await page.waitForFunction(() => document.querySelector('#canvas-local-root').shadowRoot.querySelector('.page-content').getAttribute('aria-busy') === 'false');
      assert.equal(await page.locator('.inbox-layout').count(), result === 'populated' ? 1 : 0);
      if (result === 'empty') {
        assert.equal(await page.getByText('Your inbox is empty.', {exact: true}).isVisible(), true);
        await page.getByRole('button', {name: 'Sync now', exact: true}).click();
        assert.equal(await page.getByText('Your inbox is empty.', {exact: true}).isVisible(), true, 'cached empty state stays visible during refresh');
        assert.equal(await page.locator('.inbox-layout').count(), 0);
      } else if (result === 'populated') {
        assert.equal(await page.getByText('Course update', {exact: true}).isVisible(), true);
      } else {
        assert.equal(await page.getByText('Inbox unavailable', {exact: false}).isVisible(), true);
      }
      await page.close();
    }
  } finally {await browser.close();}
});
