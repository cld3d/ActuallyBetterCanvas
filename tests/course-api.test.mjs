import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courseFileRead, courseRead} from '../extension/course-api.mjs';

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
    if (url.pathname.endsWith('/submissions')) return json({quiz_submissions: []});
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
  assert.ok(!calls.some(url => /mark_read|\/done|\/take|\/launch/.test(url)));
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

test('quiz detail loads only the current user attempts and their submission questions', async () => {
  const {fetcher, calls} = fixture(url => {
    if (/\/(assignments|quizzes|files)\/\d+$/.test(url.pathname)) return json({id: 9, title: 'Practice quiz'});
    if (url.pathname.endsWith('/submissions')) return json({quiz_submissions: [
      {id: 31, quiz_id: 9, user_id: 42, attempt: 1, workflow_state: 'complete', score: 8},
      {id: 32, quiz_id: 9, user_id: 42, attempt: 2, workflow_state: 'complete', score: 9},
      {id: 33, quiz_id: 9, user_id: 77, attempt: 1, workflow_state: 'complete', score: 10},
      {id: 34, quiz_id: 10, user_id: 42, attempt: 1, workflow_state: 'complete', score: 10},
      {id: 'bad', quiz_id: 9, user_id: 42, attempt: 3}
    ]});
    if (url.pathname === '/api/v1/quiz_submissions/32/questions') return json({quiz_submission_questions: [
      {id: 101, answer: 5, quiz_question: {id: 501, question_type: 'multiple_choice_question', question_text: 'Pick four', answers: [{id: 5, answer_text: 'Four'}]}}
    ]});
    throw new Error('Unexpected endpoint ' + url);
  });
  const data = await read(fetcher, 'quizzes', '9');
  assert.deepEqual(data.quizAttempts.map(s => s.id), [31, 32]);
  assert.equal(data.quizReviewAttempt, 2);
  assert.equal(data.quizQuestions.length, 1);
  assert.ok(calls.some(url => url.includes('/quizzes/9/submissions?include[]=submission')));
  assert.ok(calls.some(url => url.includes('/quiz_submissions/32/questions?include[]=quiz_question')));
  assert.ok(!calls.some(url => /\/take|\/complete|answer|flag/.test(url)), 'review never writes or takes the quiz');
});

test('unavailable quiz review still renders the quiz description', async () => {
  for (const failure of ['submissions-denied', 'questions-denied']) {
    const {fetcher} = fixture(url => {
      if (/\/(assignments|quizzes|files)\/\d+$/.test(url.pathname)) return json({id: 9, title: 'Practice quiz'});
      if (failure === 'submissions-denied' && url.pathname.endsWith('/submissions')) return new Response('', {status: 403});
      if (url.pathname.endsWith('/submissions')) return json({quiz_submissions: [{id: 31, quiz_id: 9, user_id: 42, attempt: 1, workflow_state: 'complete', score: 8}]});
      if (failure === 'questions-denied') return new Response('', {status: 403});
      return json({quiz_submission_questions: []});
    });
    const data = await read(fetcher, 'quizzes', '9');
    assert.equal(data.item.title, 'Practice quiz');
    if (failure === 'submissions-denied') {assert.deepEqual(data.quizAttempts, []); assert.equal(data.quizQuestions, null);}
    else {assert.equal(data.quizAttempts.length, 1); assert.equal(data.quizQuestions, null);}
  }
});

test('malformed quiz envelopes degrade to attempts and description instead of failing the page', async () => {
  const {fetcher} = fixture(url => {
    if (url.pathname === '/api/v1/courses/34') return json({id: 34, name: 'English', default_view: 'modules'});
    if (url.pathname.endsWith('/submissions')) return json([{id: 31}]);
    return json({id: 9, title: 'Practice quiz'});
  });
  const data = await read(fetcher, 'quizzes', '9');
  assert.equal(data.item.title, 'Practice quiz');
  assert.deepEqual(data.quizAttempts, []);
  assert.equal(data.quizQuestions, null);
});

const fileRoute = {courseId: '34', kind: 'files', id: '5'};
const fileURL = origin + '/courses/34/files/5/download?verifier=abc';
const fileFetcher = (body, contentType = 'text/plain', status = 200) => fixture(() => new Response(body, {status, headers: {'content-type': contentType}})).fetcher;

test('course file previews accept only the matching same-origin download URL and small text files', async () => {
  const reply = await courseFileRead(origin, identity, fileRoute, fileURL, fileFetcher('Hello file'));
  assert.equal(reply.text, 'Hello file');
  assert.equal(reply.truncated, false);
  const long = await courseFileRead(origin, identity, fileRoute, fileURL, fileFetcher('x'.repeat(60000)));
  assert.equal(long.text.length, 50000);
  assert.equal(long.truncated, true);
  await assert.rejects(courseFileRead(origin, identity, fileRoute, 'https://evil.test/courses/34/files/5/download', fileFetcher('x')), /Invalid file URL/);
  await assert.rejects(courseFileRead(origin, identity, fileRoute, origin + '/courses/99/files/5/download', fileFetcher('x')), /Invalid file URL/);
  await assert.rejects(courseFileRead(origin, identity, fileRoute, origin + '/courses/34/files/6/download', fileFetcher('x')), /Invalid file URL/);
  await assert.rejects(courseFileRead(origin, identity, fileRoute, origin + '/courses/34/files/5', fileFetcher('x')), /Invalid file URL/);
  await assert.rejects(courseFileRead(origin, identity, fileRoute, fileURL, fileFetcher('%PDF', 'application/pdf')), /cannot be previewed/);
  await assert.rejects(courseFileRead(origin, identity, {...fileRoute, id: '../5'}, fileURL, fileFetcher('x')), /Invalid file request/);
  await assert.rejects(courseFileRead(origin, null, fileRoute, fileURL, fileFetcher('x')), /Sync your assignments/);
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
