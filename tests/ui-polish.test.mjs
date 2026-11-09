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

test('tasks page shows per-class progress rings that fill with completion', {skip: !executablePath && 'Chromium unavailable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage({viewport: {width: 1366, height: 900}, reducedMotion: 'reduce'});
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html; charset=utf-8', body: '<p>Canvas</p>'}));
    await page.goto('https://canvas.test/dashboard');
    await page.evaluate(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      const due = new Date().toISOString();
      window.testState = {assignments: [
        {uid: 'a1', title: 'Essay one', course: 'English', courseId: '1', effectiveDue: due, completed: true, url: 'https://canvas.test/1'},
        {uid: 'a2', title: 'Essay two', course: 'English', courseId: '1', effectiveDue: due, completed: false, url: 'https://canvas.test/2'},
        {uid: 'b1', title: 'Lab one', course: 'Chemistry', courseId: '2', effectiveDue: due, completed: false, url: 'https://canvas.test/3'},
        {uid: 'b2', title: 'Lab two', course: 'Chemistry', courseId: '2', effectiveDue: due, completed: false, url: 'https://canvas.test/4'}
      ]};
      window.chrome = {storage: {local: {get: async () => ({origin: 'https://canvas.test'})}}, runtime: {sendMessage: async message => {
        if (message.action === 'update') {
          const item = window.testState.assignments.find(a => a.uid === message.uid);
          item.completed = message.patch.completion; item.completionOverride = message.patch.completion;
        }
        return {ok: true, state: structuredClone(window.testState)};
      }}};
    });
    await page.addScriptTag({content});
    await page.locator('.rings-wrap').waitFor();
    assert.equal(await page.locator('#canvas-local-root h1').count(), 0, 'tasks page shows no title');
    assert.equal(await page.locator('.rings-wrap svg circle').count(), 4, 'one track and one arc per class');
    assert.equal(await page.locator('.rings-center strong').innerText(), '25%');
    assert.equal(await page.locator('.rings-center span').innerText(), '1/4');
    assert.equal(await page.locator('.rings-legend,.rings-title,.rings-count').count(), 0, 'only the ring is shown, without a class breakdown');
    const firstTask = await page.locator('.row').first().boundingBox();
    const ring = await page.locator('.rings-wrap').boundingBox();
    const tabs = await page.getByRole('tablist').boundingBox();
    const filters = await page.locator('.toolbar').boundingBox();
    assert.ok(ring.x >= filters.x + filters.width, 'ring occupies a compact inset beside the controls');
    assert.ok(ring.y + ring.height <= firstTask.y, 'the inset leaves the full task row unobstructed');
    assert.ok(firstTask.width > filters.width, 'tasks reclaim the full width below the header instead of retaining an empty side rail');
    assert.ok(ring.y < tabs.y, 'progress is integrated with the upper controls, not a separate rail below them');
    assert.ok(firstTask.y - (tabs.y + tabs.height) < 100, 'tasks begin directly below the controls');
    await page.getByRole('checkbox', {name: 'Complete Essay two', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('#canvas-local-root').shadowRoot.querySelector('.rings-center strong').textContent === '50%');
    await page.getByRole('button', {name: 'Filter by course', exact: true}).click();
    await page.getByRole('option', {name: 'Chemistry', exact: true}).click();
    assert.equal(await page.locator('.rings-center strong').innerText(), '0%');
    assert.equal(await page.locator('.row').count(), 2, 'existing course filter still scopes the ring');
    await page.setViewportSize({width: 390, height: 844});
    assert.equal(await page.locator('.workspace').evaluate(node => node.scrollWidth > node.clientWidth), false, 'rings fit mobile widths');
    const lastTask = await page.locator('.row').last().boundingBox();
    const mobileRing = await page.locator('.rings-wrap').boundingBox();
    assert.ok(mobileRing.y >= lastTask.y + lastTask.height, 'mobile ring follows the list rather than pushing tasks down');
    await page.getByRole('button', {name: 'Calendar', exact: true}).click();
    assert.equal(await page.locator('.task-progress').isVisible(), false, 'progress does not leak onto other pages');
  } finally {await browser.close();}
});

