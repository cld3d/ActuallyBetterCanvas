import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courseFileRead, courseRead, quizAnswer, quizComplete, quizResume, quizStart, quizTakeQuestions, submissionUploadInit, submitAssignment, toolLaunch} from '../extension/course-api.mjs';

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

function writeFixture(handler) {
  const calls = [];
  const fetcher = async (input, options) => {
    const url = new URL(input); calls.push({url: url.pathname + url.search, method: options.method, body: options.body});
    assert.equal(url.origin, origin);
    assert.equal(options.credentials, 'include');
    assert.equal(options.redirect, 'error');
    if (url.pathname.endsWith('/profile')) return json({id: 42});
    return handler(url, options);
  };
  return {fetcher, calls};
}
const assignmentRoute = {courseId: '34', kind: 'assignments', id: '12'};

test('text and URL submissions send only the allowed submission fields', async () => {
  const seen = [];
  const {fetcher} = writeFixture((url, options) => {
    assert.equal(url.pathname, '/api/v1/courses/34/assignments/12/submissions');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['content-type'], 'application/json');
    const body = JSON.parse(options.body);
    seen.push(body);
    return json({id: 1, assignment_id: 12, submitted_at: '2026-11-05T00:00:00Z'});
  });
  const text = await submitAssignment(origin, identity, assignmentRoute, {submission_type: 'online_text_entry', body: '<p>Hello</p>', user_id: 99, submitted_at: '2020-01-01'}, fetcher);
  assert.deepEqual(seen[0], {submission: {submission_type: 'online_text_entry', body: '<p>Hello</p>'}});
  assert.equal(text.submission.submitted_at, '2026-11-05T00:00:00Z');
  await submitAssignment(origin, identity, assignmentRoute, {submission_type: 'online_url', url: 'example.com/work'}, fetcher);
  assert.equal(seen[1].submission.url, 'http://example.com/work');
  await submitAssignment(origin, identity, assignmentRoute, {submission_type: 'online_upload', file_ids: [77, '78']}, fetcher);
  assert.deepEqual(seen[2], {submission: {submission_type: 'online_upload', file_ids: ['77', '78']}});
  await assert.rejects(submitAssignment(origin, identity, assignmentRoute, {submission_type: 'online_text_entry', body: ''}, fetcher), /Invalid submission/);
  await assert.rejects(submitAssignment(origin, identity, assignmentRoute, {submission_type: 'online_url', url: 'javascript:alert(1)'}, fetcher), /valid http/);
  await assert.rejects(submitAssignment(origin, identity, assignmentRoute, {submission_type: 'external_tool'}, fetcher), /Invalid submission/);
  await assert.rejects(submitAssignment(origin, identity, {courseId: '34', kind: 'assignments', id: '../12'}, {submission_type: 'online_text_entry', body: 'x'}, fetcher), /Invalid course request/);
  const wrong = writeFixture(() => json({id: 1, assignment_id: 99}));
  await assert.rejects(submitAssignment(origin, identity, assignmentRoute, {submission_type: 'online_text_entry', body: 'x'}, wrong.fetcher), /Unexpected/);
});

test('submission file uploads initialize only safe shell requests', async () => {
  const {fetcher, calls} = writeFixture((url, options) => {
    assert.equal(url.pathname, '/api/v1/courses/34/assignments/12/submissions/self/files');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), {name: 'essay.pdf', size: 100, content_type: 'application/pdf'});
    return json({upload_url: 'https://uploads.test/put', upload_params: {key: 'abc'}});
  });
  const init = await submissionUploadInit(origin, identity, assignmentRoute, {name: 'essay.pdf', size: 100, content_type: 'application/pdf'}, fetcher);
  assert.equal(init.uploadUrl, 'https://uploads.test/put');
  assert.deepEqual(init.uploadParams, {key: 'abc'});
  assert.ok(calls.filter(call => !call.url.endsWith('/profile')).every(call => call.method === 'POST' && call.url.includes('/submissions/self/files')));
  for (const file of [{name: '../evil', size: 1, content_type: 'text/plain'}, {name: '', size: 1, content_type: 'text/plain'}, {name: 'a', size: 0, content_type: 'text/plain'}, {name: 'a', size: 1, content_type: 'nope'}]) {
    await assert.rejects(submissionUploadInit(origin, identity, assignmentRoute, file, fetcher), /Invalid file/);
  }
  const evil = writeFixture(() => json({upload_url: 'javascript:alert(1)', upload_params: {}}));
  await assert.rejects(submissionUploadInit(origin, identity, assignmentRoute, {name: 'a', size: 1, content_type: 'text/plain'}, evil.fetcher), /Unexpected/);
});

