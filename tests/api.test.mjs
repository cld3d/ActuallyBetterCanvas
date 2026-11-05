import {test} from 'node:test';
import assert from 'node:assert/strict';
import {announcementsRead, submitted, nextPage, pages, collect, workspaceRead} from '../extension/api.mjs';

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

test('workspace courses and inbox paginate GET-only; reading never marks messages read', async () => {
  const urls = [];
  const fetcher = async (url, options) => {
    urls.push(url);
    assert.equal(options.method, undefined);
    assert.equal(options.credentials, 'include');
    assert.equal(options.redirect, 'error');
    const data = url.includes('/profile') ? {id: 42} : url.includes('auto_mark_as_read=false') ? {id: 9, messages: [{body: '<img src=x>'}]} : [{id: 9}];
    return new Response(JSON.stringify(data), {headers: {'content-type': 'application/json'}});
  };
  const origin = 'https://canvas.test', identity = origin + '/42';
  assert.equal((await workspaceRead(origin, identity, 'courses', null, fetcher)).courses[0].id, 9);
  assert.equal((await workspaceRead(origin, identity, 'inbox', null, fetcher)).conversations[0].id, 9);
  assert.equal((await workspaceRead(origin, identity, 'conversation', 9, fetcher)).conversation.messages[0].body, '<img src=x>');
  assert.ok(urls.includes(origin + '/api/v1/conversations/9?auto_mark_as_read=false'));
  await assert.rejects(workspaceRead(origin, identity, 'conversation', '../users', fetcher), /Invalid conversation/);
});

test('workspace announcements scope to the given courses and paginate GET-only', async () => {
  const urls = [];
  const fetcher = async (url, options) => {
    urls.push(url);
    assert.equal(options.method, undefined);
    assert.equal(options.credentials, 'include');
    const data = url.includes('/profile') ? {id: 42} : [{id: 1, title: 'Exam moved'}];
    return new Response(JSON.stringify(data), {headers: {'content-type': 'application/json'}});
  };
  const origin = 'https://canvas.test', identity = origin + '/42';
  assert.equal((await announcementsRead(origin, identity, [34, '35', 'nope', 34], fetcher)).announcements[0].id, 1);
  assert.ok(urls.some(url => url.includes('/api/v1/announcements?context_codes[]=course_34&context_codes[]=course_35&per_page=100')), 'one request carries every course context');
  assert.deepEqual(await announcementsRead(origin, identity, [], fetcher), {announcements: []});
  await assert.rejects(announcementsRead(origin, null, [34], fetcher), /Sync your assignments/);
});

test('workspace refuses unsynced or changed identities before loading private data', async () => {
  const urls = [];
  const fetcher = async url => {urls.push(url); return new Response('{"id":99}', {headers: {'content-type': 'application/json'}});};
  await assert.rejects(workspaceRead('https://canvas.test', null, 'inbox', null, fetcher), /Sync your assignments/);
  await assert.rejects(workspaceRead('https://canvas.test', 'https://canvas.test/42', 'inbox', null, fetcher), /Different Canvas account/);
  assert.deepEqual(urls, ['https://canvas.test/api/v1/users/self/profile']);
});

test('failed inbox pagination and malformed conversation data reject rather than returning partial data', async () => {
  const origin = 'https://canvas.test';
  const fetcher = async url => {
    if (url.includes('/profile')) return new Response('{"id":42}', {headers: {'content-type': 'application/json'}});
    if (url.includes('page=2')) return new Response('', {status: 500});
    return new Response('[{"id":9}]', {headers: {'content-type': 'application/json', link: `<${origin}/api/v1/conversations?page=2>; rel="next"`}});
  };
  await assert.rejects(workspaceRead(origin, origin + '/42', 'inbox', null, fetcher), /500/);
  await assert.rejects(workspaceRead(origin, origin + '/42', 'conversation', 9, fetcher), /Unexpected Canvas conversation/);
});
