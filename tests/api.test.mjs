import {test} from 'node:test';
import assert from 'node:assert/strict';
import {submitted, nextPage, pages, collect} from '../extension/api.mjs';

test('only explicit submission evidence completes an assignment', () => {
  assert.equal(submitted({workflow_state: 'graded', score: 0, graded_at: '2026-11-01'}), false);
  assert.equal(submitted({workflow_state: 'unsubmitted', attempt: 1}), false);
  assert.equal(submitted({workflow_state: 'submitted'}), true);
  assert.equal(submitted({workflow_state: 'pending_review'}), true);
  assert.equal(submitted({workflow_state: 'graded', submitted_at: '2026-11-01'}), true);
  assert.equal(submitted(null), false);
});
test('pagination stays on Canvas API origin', () => {
  const origin = 'https://school.instructure.com';
  assert.equal(nextPage(`<${origin}/api/v1/courses?page=2>; rel="next", <${origin}/api/v1/courses?page=4>; rel="last"`, origin), origin + '/api/v1/courses?page=2');
  assert.throws(() => nextPage('<https://evil.com/api/v1/courses>; rel="next"', origin));
  assert.throws(() => nextPage(`<${origin}/login>; rel="next"`, origin));
});
test('failed pagination rejects instead of silently importing a partial snapshot', async () => {
  let calls = 0;
  await assert.rejects(pages('https://canvas.test', '/api/v1/courses', async () => {
    calls++;
    return calls === 1 ? new Response('[{"id":1}]', {headers: {'content-type': 'application/json', link: '<https://canvas.test/api/v1/courses?page=2>; rel="next"'}}) : new Response('', {status: 500});
  }));
  assert.equal(calls, 2);
});
test('collect includes personalized deadline request and never sends a write', async () => {
  const urls = [];
  const fetcher = async (url, options) => {
    urls.push(url);
    assert.equal(options.method, undefined);
    assert.equal(options.credentials, 'include');
    const value = url.includes('/profile') ? {id: 42} : url.includes('/assignments?') ? [{id: 3, name: 'Essay', due_at: '2026-11-08T23:59:00Z', submission: {workflow_state: 'graded', score: 0}}] : [{id: 2, name: 'English'}];
    return new Response(JSON.stringify(value), {headers: {'content-type': 'application/json'}});
  };
  const result = await collect('https://canvas.test', fetcher);
  assert.equal(result.assignments[0].submitted, false);
  assert.equal(result.assignments[0].graded, true);
  assert.equal(result.assignments[0].canvasDue, '2026-11-08T23:59:00Z');
  assert.ok(urls.some(url => url.includes('override_assignment_dates=true')));
});
test('missing submission data aborts a sync', async () => {
  await assert.rejects(collect('https://canvas.test', async url => {
    const data = url.includes('/profile') ? {id: 42} : url.includes('/assignments?') ? [{id: 3, name: 'Essay'}] : [{id: 2, name: 'English'}];
    return new Response(JSON.stringify(data), {headers: {'content-type': 'application/json'}});
  }), /submission/);
});
