import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {browserPath} from './environment.mjs';

const content = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');

const executablePath = browserPath();
test('task and calendar completion tabs sit below filters without a divider', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body: '<p>Canvas</p>'}));
    await page.goto('https://canvas.test/dashboard');
    await page.evaluate(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.chrome = {runtime: {sendMessage: async () => ({ok: true, state: {assignments: []}})}};
    });
    await page.addScriptTag({content});
    for (const width of [1366, 390]) {
      await page.setViewportSize({width, height: 844});
      for (const name of ['Tasks', 'Calendar']) {
        await page.getByRole('button', {name, exact: true}).click();
        const filters = await page.locator('.toolbar').boundingBox();
        const tabs = await page.getByRole('tablist').boundingBox();
        assert.ok(tabs.y >= filters.y + filters.height, `${name} tabs follow the filters at ${width}px`);
        assert.equal(await page.getByRole('tablist').evaluate(node => getComputedStyle(node).borderBottomWidth), '0px');
        assert.equal(await page.locator('.tab-indicator').isVisible(), true, 'selection underline remains visible');
      }
    }
  } finally {await browser.close();}
});

test('sidebar theme picker recolors the workspace and persists across reloads', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body: '<p>Canvas</p>'}));
    await page.addInitScript(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.chrome = {runtime: {sendMessage: async () => ({ok: true, state: {assignments: []}})}};
    });
    await page.goto('https://canvas.test/dashboard');
    await page.addScriptTag({content});
    await page.getByRole('main', {name: 'Tasks', exact: true}).waitFor();
    const themeButton = page.getByRole('button', {name: 'Color theme: Graphite · System', exact: true});
    assert.equal(await themeButton.count(), 1, 'Graphite + System is the default theme');
    const inlineVar = () => page.locator('#canvas-local-root').evaluate(node => node.style.getPropertyValue('--bg'));
    assert.equal(await inlineVar(), '#f3f3f4', 'System resolves the Graphite light pair in a light OS scheme');
    await themeButton.click();
    assert.equal(await page.locator('.theme-grid .theme-card').first().getAttribute('aria-label'), 'Theme: Graphite', 'Graphite lists first');
    assert.equal(await page.locator('.theme-card').first().evaluate(node => getComputedStyle(node).minWidth), '88px', 'cards reserve room for bold labels');
    const beforeWidth = await page.locator('.theme-options').boundingBox().then(box => Math.round(box.width));
    await page.getByRole('option', {name: 'Theme: Crimson', exact: true}).click();
    await page.getByRole('button', {name: 'Color theme: Crimson · System', exact: true}).click();
    assert.equal(await page.locator('.theme-options').boundingBox().then(box => Math.round(box.width)), beforeWidth, 'selecting a long bold name does not widen the picker');
    assert.equal(await page.getByRole('option').count(), 12);
    assert.equal(await page.locator('.theme-options').isVisible(), true);
    await page.getByRole('option', {name: 'Theme: Ocean', exact: true}).click();
    assert.equal(await page.getByRole('button', {name: 'Color theme: Ocean · System', exact: true}).count(), 1);
    assert.equal(await inlineVar(), '#edf3f5');
    await page.getByRole('button', {name: 'Color theme: Ocean · System', exact: true}).click();
    await page.getByRole('option', {name: 'Appearance: Dark', exact: true}).click();
    assert.equal(await page.getByRole('button', {name: 'Color theme: Ocean · Dark', exact: true}).count(), 1);
    assert.equal(await inlineVar(), '#0f1720');
    assert.equal(await page.locator('#canvas-local-root').evaluate(node => getComputedStyle(node).getPropertyValue('--bg').trim()), '#0f1720');
    await page.reload();
    await page.addScriptTag({content});
    await page.getByRole('main', {name: 'Tasks', exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Color theme: Ocean · Dark', exact: true}).count(), 1, 'theme survives reload');
    assert.equal(await inlineVar(), '#0f1720');
    await page.getByRole('button', {name: 'Color theme: Ocean · Dark', exact: true}).click();
    await page.getByRole('option', {name: 'Theme: Matcha', exact: true}).click();
    await page.getByRole('button', {name: 'Color theme: Matcha · Dark', exact: true}).click();
    await page.getByRole('option', {name: 'Appearance: System', exact: true}).click();
    assert.equal(await inlineVar(), '#f3f5f3', 'System reapplies the resolved Matcha pair');
    await page.getByRole('button', {name: 'Color theme: Matcha · System', exact: true}).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.theme-options').isHidden(), true, 'Escape closes the picker, not the workspace');
    assert.equal(await page.locator('.workspace').isVisible(), true);
    await page.setViewportSize({width: 390, height: 844});
    await page.getByRole('button', {name: 'Color theme: Matcha · System', exact: true}).click();
    assert.equal(await page.locator('.workspace').evaluate(node => node.scrollWidth > node.clientWidth), false, 'picker fits mobile widths');
    await page.getByRole('option', {name: 'Theme: Lagoon', exact: true}).click();
    assert.equal(await page.locator('#canvas-local-root').evaluate(node => node.style.getPropertyValue('--accent').trim()), '#0e7a90', 'lagoon light leans blue while staying teal');
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('sidebar settings icon opens the extension options page', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body: '<p>Canvas</p>'}));
    await page.addInitScript(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.openedOptions = false;
      window.chrome = {runtime: {
        sendMessage: async () => ({ok: true, state: {assignments: []}}),
        openOptionsPage: async () => {window.openedOptions = true;}
      }};
    });
    await page.goto('https://canvas.test/dashboard');
    await page.addScriptTag({content});
    await page.getByRole('main', {name: 'Tasks', exact: true}).waitFor();
    await page.getByRole('button', {name: 'Extension settings', exact: true}).click();
    assert.equal(await page.evaluate(() => window.openedOptions), true, 'settings opens the extension options');
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('icon tooltips stay inside the viewport', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage({viewport: {width: 1366, height: 900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body: '<p>Canvas</p>'}));
    await page.addInitScript(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.chrome = {runtime: {sendMessage: async () => ({ok: true, state: {assignments: []}})}};
    });
    await page.goto('https://canvas.test/dashboard');
    await page.addScriptTag({content});
    await page.getByRole('main', {name: 'Tasks', exact: true}).waitFor();
    const bubble = page.locator('.tooltip-bubble:not([hidden])');
    for (const [name, text] of [['Sync now', null], ['Original Canvas', 'Original Canvas'], ['Extension settings', 'Extension settings']]) {
      await page.getByRole('button', {name, exact: true}).hover();
      await bubble.waitFor({timeout: 5000});
      if (text) assert.equal(await bubble.textContent(), text);
      else assert.match(await bubble.textContent(), /.+/, 'sync tip shows live status text');
      const box = await bubble.boundingBox();
      const viewport = page.viewportSize();
      assert.ok(box.x >= 0, `${name} tooltip stays on screen`);
      assert.ok(box.x + box.width <= viewport.width, `${name} tooltip never bleeds off the edge`);
      await page.mouse.move(viewport.width - 5, 5);
      await page.locator('.tooltip-bubble').waitFor({state: 'hidden', timeout: 5000});
    }
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('task sections render tomorrow and this week in chronological group order', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage({timezoneId: 'America/New_York'});
    await page.clock.setFixedTime(new Date('2026-11-04T12:00:00-05:00'));
    await page.setContent('<button>Original Canvas</button>');
    await page.evaluate(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      const assignments = [null, '2026-11-09T00:00:00-05:00', '2026-11-08T23:59:00-05:00', '2026-11-05T23:59:00-05:00', '2026-11-04T23:59:00-05:00', '2026-11-04T11:00:00-05:00'].map((effectiveDue, i) => ({
        uid: 'task-' + i, title: 'Task ' + i, course: 'English', effectiveDue, completed: false, completionOverride: null, dueOverride: false, url: 'https://canvas.test/courses/34/assignments/' + i
      }));
      window.chrome = {runtime: {sendMessage: async () => ({ok: true, state: {assignments}})}};
    });
    await page.addScriptTag({content});
    await page.getByRole('button', {name: 'Actually Better Canvas', exact: true}).click();
    await page.getByRole('heading', {name: 'Tomorrow · 1', exact: true}).waitFor();
    assert.deepEqual(await page.locator('.group-title').allTextContents(), ['Overdue · 1', 'Today · 1', 'Tomorrow · 1', 'This week · 1', 'Coming up · 1', 'No deadline · 1']);
    assert.deepEqual(await page.locator('.row .title').allTextContents(), ['Task 5', 'Task 4', 'Task 3', 'Task 2', 'Task 1', 'Task 0']);
  } finally {await browser.close();}
});

