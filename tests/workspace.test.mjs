import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {browserPath} from './environment.mjs';

const content = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');

const executablePath = browserPath();
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
  await page.locator('.topbar').hover();
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
    await page.getByText('Canvas deadline', {exact: true}).waitFor();
    await page.emulateMedia({colorScheme: 'dark', reducedMotion: 'reduce'});
    assert.equal(await page.locator('#canvas-local-root').evaluate(node => getComputedStyle(node).getPropertyValue('--bg').trim()), '#171e1a');
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
      for (const name of ['Courses', 'Calendar', 'Inbox', 'Tasks']) {
        await page.getByRole('button', {name, exact: true}).click();
        assert.equal(await page.locator('#canvas-local-root h1, #canvas-local-root .intro').count(), 0, `${name} has no redundant page title or subtitle`);
        assert.equal(await page.getByRole('main', {name, exact: true}).count(), 1, 'page identity remains accessible');
        assert.equal(await page.locator('.workspace').evaluate(node => node.scrollWidth > node.clientWidth), false, `${name} must fit mobile in ${colorScheme}`);
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('#canvas-local-root').evaluate(node => getComputedStyle(node.shadowRoot.activeElement).outlineStyle), 'none', `${name} has no rectangular keyboard focus outline`);
      }
      assert.equal(await page.locator('.tab-indicator').evaluate(node => getComputedStyle(node).transitionDuration), '0s', 'reduced motion disables underline sliding');
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
