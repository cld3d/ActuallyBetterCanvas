import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';

const content = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');

test('workspace edits, completion overrides, source navigation, mobile and dark theme', async () => {
  const browser = await chromium.launch({executablePath: '/opt/brave-origin-bin/brave', headless: true,
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
    await page.getByRole('button', {name: 'My workspace', exact: true}).click();
    await page.getByRole('heading', {name: 'A clearer view of what’s next.'}).waitFor();
    const check = page.getByRole('checkbox');
    assert.equal(await check.isChecked(), false, 'a grade must not check the assignment');
    assert.equal(await page.locator('#canvas-local-root').locator('img').count(), 0, 'assignment titles render as text');
    assert.equal(await page.locator('#original').evaluate(node => node.inert), true, 'underlying Canvas is not focusable');
    await check.click();
    await page.getByLabel('Completion filter').selectOption('completed');
    await page.getByRole('checkbox').waitFor();
    assert.equal(await page.getByRole('checkbox').isChecked(), true);
    await page.getByRole('checkbox').click();
    await page.getByLabel('Completion filter').selectOption('open');
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
