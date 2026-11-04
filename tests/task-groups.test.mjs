import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

process.env.TZ = 'America/New_York';
const content = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
// Exercise the workspace's pure helper without requiring Chromium or exposing page APIs.
const source = content.slice(content.indexOf('function bucket('), content.indexOf('  function render()'));
const bucket = runInNewContext('(' + source.trim() + ')', {Date});
const group = (due, now, extra = {}) => bucket({effectiveDue: due, completed: false, ...extra}, new Date(now));

test('task groups distinguish today, tomorrow, the rest of this week, and later deadlines', () => {
  const now = '2026-11-04T12:00:00-05:00';
  assert.equal(group('2026-11-04T11:59:59-05:00', now), 'Overdue');
  assert.equal(group('2026-11-04T23:59:00-05:00', now), 'Today');
  assert.equal(group('2026-11-05T00:00:00-05:00', now), 'Tomorrow');
  assert.equal(group('2026-11-05T23:59:00-05:00', now), 'Tomorrow');
  assert.equal(group('2026-11-06T00:00:00-05:00', now), 'This week');
  assert.equal(group('2026-11-08T23:59:59-05:00', now), 'This week');
  assert.equal(group('2026-11-09T00:00:00-05:00', now), 'Coming up');
  assert.equal(group(null, now), 'No deadline');
  assert.equal(group('2026-11-01T00:00:00-05:00', now, {completed: true}), 'Completed');
});

test('tomorrow takes priority across a Sunday-to-Monday week boundary', () => {
  const now = '2026-11-08T12:00:00-05:00';
  assert.equal(group('2026-11-09T23:59:00-05:00', now), 'Tomorrow');
  assert.equal(group('2026-11-10T00:00:00-05:00', now), 'Coming up');
  assert.equal(group('2026-11-15T12:00:00-05:00', '2026-11-09T12:00:00-05:00'), 'This week');
});

test('local dates, rather than UTC dates, determine tomorrow', () => {
  assert.equal(group('2026-11-06T02:00:00Z', '2026-11-04T23:30:00-05:00'), 'Tomorrow');
  assert.equal(group('2026-11-05T04:00:00Z', '2026-11-04T23:30:00-05:00'), 'Overdue');
});

test('tomorrow handles 23-hour and 25-hour days at DST boundaries', () => {
  assert.equal(group('2026-03-08T23:59:00-04:00', '2026-03-07T12:00:00-05:00'), 'Tomorrow');
  assert.equal(group('2026-03-09T00:00:00-04:00', '2026-03-07T12:00:00-05:00'), 'Coming up');
  assert.equal(group('2026-11-01T23:59:00-05:00', '2026-10-31T12:00:00-04:00'), 'Tomorrow');
  assert.equal(group('2026-11-02T00:00:00-05:00', '2026-10-31T12:00:00-04:00'), 'Coming up');
});

test('this week crosses month and year boundaries correctly', () => {
  const now = '2026-12-30T12:00:00-05:00';
  assert.equal(group('2026-12-31T23:59:00-05:00', now), 'Tomorrow');
  assert.equal(group('2027-01-03T23:59:59-05:00', now), 'This week');
  assert.equal(group('2027-01-04T00:00:00-05:00', now), 'Coming up');
});