test('dense progress rings leave a clear center and follow the selected theme', {skip: !executablePath && 'Chromium unavailable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage({viewport: {width: 1366, height: 900}, reducedMotion: 'reduce'});
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html; charset=utf-8', body: '<p>Canvas</p>'}));
    await page.goto('https://canvas.test/dashboard');
    await page.evaluate(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.testState = {assignments: Array.from({length: 353}, (_, i) => ({uid: String(i), title: 'Assignment ' + i, course: 'Class ' + i % 8, courseId: String(i % 8), effectiveDue: new Date().toISOString(), completed: i < 249, url: 'https://canvas.test/assignments/' + i}))};
      window.chrome = {runtime: {sendMessage: async () => ({ok: true, state: structuredClone(window.testState)})}};
    });
    await page.addScriptTag({content});
    await page.locator('.rings-wrap').waitFor();
    assert.equal(await page.locator('.rings-center strong').innerText(), '71%');
    assert.equal(await page.locator('.rings-center span').innerText(), '249/353');
    assert.equal(await page.locator('.rings-wrap circle').count(), 16);
    const centerIsClear = () => page.locator('.rings-wrap').evaluate(wrap => {
      const box = wrap.getBoundingClientRect();
      const radius = Math.min(...[...wrap.querySelectorAll('circle')].map(node => Number(node.getAttribute('r')) - Number(node.getAttribute('stroke-width')) / 2)) * box.width / 240;
      return [...wrap.querySelectorAll('.rings-center strong,.rings-center span')].every(node => {
        const text = node.getBoundingClientRect();
        return [text.left, text.right].every(x => [text.top, text.bottom].every(y => Math.hypot(x - box.x - box.width / 2, y - box.y - box.height / 2) < radius - 3));
      });
    });
    let previousShade = '';
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({colorScheme: scheme});
      for (const theme of ['Graphite', 'Lagoon', 'Crimson']) {
        await page.getByRole('button', {name: /Color theme:/}).click();
        await page.getByRole('option', {name: 'Theme: ' + theme, exact: true}).click();
        const shades = await page.locator('.rings-wrap circle:nth-of-type(even)').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).stroke));
        assert.equal(new Set(shades).size, 8, 'each class uses a distinct shade from the theme');
        const weights = await page.locator('.rings-wrap circle:nth-of-type(even)').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('stroke').match(/--accent\) ([\d.]+)%/)[1])));
        assert.ok(Math.max(...weights) - Math.min(...weights) >= 55, 'theme shades span a visibly wider range');
        assert.ok(weights.slice(1).every((weight, index) => Math.abs(weight - weights[index]) >= 25), 'neighboring rings use separated shades, not a near-identical gradient');
        assert.notEqual(shades[0], previousShade, 'changing the theme updates the ring without reloading');
        previousShade = shades[0];
        assert.match(await page.locator('.rings-wrap circle').first().getAttribute('stroke'), /var\(--accent\) 100%/);
        for (const width of [1366, 1100, 850, 390, 320]) {
          await page.setViewportSize({width, height: 900});
          assert.equal(await centerIsClear(), true, `${theme} ${scheme} at ${width}px: both labels fit inside the inner ring`);
          assert.equal(await page.locator('.workspace').evaluate(node => node.scrollWidth > node.clientWidth), false);
        }
      }
    }
    await page.evaluate(() => {for (const item of window.testState.assignments) item.completed = true;});
    await page.getByRole('button', {name: 'Sync now', exact: true}).click();
    await page.getByRole('tab', {name: 'Completed', exact: true}).click();
    assert.equal(await page.locator('.rings-center strong').innerText(), '100%');
    assert.equal(await page.locator('.rings-center span').innerText(), '353/353');
    assert.equal(await page.locator('.rings-wrap circle[stroke-dashoffset="0"]').count(), 8, 'every class completes its ring');
    assert.equal(await centerIsClear(), true, '100% and the three-digit totals retain center clearance');
    await page.evaluate(() => {for (const item of window.testState.assignments) item.completed = false;});
    await page.getByRole('button', {name: 'Sync now', exact: true}).click();
    await page.getByRole('tab', {name: 'To do', exact: true}).click();
    assert.equal(await page.locator('.rings-wrap circle[stroke-dashoffset][visibility="hidden"]').count(), 8, 'zero-progress arcs leave no rounded-cap dots');
  } finally {await browser.close();}
});