test('pending course loads keep cached content visible without placeholder bars', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body: '<button>Original Canvas</button>'}));
    await page.goto('https://canvas.test/courses');
    await page.evaluate(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.chrome = {runtime: {sendMessage: async message => {
        if (message.action === 'courses') return new Promise(resolve => {window.finishCourses = resolve;});
        return {ok: true, state: {assignments: [{uid: 'essay', title: 'Cached essay', course: 'English', courseId: '34', effectiveDue: null,
          completed: false, dueOverride: false, completionOverride: null, url: 'https://canvas.test/courses/34/assignments/1'}]}};
      }}};
    });
    await page.addScriptTag({content});
    await page.getByRole('heading', {name: 'English', exact: true}).waitFor();
    assert.equal(await page.locator('.page-content').getAttribute('aria-busy'), 'true');
    assert.equal(await page.locator('.skeleton').count(), 0, 'no loading bars above cached courses');
    await page.getByRole('button', {name: 'Tasks', exact: true}).click();
    await page.getByRole('link', {name: 'Cached essay', exact: true}).waitFor();
    assert.equal(await page.locator('.skeleton').count(), 0, 'switching to Tasks during a course load introduces no bars');
    await page.getByRole('button', {name: 'Courses', exact: true}).click();
    await page.getByRole('heading', {name: 'English', exact: true}).waitFor();
    await page.evaluate(() => window.finishCourses({ok: true, courses: [{id: 34, name: 'English'}, {id: 35, name: 'Math'}]}));
    await page.getByRole('heading', {name: 'Math', exact: true}).waitFor();
    assert.equal(await page.locator('.page-content').getAttribute('aria-busy'), 'false');
    assert.equal(await page.locator('.skeleton').count(), 0);
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

