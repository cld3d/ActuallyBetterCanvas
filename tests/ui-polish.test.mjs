import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {browserPath} from './environment.mjs';

const content = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
const executablePath = browserPath();
test('council regressions: dense calendar, keyboard continuity, mobile reader and truthful sync errors', {skip: !executablePath && 'Chromium unavailable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html; charset=utf-8', body: '<p>Canvas</p>'}));
    await page.goto('https://canvas.test/dashboard');
    await page.evaluate(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      const due = new Date(); due.setHours(23, 59, 0, 0);
      const state = {lastSync: '2026-11-09T12:00:00Z', assignments: Array.from({length: 20}, (_, i) => ({uid: String(i), title: 'Reading response ' + i, course: 'Literature', courseId: '34', effectiveDue: due.toISOString(), completed: false, url: 'https://canvas.test/courses/34/assignments/' + i}))};
      window.chrome = {storage: {local: {get: async () => ({origin: 'https://canvas.test'})}}, runtime: {sendMessage: async message => {
        if (message.action === 'sync') return {ok: false, error: 'Failed to fetch'};
        if (message.action === 'courses') return {ok: true, courses: [{id: 34, name: 'Literature'}]};
        if (message.action === 'announcements') return {ok: true, announcements: Array.from({length: 101}, (_, i) => ({id: i + 1, title: i ? 'Announcement ' + i : 'Seminar preparation', message: 'Bring notes.', read_state: 'unread'}))};
        if (message.action === 'inbox') return {ok: true, conversations: [{id: 9, subject: 'Essay feedback'}]};
        if (message.action === 'conversation') {await new Promise(resolve => {window.releaseConversation = resolve;}); return {ok: true, conversation: {id: 9, subject: 'Essay feedback', messages: []}};}
        return {ok: true, state};
      }}};
    });
    await page.addScriptTag({content});
    await page.locator('.row').first().waitFor();
    assert.ok((await page.locator('aside').boundingBox()).height < 140, 'mobile shell is compact');
    await page.getByRole('button', {name: 'Calendar', exact: true}).click();
    assert.ok((await page.locator('.calendar-grid').boundingBox()).y < (await page.locator('.agenda').boundingBox()).y, 'dense agenda cannot bury month navigation');
    assert.equal(await page.locator('.calendar-day[tabindex="0"]').count(), 1);
    await page.locator('.calendar-day[tabindex="0"]').focus();
    const before = await page.locator('.calendar-day[tabindex="0"]').getAttribute('data-date');
    await page.keyboard.press('ArrowRight');
    assert.notEqual(await page.locator('.calendar-day[tabindex="0"]').getAttribute('data-date'), before);
    assert.equal(await page.locator('.calendar-day[tabindex="0"]').evaluate(node => node.getRootNode().activeElement === node), true);
    await page.locator('.calendar-day').nth(29).click();
    await page.getByRole('button', {name: 'Next month', exact: true}).click();
    assert.equal(await page.locator('.calendar-day[tabindex="0"]').count(), 1, 'adjacent-month selection never duplicates tab stops');
    await page.getByRole('button', {name: 'Announcements', exact: true}).click();
    const announcement = page.getByRole('button', {name: 'Seminar preparation', exact: true});
    await announcement.focus(); await page.keyboard.press('Enter');
    assert.equal(await announcement.evaluate(node => node.getRootNode().activeElement === node), true);
    await page.getByRole('button', {name: 'Inbox', exact: true}).click();
    await page.locator('.thread').click();
    await page.getByRole('status', {name: 'Loading conversation', exact: true}).waitFor();
    assert.equal(await page.getByText('Loading conversation…', {exact: true}).isVisible(), true, 'mobile request provides visible loading feedback');
    await page.evaluate(() => window.releaseConversation());
    await page.getByRole('heading', {name: 'Essay feedback', exact: true}).waitFor();
    assert.equal(await page.locator('.threads').isVisible(), false);
    assert.equal(await page.locator('.reader h2').evaluate(node => node.getRootNode().activeElement === node), true);
    await page.getByRole('button', {name: 'Back to conversations'}).click();
    assert.equal(await page.locator('.thread').evaluate(node => node.getRootNode().activeElement === node), true);
    await page.getByRole('button', {name: 'Extension settings', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Connection', exact: true});
    await dialog.getByRole('button', {name: 'Sync now', exact: true}).click();
    assert.match(await dialog.locator('[role=status]').innerText(), /Sync failed:.*20 assignments cached.*Last successful sync/s);
    assert.equal(await page.locator('.workspace').evaluate(node => node.scrollWidth > node.clientWidth), false);
    await dialog.getByRole('button', {name: 'Close', exact: true}).click();
    await page.setViewportSize({width: 320, height: 844});
    for (const button of await page.locator('nav [data-page]').all()) {
      const bounds = await button.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 320, 'all narrow-screen destinations remain visible');
    }
    const badge = await page.locator('.nav-badge').boundingBox();
    const announcementButton = await page.getByRole('button', {name: /Announcements/}).boundingBox();
    assert.ok(badge.x >= announcementButton.x && badge.x + badge.width <= announcementButton.x + announcementButton.width, '99+ unread badge stays inside its navigation track');
  } finally {await browser.close();}
});

test('secondary text clears WCAG normal-text contrast on every theme surface', {skip: !executablePath && 'Chromium unavailable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({reducedMotion: 'reduce'});
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html; charset=utf-8', body: '<p>Canvas</p>'}));
    await page.goto('https://canvas.test/dashboard');
    await page.evaluate(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.chrome = {runtime: {sendMessage: async () => ({ok: true, state: {assignments: []}})}};
    });
    await page.addScriptTag({content});
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({colorScheme: scheme});
      for (const theme of ['Graphite', 'Crimson', 'Ember', 'Amber', 'Matcha', 'Lagoon', 'Ocean', 'Iris', 'Rose']) {
        await page.getByRole('button', {name: /Color theme:/}).click();
        await page.getByRole('option', {name: 'Theme: ' + theme, exact: true}).click();
        const ratios = await page.locator('#canvas-local-root').evaluate(host => {
          const sample = document.createElement('input'); sample.placeholder = 'Find an assignment';
          sample.style.color = 'var(--muted)'; host.shadowRoot.append(sample);
          const context = document.createElement('canvas').getContext('2d');
          const luminance = color => {
            context.fillStyle = color; context.fillRect(0, 0, 1, 1);
            const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => {v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;});
            return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
          };
          const foregrounds = [getComputedStyle(sample).color, getComputedStyle(sample, '::placeholder').color].map(luminance);
          const results = ['--bg', '--surface', '--tint'].flatMap(token => {
            sample.style.backgroundColor = `var(${token})`;
            const background = luminance(getComputedStyle(sample).backgroundColor);
            return foregrounds.map(foreground => (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05));
          });
          sample.remove(); return results;
        });
        assert.ok(Math.min(...ratios) >= 4.5, `${theme} ${scheme}: ${ratios.join(', ')}`);
      }
    }
  } finally {await browser.close();}
});