test('tool launches use fixed sessionless endpoints with validated targets', async () => {
  const {fetcher, calls} = writeFixture(url => {
    assert.equal(url.pathname, '/api/v1/courses/34/external_tools/sessionless_launch');
    return json({id: 7, name: 'Pearson', url: 'https://tool.test/launch?x=1'});
  });
  const assessment = await toolLaunch(origin, identity, {courseId: '34', launchType: 'assessment', assessmentId: '12'}, fetcher);
  assert.equal(assessment.url, 'https://tool.test/launch?x=1');
  assert.ok(calls.some(call => call.url.includes('launch_type=assessment&assignment_id=12')));
  const moduleItem = await toolLaunch(origin, identity, {courseId: '34', launchType: 'module_item', moduleItemId: '7'}, fetcher);
  assert.equal(moduleItem.name, 'Pearson');
  assert.ok(calls.some(call => call.url.includes('launch_type=module_item&module_item_id=7')));
  assert.ok(!calls.some(call => call.method !== undefined), 'launch lookups stay GET-only');
  const evil = writeFixture(() => json({url: 'javascript:alert(1)'}));
  await assert.rejects(toolLaunch(origin, identity, {courseId: '34', launchType: 'assessment', assessmentId: '12'}, evil.fetcher), /Unexpected/);
  await assert.rejects(toolLaunch(origin, identity, {courseId: '34', launchType: 'assessment', assessmentId: '../12'}, fetcher), /Invalid tool launch/);
  await assert.rejects(toolLaunch(origin, identity, {courseId: '34', launchType: 'take'}, fetcher), /Invalid tool launch/);
});

function quizFixture(handler) {
  const calls = [];
  const fetcher = async (input, options) => {
    const url = new URL(input); calls.push({url: url.pathname + url.search, method: options.method, body: options.body});
    assert.equal(url.origin, origin);
    assert.equal(options.credentials, 'include');
    assert.equal(options.redirect, 'error');
    if (url.pathname.endsWith('/profile')) return json({id: 42});
    return handler(url, options);
  };
  return {fetcher, calls};
}
const quizIds = {courseId: '34', quizId: '9', qsId: '41'};
const quizSubmission = {id: 41, quiz_id: 9, user_id: 42, attempt: 2, validation_token: 'tok', end_at: '2026-11-06T00:00:00Z', workflow_state: 'untaken'};

test('quiz start sends only an optional access code and returns the session', async () => {
  const {fetcher, calls} = quizFixture((url, options) => {
    assert.equal(url.pathname, '/api/v1/courses/34/quizzes/9/submissions');
    assert.equal(options.method, 'POST');
    return json({quiz_submissions: [quizSubmission]});
  });
  const start = await quizStart(origin, identity, {courseId: '34', kind: 'quizzes', id: '9'}, {}, fetcher);
  assert.deepEqual({qsId: start.qsId, attempt: start.attempt, validationToken: start.validationToken}, {qsId: '41', attempt: 2, validationToken: 'tok'});
  assert.deepEqual(JSON.parse(calls.at(-1).body), {});
  await quizStart(origin, identity, {courseId: '34', kind: 'quizzes', id: '9'}, {access_code: 'open'}, fetcher);
  assert.deepEqual(JSON.parse(calls.at(-1).body), {access_code: 'open'});
  await assert.rejects(quizStart(origin, identity, {courseId: '34', kind: 'quizzes', id: '../9'}, {}, fetcher), /Invalid course request/);
  const wrong = quizFixture(() => json({quiz_submissions: [{id: 41, quiz_id: 10, user_id: 42, attempt: 1}]}));
  await assert.rejects(quizStart(origin, identity, {courseId: '34', kind: 'quizzes', id: '9'}, {}, wrong.fetcher), /Unexpected/);
  const empty = quizFixture(() => json({quiz_submissions: []}));
  await assert.rejects(quizStart(origin, identity, {courseId: '34', kind: 'quizzes', id: '9'}, {}, empty.fetcher), /Unexpected/);
});