async function assertPlainTaskRow(page) {
  const row = page.locator('.row:visible').first();
  await page.locator('.toolbar').hover();
  const before = await row.evaluate(node => {
    const style = getComputedStyle(node);
    return {background: style.backgroundColor, radius: style.borderRadius, transition: style.transitionProperty};
  });
  assert.equal(before.radius, '0px', 'task dividers have straight ends');
  assert.equal(before.transition, 'opacity', 'task rows do not animate background colors');
  await row.hover();
  assert.equal(await row.evaluate(node => getComputedStyle(node).backgroundColor), before.background, 'hovering task content leaves the row background unchanged');
}

test('workspace edits, completion overrides, source navigation, mobile and dark theme', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage({viewport: {width: 1366, height: 768}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('about:blank');
    await page.setContent('<button id="original">Original Canvas button</button>');
    await page.evaluate(() => {
      // Open only in tests, so Playwright can inspect the production-isolated workspace.
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.edits = [];
      window.testState = {lastSync: '2026-11-04T12:00:00Z', assignments: [{
        uid: 'canvas-local/school/7/34/12', title: '<img src=x onerror=alert(1)> Essay', course: 'English',
        canvasDue: '2026-11-08T23:59:00Z', personalDue: null, effectiveDue: '2026-11-08T23:59:00Z',
        dueOverride: false, completionOverride: null, completed: false, submitted: false, graded: true,
        notes: '', url: 'https://school.instructure.com/courses/34/assignments/12'
      }]};
      window.chrome = {runtime: {sendMessage: async message => {
        if (message.action === 'update') {
          window.edits.push(message.patch);
          const item = window.testState.assignments[0];
          if (Object.hasOwn(message.patch, 'completion')) {
            item.completionOverride = message.patch.completion;
            item.completed = message.patch.completion ?? item.submitted;
          }
          if (Object.hasOwn(message.patch, 'personalDue')) {
            item.personalDue = item.effectiveDue = message.patch.personalDue;
            item.dueOverride = true;
          }
          if (message.patch.followCanvasDue) {item.personalDue = null; item.effectiveDue = item.canvasDue; item.dueOverride = false;}
          if (Object.hasOwn(message.patch, 'notes')) item.notes = message.patch.notes;
        }
        return {ok: true, state: structuredClone(window.testState)};
      }}};
    });
    await page.addScriptTag({content});
    await page.getByRole('button', {name: 'Actually Better Canvas', exact: true}).click();
    await page.getByRole('main', {name: 'Tasks', exact: true}).waitFor();
    const check = page.getByRole('checkbox');
    assert.equal(await check.isChecked(), false, 'a grade must not check the assignment');
    assert.equal(await page.locator('#canvas-local-root').locator('img').count(), 0, 'assignment titles render as text');
    assert.equal(await page.locator('#original').evaluate(node => node.inert), true, 'underlying Canvas is not focusable');
    await check.click();
    await page.getByRole('tab', {name: 'Completed', exact: true}).click();
    await page.getByRole('checkbox').waitFor();
    assert.equal(await page.getByRole('checkbox').isChecked(), true);
    await page.getByRole('checkbox').click();
    await page.getByRole('tab', {name: 'To do', exact: true}).click();
    await page.getByRole('button', {name: /^Edit /}).click();
    assert.equal(await page.getByRole('dialog', {name: /Essay/}).evaluate(node => getComputedStyle(node).scrollbarWidth), 'none', 'edit dialogs also hide scrollbars');
    const deadline = page.getByLabel('Personal deadline (this laptop’s time zone)');
    await deadline.fill('2026-11-10T16:30');
    await page.getByLabel('Personal notes', {exact: true}).fill('Finish the last paragraph');
    await page.getByRole('button', {name: 'Save changes'}).click();
    await page.getByText('Personal deadline', {exact: true}).waitFor();
    const edits = await page.evaluate(() => window.edits);
    assert.deepEqual(edits.slice(0, 2), [{completion: true}, {completion: false}]);
    assert.match(edits[2].personalDue, /^2026-11-10T/);
    assert.equal(edits[2].notes, 'Finish the last paragraph');
    assert.equal(await page.getByRole('link', {name: /Essay/}).getAttribute('href'), 'https://school.instructure.com/courses/34/assignments/12');
    await page.getByRole('button', {name: /^Edit /}).click();
    await page.getByRole('button', {name: 'Follow Canvas deadline', exact: true}).click();
    await page.getByRole('button', {name: 'Save changes'}).click();
    await page.getByRole('dialog', {name: /Essay/}).waitFor({state: 'detached'});
    assert.equal(await page.locator('.deadline small').count(), 0, 'Canvas deadlines show their date without a redundant tag');
    await page.emulateMedia({colorScheme: 'dark', reducedMotion: 'reduce'});
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#canvas-local-root')).getPropertyValue('--bg').trim() === '#101013', undefined, {timeout: 5000});
    await page.setViewportSize({width: 390, height: 844});
    const overflow = await page.locator('#canvas-local-root').evaluate(node => {
      const section = node.shadowRoot.querySelector('.workspace');
      return section.scrollWidth > section.clientWidth;
    });
    assert.equal(overflow, false, 'mobile workspace must not scroll horizontally');
    await page.getByRole('button', {name: 'Original Canvas', exact: true}).last().click();
    assert.equal(await page.locator('#original').evaluate(node => node.inert), false);
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('custom navigation, task tabs, course listbox, calendar deadlines and read-only inbox', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage({viewport: {width: 1366, height: 768}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body: '<button id="original">Canvas</button>'}));
    await page.addInitScript(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      const now = new Date(), due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59).toISOString();
      const base = {course: 'English', courseId: '34', canvasDue: '2020-01-01T00:00:00Z', effectiveDue: due, dueOverride: true, completionOverride: null, completed: false, submitted: false, graded: false, notes: '', url: 'https://canvas.test/courses/34/assignments/1'};
      window.testState = {assignments: [
        {...base, uid: 'open', title: 'Personal deadline task'},
        {...base, uid: 'other', title: 'Math task', course: 'Math', courseId: '35', effectiveDue: null},
        {...base, uid: 'old', title: 'Older completed', completed: true, effectiveDue: '2024-01-01T00:00:00Z'},
        {...base, uid: 'new', title: 'Latest completed', completed: true, effectiveDue: '2026-01-01T00:00:00Z'},
        {...base, uid: 'undated', title: 'Undated completed', completed: true, effectiveDue: null}
      ]};
      window.requests = []; window.failInbox = false; window.failUpdate = false;
      window.chrome = {runtime: {sendMessage: async message => {
        window.requests.push(message);
        if (message.action === 'courses') return {ok: true, courses: [{id: 34, name: 'English', course_code: 'ENG 101'}, {id: 35, name: 'Math'}, {id: 36, name: 'Empty course'}]};
        if (message.action === 'inbox') return window.failInbox ? {ok: false, error: 'Inbox unavailable'} : {ok: true, conversations: [{id: 9, subject: 'Course update', last_message: 'Please read', workflow_state: 'unread', participants: [{id: 7, name: 'Teacher'}]}]};
        if (message.action === 'conversation') return {ok: true, conversation: {id: 9, subject: 'Course update', participants: [{id: 7, name: 'Teacher'}], messages: [{id: 1, author_id: 7, body: '<img src=x onerror=alert(1)> Message body', created_at: '2026-11-01T12:00:00Z'}]}};
        if (message.action === 'update') {
          if (window.failUpdate) return {ok: false, error: 'Could not save completion'};
          const item = window.testState.assignments.find(a => a.uid === message.uid);
          item.completed = message.patch.completion; item.completionOverride = message.patch.completion;
        }
        return {ok: true, state: structuredClone(window.testState)};
      }}};
    });
    await page.goto('https://canvas.test/dashboard');
    await page.addScriptTag({content});
    await page.getByRole('link', {name: 'Personal deadline task', exact: true}).waitFor();
    await assertPlainTaskRow(page);
    await page.emulateMedia({colorScheme: 'dark'});
    await assertPlainTaskRow(page);
    await page.emulateMedia({colorScheme: 'light'});
    assert.equal(await page.locator('select').count(), 0, 'no OS-native dropdowns');
    assert.equal(await page.locator('aside').getByText('Original Canvas').count(), 0);
    assert.equal(await page.locator('footer,.sidebar-note').count(), 0);
    assert.equal(await page.getByRole('button', {name: 'Tasks', exact: true}).count(), 1);
    assert.equal(await page.getByRole('link', {name: 'Canvas', exact: true}).getAttribute('href'), '/dashboard', 'wordmark links to Tasks');
    assert.equal(await page.locator('.brand-prefix').count(), 0, 'wordmark must not contain the Actually Better prefix');
    assert.equal(await page.locator('.brand-name').textContent(), 'canvas');
    assert.equal(await page.locator('#canvas-local-root .stats').count(), 0, 'task summary counters are removed');
    assert.deepEqual(await page.locator('.row .meta').allTextContents(), ['English', 'Math'], 'assignments only show their course, not redundant status tags');
    assert.equal(await page.getByRole('tab').count(), 2);
    for (const tab of await page.getByRole('tab').all()) {
      await tab.hover();
      const hover = await tab.evaluate(async node => {
        await Promise.all(node.getAnimations().map(animation => animation.finished));
        const style = getComputedStyle(node);
        return {background: style.backgroundColor, opacity: style.opacity, transition: style.transitionProperty};
      });
      assert.equal(hover.background, 'rgba(0, 0, 0, 0)', 'tab hover never fills the label background');
      assert.equal(hover.opacity, '0.75', 'hover feedback fades only the tab label');
      assert.ok(hover.transition.includes('opacity'), 'tab labels fade on hover');
    }
    const initialIndicator = await page.locator('.tab-indicator').getAttribute('style');
    await page.getByRole('tab', {name: 'Completed', exact: true}).click();
    assert.notEqual(await page.locator('.tab-indicator').getAttribute('style'), initialIndicator, 'one shared selection indicator moves to the completed tab');
    assert.equal(await page.locator('.tab-indicator').evaluate(node => getComputedStyle(node).transitionProperty), 'transform');
    assert.deepEqual(await page.locator('.row .title').allTextContents(), ['Latest completed', 'Older completed', 'Undated completed']);
    await page.getByRole('tab', {name: 'Completed', exact: true}).press('ArrowLeft');
    assert.equal(await page.getByRole('tab', {name: 'To do', exact: true}).getAttribute('aria-selected'), 'true');
    await page.getByRole('button', {name: 'Filter by course'}).click();
    await page.getByRole('option', {name: 'All courses', exact: true}).press('End');
    await page.getByRole('option', {name: 'Math', exact: true}).press('Enter');
    assert.deepEqual(await page.locator('.row .title').allTextContents(), ['Math task']);
    await page.getByRole('button', {name: 'Filter by course'}).click();
    await page.getByRole('option', {name: 'Math', exact: true}).press('Escape');
    assert.equal(await page.locator('.workspace').isVisible(), true, 'escape dismisses only the listbox');
    await page.getByRole('button', {name: 'Filter by course'}).click();
    await page.getByRole('option', {name: 'All courses', exact: true}).click();
    await page.getByRole('button', {name: 'Courses', exact: true}).click();
    await page.getByRole('heading', {name: 'Empty course', exact: true}).waitFor();
    assert.equal(await page.locator('.course-card').count(), 3, 'courses without assignments remain visible');
    assert.equal(await page.getByRole('link', {name: 'Open course'}).first().getAttribute('href'), '/courses/34');
    await page.locator('.course-card').filter({has: page.getByRole('heading', {name: 'English', exact: true})}).getByRole('button', {name: 'View tasks'}).click();
    assert.deepEqual(await page.locator('.row .title').allTextContents(), ['Personal deadline task']);
    await page.getByRole('button', {name: 'Calendar', exact: true}).click();
    assert.equal(await page.locator('.calendar-day[aria-pressed=true] .day-count').textContent(), '1');
    assert.equal(await page.locator('.calendar-day[aria-pressed=true]').evaluate(node => getComputedStyle(node).boxShadow), 'none', 'selected calendar day has no border-like shadow');
    assert.deepEqual(await page.locator('.agenda .title').allTextContents(), ['Personal deadline task'], 'calendar follows personal deadline, not Canvas date');
    await assertPlainTaskRow(page);
    assert.equal(await page.getByRole('heading', {name: 'No deadline', exact: true}).count(), 0);
    assert.equal(await page.getByRole('link', {name: 'Math task', exact: true}).count(), 0, 'undated work stays out of the calendar');
    await page.getByRole('button', {name: 'Next month'}).click();
    await page.getByRole('button', {name: 'Today', exact: true}).click();
    await page.evaluate(() => {window.failUpdate = true;});
    await page.getByRole('checkbox', {name: 'Complete Personal deadline task', exact: true}).click();
    await page.getByText('Could not save completion', {exact: true}).waitFor();
    assert.equal(await page.getByRole('checkbox').isChecked(), false, 'failed completion rolls back');
    await page.evaluate(() => {window.failUpdate = false;});
    await page.getByRole('checkbox').click();
    await page.getByText('No matching tasks due this day.', {exact: true}).waitFor();
    await page.getByRole('tab', {name: 'Completed', exact: true}).click();
    assert.equal(await page.getByRole('link', {name: 'Undated completed', exact: true}).count(), 0, 'completed undated work also stays out of the calendar');
    assert.equal(await page.getByRole('checkbox', {name: 'Reopen Personal deadline task', exact: true}).isChecked(), true, 'calendar task completion shares workspace state');
    await page.evaluate(() => {window.failInbox = true;});
    await page.getByRole('button', {name: 'Inbox', exact: true}).click();
    await page.getByText('Inbox unavailable', {exact: false}).waitFor();
    await page.evaluate(() => {window.failInbox = false;});
    await page.getByRole('button', {name: 'Try again'}).click();
    await page.locator('.thread').click();
    await page.getByText('<img src=x onerror=alert(1)> Message body', {exact: true}).waitFor();
    assert.equal(await page.locator('#canvas-local-root img').count(), 0);
    assert.equal(await page.locator('.thread.unread').count(), 1, 'reading leaves unread state untouched');
    assert.deepEqual(await page.evaluate(() => window.requests.filter(r => r.action === 'conversation')), [{action: 'conversation', id: 9}]);
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({colorScheme, reducedMotion: 'reduce'});
      await page.setViewportSize({width: 390, height: 844});
      for (const name of ['Courses', 'Calendar', 'Inbox', 'Tasks', 'Announcements']) {
        await page.getByRole('button', {name, exact: true}).click();
        assert.equal(await page.locator('#canvas-local-root h1, #canvas-local-root .intro').count(), 0, `${name} has no redundant page title or subtitle`);
        assert.equal(await page.getByRole('main', {name, exact: true}).count(), 1, 'page identity remains accessible');
        assert.equal(await page.locator('.workspace').evaluate(node => node.scrollWidth > node.clientWidth), false, `${name} must fit mobile in ${colorScheme}`);
        assert.equal(await page.locator('#canvas-local-root').evaluate(node => [...node.shadowRoot.querySelectorAll('.workspace,.select-options,.threads,textarea')].every(element => getComputedStyle(element).scrollbarWidth === 'none')), true, `${name} hides workspace and nested scrollbars`);
        if (name === 'Calendar') {
          assert.equal(await page.locator('.workspace').evaluate(node => {
            node.scrollTop = 0;
            return getComputedStyle(node).overflowY === 'auto' && node.scrollHeight > node.clientHeight;
          }), true, 'calendar retains its scrollable overflow');
          await page.mouse.move(350, 500);
          await page.mouse.wheel(0, 300);
          await page.waitForFunction(() => document.querySelector('#canvas-local-root').shadowRoot.querySelector('.workspace').scrollTop > 0);
        }
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('#canvas-local-root').evaluate(node => getComputedStyle(node.shadowRoot.activeElement).outlineStyle), 'none', `${name} has no rectangular keyboard focus outline`);
      }
      assert.equal(await page.locator('.tab-indicator').evaluate(node => getComputedStyle(node).transitionDuration), '0s', 'reduced motion disables underline sliding');
      assert.equal(await page.locator('.sidebar-indicator').evaluate(node => getComputedStyle(node).transitionDuration), '0s', 'reduced motion disables sidebar sliding');
      assert.equal(await page.locator('nav').evaluate(node => {
        const selected = node.querySelector('[aria-current="page"]');
        const line = new DOMMatrix(getComputedStyle(node.querySelector('.sidebar-indicator')).transform);
        return line.m41 === selected.offsetLeft && line.m42 === selected.offsetTop + 12;
      }), true, 'the sidebar rule follows the selected item after mobile resizing');
    }
    for (const [path, title] of [['courses', 'Courses'], ['calendar', 'Calendar'], ['conversations', 'Inbox']]) {
      await page.goto('https://canvas.test/' + path);
      await page.addScriptTag({content});
      await page.getByRole('main', {name: title, exact: true}).waitFor();
      assert.equal(await page.locator('#original').evaluate(node => node.inert), true, path + ' opens the custom view automatically');
    }
    await page.getByRole('button', {name: 'Original Canvas', exact: true}).click();
    for (const [path, title] of [['calendar', 'Calendar'], ['conversations', 'Inbox'], ['courses', 'Courses'], ['dashboard', 'Tasks']]) {
      await page.goto('https://canvas.test/' + path);
      await page.addScriptTag({content});
      assert.equal(await page.locator('.workspace').isVisible(), false, 'Original Canvas mode survives navigation to ' + path);
      assert.equal(await page.locator('#original').evaluate(node => node.inert), false);
      await page.reload();
      await page.addScriptTag({content});
      assert.equal(await page.locator('.workspace').isVisible(), false, 'Original Canvas mode survives reload');
      await page.getByRole('button', {name: 'Actually Better Canvas', exact: true}).click();
      await page.getByRole('main', {name: title, exact: true}).waitFor();
      await page.getByRole('button', {name: 'Original Canvas', exact: true}).click();
    }
    // Some Canvas navigation updates the URL without a new document.
    await page.evaluate(() => history.pushState({}, '', '/calendar'));
    await page.getByRole('button', {name: 'Actually Better Canvas', exact: true}).click();
    await page.getByRole('main', {name: 'Calendar', exact: true}).waitFor();
    await page.goto('https://canvas.test/conversations');
    await page.addScriptTag({content});
    await page.getByRole('main', {name: 'Inbox', exact: true}).waitFor();
    assert.equal(await page.locator('.workspace').isVisible(), true, 'returning to custom mode restores automatic opening');
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('announcements page lists course announcements with expandable text', {skip: !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable'}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body: '<button>Original Canvas</button>'}));
    await page.addInitScript(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
      window.requests = []; window.failAnnouncements = false; window.emptyAnnouncements = false;
      window.chrome = {runtime: {sendMessage: async message => {
        window.requests.push(message);
        if (message.action === 'courses') return {ok: true, courses: [{id: 34, name: 'English'}, {id: 35, name: 'Math'}]};
        if (message.action === 'announcements') {
          if (window.failAnnouncements) return {ok: false, error: 'Announcements unavailable'};
          if (window.emptyAnnouncements) return {ok: true, announcements: []};
          return {ok: true, announcements: [
            {id: 1, title: 'Exam moved', message: 'The exam moves to Friday.', posted_at: '2026-11-03T12:00:00Z', context_code: 'course_34', html_url: 'https://canvas.test/courses/34/discussion_topics/1', read_state: 'unread'},
            {id: 2, title: 'Reading week', message: '', posted_at: null, context_code: 'course_35', html_url: 'https://canvas.test/courses/35/discussion_topics/2', read_state: 'read'}
          ]};
        }
        return {ok: true, state: {assignments: []}};
      }}};
    });
    await page.goto('https://canvas.test/dashboard');
    await page.addScriptTag({content});
    await page.getByRole('main', {name: 'Tasks', exact: true}).waitFor();
    await page.getByRole('button', {name: 'Announcements', exact: true}).click();
    await page.getByRole('main', {name: 'Announcements', exact: true}).waitFor();
    assert.equal(new URL(page.url()).pathname, '/announcements', 'announcements updates the browser URL');
    assert.deepEqual(await page.locator('.announcement .announcement-title').allTextContents(), ['Exam moved', 'Reading week']);
    assert.equal(await page.locator('.announcement.unread').count(), 1, 'unread announcements stand out');
    assert.match(await page.locator('.announcement .meta').first().textContent(), /English/);
    assert.match(await page.locator('.announcement .meta').nth(1).textContent(), /Math/);
    assert.deepEqual(await page.evaluate(() => window.requests.find(request => request.action === 'announcements').courseIds), ['34', '35']);
    assert.equal(await page.getByText('The exam moves to Friday.', {exact: true}).count(), 0, 'bodies stay collapsed until opened');
    await page.getByRole('button', {name: 'Exam moved', exact: true}).click();
    await page.getByText('The exam moves to Friday.', {exact: true}).waitFor();
    assert.equal(await page.getByRole('link', {name: 'Open in Original Canvas', exact: true}).first().getAttribute('href'), 'https://canvas.test/courses/34/discussion_topics/1');
    await page.getByRole('button', {name: 'Exam moved', exact: true}).click();
    assert.equal(await page.getByText('The exam moves to Friday.', {exact: true}).count(), 0, 'clicking again collapses the body');
    await page.evaluate(() => {window.emptyAnnouncements = true;});
    await page.getByRole('button', {name: 'Sync now', exact: true}).click();
    await page.getByText('No announcements.', {exact: true}).waitFor();
    await page.evaluate(() => {window.emptyAnnouncements = false; window.failAnnouncements = true;});
    await page.getByRole('button', {name: 'Sync now', exact: true}).click();
    await page.getByText('Announcements unavailable', {exact: false}).waitFor();
    await page.evaluate(() => {window.failAnnouncements = false;});
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await page.getByText('Exam moved', {exact: true}).waitFor();
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});
