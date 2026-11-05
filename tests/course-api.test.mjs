import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courseRead} from '../extension/course-api.mjs';

const origin = 'https://canvas.test', identity = origin + '/42';
const json = (value, headers = {}) => new Response(JSON.stringify(value), {headers: {'content-type': 'application/json', ...headers}});
function fixture(handler) {
  const calls = [];
  const fetcher = async (input, options) => {
    const url = new URL(input); calls.push(url.pathname + url.search);
    assert.equal(url.origin, origin);
    assert.equal(options.method, undefined, 'all requests are GET-only');
    assert.equal(options.credentials, 'include');
    assert.equal(options.redirect, 'error');
    if (url.pathname.endsWith('/profile')) return json({id: 42});
    if (url.pathname === '/api/v1/courses/34') return json({id: 34, name: 'English', default_view: 'modules', syllabus_body: '<p>Syllabus</p>'});
    if (url.pathname.endsWith('/tabs')) return json([{id: 'home'}, {id: 'modules'}]);
    return handler(url);
  };
  return {fetcher, calls};
}
const read = (fetcher, kind, id = null) => courseRead(origin, identity, {courseId: '34', kind, id}, fetcher);

test('course requests reject unsynced/changed identities and unsafe routes before content requests', async () => {
  const {fetcher, calls} = fixture(() => {throw new Error('must not fetch course content');});
  for (const route of [{courseId: '../34', kind: 'home'}, {courseId: '34', kind: 'submissions'}, {courseId: '34', kind: 'pages', id: '../secrets'}, {courseId: '34', kind: 'assignments', id: '1/submit'}, {courseId: '34', kind: 'people', id: '99'}]) {
    await assert.rejects(courseRead(origin, identity, route, fetcher), /Invalid/);
  }
  await assert.rejects(courseRead(origin, null, {courseId: '34', kind: 'home'}, fetcher), /Sync/);
  assert.deepEqual(calls, []);
  await assert.rejects(courseRead(origin, origin + '/99', {courseId: '34', kind: 'home'}, fetcher), /Different Canvas account/);
  assert.deepEqual(calls, ['/api/v1/users/self/profile']);
});

test('home follows Canvas default view and modules fetch every item page without bypassing locked modules', async () => {
  const {fetcher, calls} = fixture(url => {
    if (url.pathname.endsWith('/modules')) return json([{id: 7, name: 'Week one', state: 'unlocked', items: [{id: 'truncated'}]}, {id: 8, state: 'locked'}]);
    if (url.searchParams.get('page') === '2') return json([{id: 2, type: 'Page'}]);
    if (url.pathname.endsWith('/modules/7/items')) return json([{id: 1, type: 'Assignment'}], {link: `<${origin}/api/v1/courses/34/modules/7/items?page=2>; rel="next"`});
    throw new Error('Unexpected endpoint ' + url);
  });
  const data = await read(fetcher, 'home');
  assert.equal(data.view, 'modules');
  assert.deepEqual(data.items[0].items.map(item => item.id), [1, 2]);
  assert.deepEqual(data.items[1].items, []);
  assert.ok(!calls.some(url => url.includes('/modules/8/items')));
});

test('course lists and details use fixed scoped read endpoints, including personalized submissions', async () => {
  const {fetcher, calls} = fixture(url => {
    if (/\/(assignments|quizzes|files|discussion_topics)\/\d+$/.test(url.pathname)) return json({id: 12, user_can_see_posts: false});
    if (url.pathname.endsWith('/pages/week%201')) return json({url: 'week 1', body: '<p>Read</p>'});
    return json([]);
  });
  for (const kind of ['assignments', 'quizzes', 'pages', 'announcements', 'discussions', 'files', 'people', 'grades', 'syllabus']) await read(fetcher, kind);
  for (const kind of ['assignments', 'quizzes', 'discussions', 'files']) assert.equal((await read(fetcher, kind, '12')).item.id, 12);
  assert.equal((await read(fetcher, 'pages', 'week 1')).item.body, '<p>Read</p>');
  assert.ok(calls.some(url => url.includes('/assignments/12?include[]=submission&override_assignment_dates=true')));
  assert.ok(calls.some(url => url.includes('only_announcements=true')));
  assert.ok(calls.some(url => url.includes('/enrollments?user_id=42')));
  assert.ok(!calls.some(url => url.endsWith('/view')), 'initial-post gate does not fetch replies');
  assert.ok(!calls.some(url => /submissions|mark_read|\/done|\/take|\/launch/.test(url)));
});

test('discussion reads retrieve permitted replies without changing read state or fetching locked replies', async () => {
  let locked = false;
  const {fetcher, calls} = fixture(url => url.pathname.endsWith('/view') ? json({participants: [], view: [{id: 1, message: 'Reply'}]}) : json({id: 12, locked_for_user: locked, user_can_see_posts: true}));
  assert.equal((await read(fetcher, 'discussions', '12')).discussion.view[0].message, 'Reply');
  locked = true;
  assert.equal((await read(fetcher, 'discussions', '12')).discussion, null);
  assert.equal(calls.filter(url => url.endsWith('/view')).length, 1);
});

test('failed pagination, denied content, wrong IDs and cross-origin pagination reject the entire course result', async () => {
  for (const failure of ['partial', 'denied', 'wrong-id', 'cross-origin']) {
    const {fetcher} = fixture(url => {
      if (failure === 'denied') return new Response('', {status: 403});
      if (failure === 'wrong-id') return json({id: 99});
      if (url.searchParams.get('page') === '2') return new Response('', {status: 500});
      return json([{id: 1}], {link: `<${failure === 'cross-origin' ? 'https://evil.test' : origin}/api/v1/courses/34/assignments?page=2>; rel="next"`});
    });
    await assert.rejects(read(fetcher, 'assignments', failure === 'wrong-id' ? '12' : null), /restricted|Sign in|Unexpected|500|Unsafe/);
  }
});

test('wiki, syllabus, assignments and activity course home configurations are honored', async () => {
  for (const [defaultView, view, endpoint] of [['wiki', 'front_page', '/front_page'], ['syllabus', 'syllabus', null], ['assignments', 'assignments', '/assignments'], ['feed', 'activity', '/activity_stream']]) {
    const calls = [];
    const result = await read(async (input, options) => {
      calls.push(input); assert.equal(options.method, undefined);
      const url = new URL(input);
      if (url.pathname.endsWith('/profile')) return json({id: 42});
      if (url.pathname === '/api/v1/courses/34') return json({id: 34, default_view: defaultView});
      if (url.pathname.endsWith('/front_page')) return json({title: 'Welcome', body: 'Hello'});
      return json([]);
    }, 'home');
    assert.equal(result.view, view);
    if (endpoint) assert.ok(calls.some(url => new URL(url).pathname.endsWith(endpoint)));
  }
});