test('quiz answering and completing verify ownership and shape fixed bodies', async () => {
  const {fetcher, calls} = quizFixture((url, options) => {
    if (url.pathname.endsWith('/submissions/41') && options.method !== 'POST') return json({quiz_submissions: [quizSubmission]});
    if (url.pathname === '/api/v1/quiz_submissions/41/questions') {
      assert.deepEqual(JSON.parse(options.body), {attempt: 2, validation_token: 'tok', quiz_questions: [{id: '101', answer: 5}, {id: '102', answer: {color: 'red'}}]});
      return json({quiz_submission_questions: [{id: 101}, {id: 102}]});
    }
    if (url.pathname.endsWith('/complete')) {
      assert.deepEqual(JSON.parse(options.body), {attempt: 2, validation_token: 'tok'});
      return json({quiz_submissions: [{id: 41, quiz_id: 9, score: 8, kept_score: 9, workflow_state: 'complete', finished_at: '2026-11-06T00:00:00Z'}]});
    }
    throw new Error('Unexpected endpoint ' + url);
  });
  const base = {...quizIds, attempt: 2, validationToken: 'tok'};
  const saved = await quizAnswer(origin, identity, {...base, answers: [{id: 101, answer: 5}, {id: '102', answer: {color: 'red'}}, {id: 103}]}, fetcher);
  assert.equal(saved.answered, 2, 'unanswered questions are not sent');
  const done = await quizComplete(origin, identity, base, fetcher);
  assert.deepEqual([done.score, done.keptScore, done.workflowState], [8, 9, 'complete']);
  assert.ok(calls.some(call => call.url.endsWith('/submissions/41') && call.method === undefined), 'ownership is re-verified with a GET before writing');
  await assert.rejects(quizAnswer(origin, identity, {...base, validationToken: ''}, fetcher), /Invalid quiz session/);
  await assert.rejects(quizAnswer(origin, identity, {...base, answers: []}, fetcher), /Invalid quiz answers/);
  await assert.rejects(quizAnswer(origin, identity, {...base, attempt: 0, answers: [{id: 1, answer: 1}]}, fetcher), /Invalid quiz attempt/);
  await assert.rejects(quizAnswer(origin, identity, {...base, answers: [{id: 1, answer: {nested: {evil: 1}}}]}, fetcher), /Invalid quiz answers/);
  const other = quizFixture(url => url.pathname.endsWith('/submissions/41') ? json({quiz_submissions: [{...quizSubmission, user_id: 77}]}) : json({quiz_submission_questions: []}));
  await assert.rejects(quizAnswer(origin, identity, {...base, answers: [{id: 1, answer: 1}]}, other.fetcher), /Unexpected/);
  await assert.rejects(quizComplete(origin, identity, base, other.fetcher), /Unexpected/);
});

test('quiz resume picks up only the signed-in student unfinished attempt with a token', async () => {
  const session = {id: 41, quiz_id: 9, user_id: 42, attempt: 2, started_at: '2026-11-05T00:00:00Z', finished_at: null, end_at: '2099-11-06T00:00:00Z', validation_token: 'tok2'};
  const {fetcher} = quizFixture(() => json({quiz_submissions: [session]}));
  const resumed = await quizResume(origin, identity, {courseId: '34', kind: 'quizzes', id: '9'}, fetcher);
  assert.deepEqual([resumed.qsId, resumed.attempt, resumed.validationToken], ['41', 2, 'tok2']);
  const finished = quizFixture(() => json({quiz_submissions: [{...session, finished_at: '2026-11-05T01:00:00Z'}]}));
  await assert.rejects(quizResume(origin, identity, {courseId: '34', kind: 'quizzes', id: '9'}, finished.fetcher), /No attempt in progress/);
  const unstarted = quizFixture(() => json({quiz_submissions: [{...session, started_at: null}]}));
  await assert.rejects(quizResume(origin, identity, {courseId: '34', kind: 'quizzes', id: '9'}, unstarted.fetcher), /No attempt in progress/);
  const noToken = quizFixture(() => json({quiz_submissions: [{...session, validation_token: null}]}));
  await assert.rejects(quizResume(origin, identity, {courseId: '34', kind: 'quizzes', id: '9'}, noToken.fetcher), /Original Canvas/);
  const foreign = quizFixture(() => json({quiz_submissions: [{...session, user_id: 77}]}));
  await assert.rejects(quizResume(origin, identity, {courseId: '34', kind: 'quizzes', id: '9'}, foreign.fetcher), /No attempt in progress/);
  await assert.rejects(quizResume(origin, identity, {courseId: '34', kind: 'quizzes', id: '../9'}, fetcher), /Invalid course request/);
});

test('quiz take questions verify the submission before listing', async () => {
  const {fetcher, calls} = quizFixture(url => {
    if (url.pathname.endsWith('/submissions/41')) return json({quiz_submissions: [quizSubmission]});
    if (url.pathname === '/api/v1/quiz_submissions/41/questions') {
      assert.ok(url.search.includes('include%5B%5D=quiz_question') || url.search.includes('include[]=quiz_question'));
      return json({quiz_submission_questions: [{id: 101, answer: null, quiz_question: {id: 501}}]});
    }
    throw new Error('Unexpected endpoint ' + url);
  });
  const loaded = await quizTakeQuestions(origin, identity, quizIds, fetcher);
  assert.equal(loaded.questions.length, 1);
  assert.ok(calls.filter(call => !call.url.endsWith('/profile')).every(call => call.method === undefined), 'reads stay GET-only');
  const foreign = quizFixture(url => url.pathname.endsWith('/submissions/41') ? json({quiz_submissions: [{...quizSubmission, quiz_id: 10}]}) : json({quiz_submission_questions: []}));
  await assert.rejects(quizTakeQuestions(origin, identity, quizIds, foreign.fetcher), /Unexpected/);
});

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
