import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {browserPath} from './environment.mjs';

const routes = await readFile(new URL('../extension/course-routes.js', import.meta.url), 'utf8');
const workspace = await readFile(new URL('../extension/course-workspace.js', import.meta.url), 'utf8');
const content = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
const preload = await readFile(new URL('../extension/preload.js', import.meta.url), 'utf8');
const executablePath = browserPath();
const skip = !executablePath && 'Chromium unavailable or browser tests disabled; set CANVAS_BROWSER_PATH to enable';

async function setup(browser, path = '/courses/34') {
  const page = await browser.newPage({viewport: {width: 1366, height: 900}});
  await page.addInitScript({content: routes + '\n' + preload});
  await page.addInitScript(() => {
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode: 'open'});};
    window.courseRequests = []; window.courseFailure = false; window.delayCourse = false;
    const sections = ['modules', 'assignments', 'quizzes', 'pages', 'announcements', 'discussion_topics', 'files', 'assignments/syllabus', 'grades', 'users'];
    const tabs = [{id: 'home', label: 'Home', html_url: '/courses/34'}, ...sections.map(section => ({id: section, label: ({discussion_topics: 'Discussions', 'assignments/syllabus': 'Syllabus', users: 'People'})[section] || section[0].toUpperCase() + section.slice(1), html_url: '/courses/34/' + section})),
      {id: 'external_tool_1', label: 'Publisher', html_url: '/courses/34/external_tools/1'}, {id: 'hidden', label: 'Hidden tool', hidden: true, html_url: '/courses/34/external_tools/2'}];
    window.testState = {assignments: [{uid: 'essay', courseId: '34', course: 'English', title: 'Essay', effectiveDue: null, completed: false, dueOverride: false, completionOverride: null, url: 'https://canvas.test/courses/34/assignments/12'}]};
    window.chrome = {runtime: {sendMessage: async message => {
      if (message.action === 'update') {window.testState.assignments[0].completed = message.patch.completion; return {ok: true, state: structuredClone(window.testState)};}
      if (message.action === 'courses') return {ok: true, courses: [{id: 34, name: 'English'}]};
      if (message.action === 'courseFile') return {ok: true, text: 'Hello file contents', truncated: false, contentType: 'text/plain'};
      if (window.submissions === undefined) {window.submissions = []; window.launches = []; window.quizCalls = [];}
      if (message.action === 'quizStart') {
        window.quizCalls.push({action: 'quizStart', options: message.options});
        if (window.requireCode && !message.options?.access_code) return {ok: false, error: 'Invalid access code'};
        return {ok: true, qsId: '41', attempt: 2, validationToken: 'tok', endAt: '2099-11-06T00:00:00Z', workflowState: 'untaken'};
      }
      if (message.action === 'quizResume') return {ok: true, qsId: '42', attempt: 2, validationToken: 'tok2', endAt: '2099-11-06T02:00:00Z'};
      if (message.action === 'quizQuestions') return {ok: true, questions: [
        {id: 101, answer: null, quiz_question: {id: 501, question_name: 'First question', question_type: 'multiple_choice_question', question_text: '<p>What is two plus two?</p>', points_possible: 5, answers: [{id: 5, answer_text: 'Four'}, {id: 6, answer_text: 'Five'}]}},
        {id: 102, answer: null, quiz_question: {id: 502, question_name: 'Explain', question_type: 'essay_question', question_text: '<p>Explain why.</p>', points_possible: 5}}
      ]};
      if (message.action === 'quizAnswer') {window.quizCalls.push({action: 'quizAnswer', take: message.take}); return {ok: true, answered: message.take.answers.length};}
      if (message.action === 'quizComplete') {window.quizCalls.push({action: 'quizComplete'}); return {ok: true, score: 8, keptScore: 8, workflowState: 'complete', finishedAt: '2026-11-05T00:00:00Z'};}
      if (message.action === 'submitAssignment') {window.submissions.push(message.submission); return {ok: true, submission: {id: 1, assignment_id: Number(message.route.id), submitted_at: '2026-11-05T00:00:00Z', workflow_state: 'submitted'}};}
      if (message.action === 'submissionUploadInit') return {ok: true, uploadUrl: 'https://uploads.test/put', uploadParams: {key: 'abc'}};
      if (message.action === 'toolLaunch') {window.launches.push(message.launch); return {ok: true, url: 'https://tool.test/launch?x=1', name: 'Example tool'};}
      if (message.action !== 'course') return {ok: true, state: structuredClone(window.testState), conversations: []};
      window.courseRequests.push(message.route);
      if (window.delayCourse) return new Promise(resolve => {window.finishCourse = resolve;});
      if (window.courseFailure) return {ok: false, error: 'Canvas has restricted access to this content.'};
      const {kind, id, courseId} = message.route;
      const result = {ok: true, course: {id: courseId, name: courseId === '34' ? 'English' : 'History', syllabus_body: '<p>Read the course syllabus.</p>'}, tabs, view: kind === 'home' ? 'modules' : kind};
      if (result.view === 'modules') result.items = [{id: 7, name: 'Week one', state: 'unlocked', require_sequential_progress: true, prerequisite_module_ids: [], items: [
        {id: 1, type: 'Assignment', title: 'Module essay', content_id: 12, completion_requirement: {type: 'must_submit', completed: false}},
        {id: 2, type: 'Page', title: 'Module reading', page_url: 'reading'},
        {id: 3, type: 'Quiz', title: 'Locked quiz', content_id: 9, content_details: {locked_for_user: true}},
        {id: 4, type: 'ExternalTool', title: 'Publisher activity', html_url: '/courses/34/modules/items/4'}
      ]}, {id: 8, name: 'Week two', state: 'locked', items: []}];
      if (kind === 'assignments' || kind === 'grades') {
        const item = {id: 12, name: 'Essay', description: '<p>Write an <strong>essay</strong>.</p>', points_possible: 20, due_at: '2026-11-09T17:00:00Z', submission: {workflow_state: 'graded', grade: '0', score: 0, submission_comments: [{author_name: 'Teacher', comment: 'Please revise.'}]}, rubric: [{description: 'Clarity', points: 20, ratings: [{points: 20, description: 'Clear'}]}]};
        const sid = String(id);
        if (sid === '13') {item.id = 13; item.name = 'Journal'; item.submission_types = ['online_text_entry']; item.submission = {workflow_state: 'unsubmitted'}; delete item.rubric;}
        if (sid === '14') {item.id = 14; item.name = 'Report'; item.submission_types = ['online_upload']; item.allowed_extensions = ['pdf']; item.submission = {workflow_state: 'unsubmitted'}; delete item.rubric;}
        if (sid === '15') {item.id = 15; item.name = 'Homework'; item.submission_types = ['external_tool']; item.submission = {workflow_state: 'unsubmitted'}; delete item.rubric;}
        if (sid === '16') {item.id = 16; item.name = 'Link'; item.submission_types = ['online_url']; item.submission = {workflow_state: 'unsubmitted'}; delete item.rubric;}
        if (sid === '17') {item.id = 17; item.name = 'Quiz work'; item.is_quiz_assignment = true; item.submission_types = ['online_quiz']; item.submission = {workflow_state: 'unsubmitted'}; delete item.rubric;}
        if (sid === '18') {item.id = 18; item.name = 'Tool quiz'; item.is_quiz_assignment = true; item.submission_types = ['external_tool']; item.submission = {workflow_state: 'unsubmitted'}; delete item.rubric;}
        if (sid === '19') {item.id = 19; item.name = 'Unflagged quiz'; item.submission_types = ['external_tool']; item.submission = {workflow_state: 'unsubmitted'}; delete item.rubric;}
        if (sid === '20') {item.id = 20; item.name = 'New Quiz'; item.submission_types = ['external_tool']; item.submission = {workflow_state: 'unsubmitted'}; delete item.rubric;}
        if (id) result.item = item; else result.items = [item];
        if (sid === '17' || sid === '19') result.quizId = 9;
        if (sid === '20') result.newQuiz = {id: 3, title: 'New Quiz', instructions: '<p>Watch the video first.</p>'};
        result.enrollments = [{grades: {current_score: 87.4}}];
      }
      if (kind === 'quizzes') {
        if (String(id) === '10') {
          result.item = {id: 10, title: 'Resumable quiz', description: '<p>Pick up where you left off.</p>', time_limit: 30, allowed_attempts: 2, points_possible: 10};
          result.quizAttempts = [{id: 42, quiz_id: 10, user_id: 42, attempt: 2, workflow_state: 'untaken', started_at: '2026-11-05T00:00:00Z', finished_at: null, score: null, time_spent: 60}];
        } else if (id) {
          result.item = {id: 9, title: 'Practice quiz', description: '<p>Review chapter one.</p>', time_limit: 30, allowed_attempts: 2, points_possible: 10};
          result.quizAttempts = [{id: 31, quiz_id: 9, user_id: 42, attempt: 1, workflow_state: 'complete', score: 8, finished_at: '2026-11-01T12:00:00Z', time_spent: 600}];
          result.quizQuestions = [{id: 101, answer: 5, quiz_question: {id: 501, question_name: 'First question', question_type: 'multiple_choice_question', question_text: '<p>What is two plus two?</p>', points_possible: 5, neutral_comments: 'Well done reading.', correct_comments: 'secret-correct-marker', incorrect_comments: 'secret-wrong-marker', answers: [{id: 5, answer_text: 'Four'}, {id: 6, answer_text: 'Five'}]}}];
          result.quizReviewAttempt = 1;
        } else result.items = [{id: 9, title: 'Practice quiz'}];
      }
      if (kind === 'pages') {
        if (id) result.item = {title: 'Reading', body: '<h2>Chapter one</h2><p>Read <em>carefully</em>.</p><a href="/courses/34/assignments/12">Open essay</a>'};
        else result.items = [{title: 'Reading', url: 'reading'}];
      }
      if (kind === 'announcements') result.items = [{id: 11, title: 'Welcome announcement'}];
      if (kind === 'discussions') {
        if (id) {result.item = {id: 11, title: 'Welcome discussion', message: '<p>Introduce yourself.</p>'}; result.discussion = {participants: [{id: 42, display_name: 'Student'}], view: [{id: 1, user_id: 42, message: '<p>Hello class.</p>', replies: [{id: 2, message: 'Welcome.'}]}]};}
        else result.items = [{id: 11, title: 'Welcome discussion'}];
      }
      if (kind === 'files') {
        if (id === '6' || id === 6) result.item = {id: 6, display_name: 'Photo.png', size: 2048, 'content-type': 'image/png', url: 'https://canvas.test/files/6/download?verifier=img'};
        else if (id === '7' || id === 7) result.item = {id: 7, display_name: 'Notes.txt', size: 21, 'content-type': 'text/plain', url: 'https://canvas.test/files/7/download?verifier=txt'};
        else if (id) result.item = {id: 5, display_name: 'Reading.pdf', size: 2048, 'content-type': 'application/pdf'};
        else result.items = [{id: 5, display_name: 'Reading.pdf'}, {id: 6, display_name: 'Photo.png'}, {id: 7, display_name: 'Notes.txt'}];
      }
      if (kind === 'people') result.items = [{name: 'Teacher', enrollments: [{type: 'TeacherEnrollment'}]}];
      return result;
    }}};
  });
  await page.route('https://canvas.test/**', route => route.fulfill({contentType: 'text/html', body: `<p id="original">Original ${new URL(route.request().url()).pathname}</p><script>${workspace}\n${content}</script>`}));
  await page.goto('https://canvas.test' + path);
  return page;
}

test('course browsing covers enabled tabs, content, local overrides, history and native handoffs', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await setup(browser);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    assert.equal(await page.locator('#canvas-local-preload-style').count(), 0);
    assert.equal(await page.getByRole('link', {name: 'Hidden tool', exact: true}).count(), 0);
    assert.equal(await page.getByRole('link', {name: 'Locked quiz', exact: true}).count(), 0);
    assert.equal(await page.locator('.course-body').getByText('Requirement: must submit', {exact: false}).count(), 1);
    const nav = page.getByRole('navigation', {name: 'Course navigation', exact: true});
    await page.getByRole('link', {name: 'Module essay', exact: true}).click();
    await page.getByRole('heading', {name: 'Essay', exact: true}).waitFor();
    assert.equal(new URL(page.url()).pathname, '/courses/34/assignments/12');
    assert.equal(await page.getByRole('checkbox').isChecked(), false, 'a zero grade never completes local work');
    assert.equal(await page.getByText('Please revise.', {exact: true}).isVisible(), true);
    assert.equal(await page.getByRole('heading', {name: 'Rubric', exact: true}).isVisible(), true);
    await page.getByRole('checkbox').check();
    await page.waitForFunction(() => window.testState.assignments[0].completed);
    await page.getByRole('checkbox', {name: 'Reopen Essay', exact: true}).waitFor();
    await page.goBack();
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    await page.goForward();
    await page.getByRole('heading', {name: 'Essay', exact: true}).waitFor();
    await page.reload();
    await page.getByRole('heading', {name: 'Essay', exact: true}).waitFor();
    await nav.getByRole('link', {name: 'Pages', exact: true}).click();
    await page.getByRole('link', {name: 'Reading', exact: true}).click();
    await page.getByRole('heading', {name: 'Chapter one', exact: true}).waitFor();
    await page.getByRole('link', {name: 'Open essay', exact: true}).click();
    await page.getByRole('heading', {name: 'Essay', exact: true}).waitFor();
    for (const [tab, heading] of [['Quizzes', 'Quizzes'], ['Announcements', 'Announcements'], ['Discussions', 'Discussions'], ['Files', 'Files'], ['Syllabus', 'Syllabus'], ['Grades', 'Grades'], ['People', 'People']]) {
      await nav.getByRole('link', {name: tab, exact: true}).click();
      await page.locator('.course-body').getByRole('heading', {name: heading, exact: true}).waitFor();
      if (tab === 'Quizzes') {await page.getByRole('link', {name: 'Practice quiz', exact: true}).click(); await page.getByRole('link', {name: 'Take / review quiz in Original Canvas', exact: true}).waitFor();}
      if (tab === 'Discussions') {await page.getByRole('link', {name: 'Welcome discussion', exact: true}).click(); await page.getByText('Hello class.', {exact: true}).waitFor();}
      if (tab === 'Files') {await page.getByRole('link', {name: 'Reading.pdf', exact: true}).click(); await page.getByRole('link', {name: 'Preview / download in Original Canvas', exact: true}).waitFor();}
    }
    await page.getByRole('link', {name: 'All courses', exact: true}).click();
    await page.getByRole('main', {name: 'Courses', exact: true}).waitFor();
    await page.getByRole('link', {name: 'Open course', exact: true}).click();
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    await nav.getByRole('link', {name: 'Publisher', exact: true}).click();
    await page.waitForURL('**/courses/34/external_tools/1');
    assert.equal(await page.locator('.workspace').isVisible(), false, 'external tool handoff stays in Original Canvas');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('actually-better-canvas-mode')), 'original');
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('course loading, denial, stale requests and mobile/dark layout remain safe', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await setup(browser);
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    await page.evaluate(() => {window.delayCourse = true;});
    await page.getByRole('navigation', {name: 'Course navigation', exact: true}).getByRole('link', {name: 'Pages', exact: true}).click();
    await page.locator('.course-loading').waitFor();
    assert.equal(await page.getByRole('heading', {name: 'Week one', exact: true}).count(), 0, 'old course content is not shown under a new URL');
    await page.getByRole('button', {name: 'Tasks', exact: true}).click();
    await page.evaluate(() => {window.delayCourse = false; window.finishCourse({ok: true, course: {name: 'Stale course'}, tabs: [], view: 'pages', items: []});});
    assert.equal(await page.getByRole('heading', {name: 'Stale course', exact: true}).count(), 0);
    await page.evaluate(() => {window.courseFailure = true;});
    await page.getByRole('button', {name: 'Courses', exact: true}).click();
    await page.getByRole('link', {name: 'Open course', exact: true}).click();
    await page.getByRole('alert').filter({hasText: 'restricted access'}).waitFor();
    assert.equal(await page.getByRole('link', {name: 'Open this page in Original Canvas', exact: true}).count(), 0, 'no per-page Original Canvas exit anywhere');
    await page.evaluate(() => {window.courseFailure = false;});
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({colorScheme, reducedMotion: 'reduce'});
      await page.setViewportSize({width: 390, height: 844});
      assert.equal(await page.locator('.workspace').evaluate(node => node.scrollWidth > node.clientWidth), false);
      await page.getByRole('link', {name: 'Module essay', exact: true}).click();
      await page.getByRole('heading', {name: 'Essay', exact: true}).waitFor();
      assert.equal(await page.locator('.workspace').evaluate(node => node.scrollWidth > node.clientWidth), false);
      await page.getByRole('navigation', {name: 'Course navigation', exact: true}).getByRole('link', {name: 'Home', exact: true}).click();
      await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    }
  } finally {await browser.close();}
});

test('course loading never shows an ID placeholder, grades read as fractions, catalog leads with Open course', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await setup(browser);
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    await page.evaluate(() => {window.delayCourse = true;});
    await page.getByRole('navigation', {name: 'Course navigation', exact: true}).getByRole('link', {name: 'Pages', exact: true}).click();
    await page.locator('.course-loading').waitFor();
    assert.equal(await page.locator('.course-heading h1').count(), 0, 'no heading placeholder while loading');
    await page.evaluate(() => {window.delayCourse = false; window.finishCourse({ok: true, course: {name: 'English'}, tabs: [{id: 'home', label: 'Home', html_url: '/courses/34'}, {id: 'grades', label: 'Grades', html_url: '/courses/34/grades'}], view: 'pages', items: []});});
    await page.locator('.course-body').getByText('Nothing has been posted here yet.', {exact: true}).waitFor();
    assert.equal(await page.locator('.course-heading h1').textContent(), 'English', 'real course name appears once data arrives');
    await page.getByRole('navigation', {name: 'Course navigation', exact: true}).getByRole('link', {name: 'Grades', exact: true}).click();
    const fraction = page.locator('.course-grade-fraction');
    await fraction.waitFor();
    assert.equal(await fraction.textContent(), '0/20');
    const layout = await page.locator('.course-record-grade').evaluate(node => {
      const row = getComputedStyle(node), end = getComputedStyle(node.querySelector('.course-grade-fraction'));
      return {display: row.display, justify: row.justifyContent, marginLeft: end.marginLeft};
    });
    assert.equal(layout.display, 'flex');
    assert.equal(layout.justify, 'space-between');
    assert.notEqual(layout.marginLeft, '0px', 'fraction sits at the right side of the row');
    await page.getByRole('link', {name: 'All courses', exact: true}).click();
    await page.getByRole('main', {name: 'Courses', exact: true}).waitFor();
    const actions = page.locator('.course-card .actions').first();
    assert.deepEqual(await actions.locator('a,button').allTextContents(), ['Open course', 'View tasks']);
    assert.ok((await actions.getByRole('link', {name: 'Open course', exact: true}).getAttribute('class')).includes('primary'));
    assert.ok(!(await actions.getByRole('button', {name: 'View tasks', exact: true}).getAttribute('class') || '').includes('primary'));
  } finally {await browser.close();}
});

test('quiz review shows own answers without leaking options, assignments use fractions, files preview inline', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await setup(browser);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    const nav = page.getByRole('navigation', {name: 'Course navigation', exact: true});
    await nav.getByRole('link', {name: 'Quizzes', exact: true}).click();
    await page.getByRole('link', {name: 'Practice quiz', exact: true}).click();
    await page.getByRole('heading', {name: 'Practice quiz', exact: true}).waitFor();
    assert.equal(await page.getByText('Attempt 1', {exact: true}).count(), 1);
    assert.equal(await page.getByText('What is two plus two?', {exact: true}).count(), 1);
    assert.equal(await page.getByText('Four', {exact: true}).count(), 1);
    assert.equal(await page.getByText('Five', {exact: true}).count(), 0, 'unselected options never render');
    assert.equal(await page.getByText('secret-correct-marker', {exact: true}).count(), 0, 'correctness markers never render');
    assert.equal(await page.getByText('secret-wrong-marker', {exact: true}).count(), 0);
    assert.equal(await page.getByText('Well done reading.', {exact: true}).count(), 1);
    await nav.getByRole('link', {name: 'Assignments', exact: true}).click();
    await page.locator('.course-grade-fraction').first().waitFor();
    assert.equal(await page.locator('.course-grade-fraction').first().textContent(), '0/20');
    assert.equal(await page.locator('.course-body').getByText('Grade:', {exact: false}).count(), 0, 'assignment rows use fractions, not grade labels');
    await nav.getByRole('link', {name: 'Files', exact: true}).click();
    await page.getByRole('link', {name: 'Photo.png', exact: true}).click();
    assert.equal(await page.locator('img.course-file-image').count(), 1);
    await nav.getByRole('link', {name: 'Files', exact: true}).click();
    await page.getByRole('link', {name: 'Notes.txt', exact: true}).click();
    await page.locator('.course-file-text').waitFor();
    assert.match(await page.locator('.course-file-text').textContent(), /Hello file contents/);
    assert.equal(await page.getByRole('link', {name: 'Download file', exact: true}).count(), 1);
    await nav.getByRole('link', {name: 'Files', exact: true}).click();
    await page.getByRole('link', {name: 'Reading.pdf', exact: true}).click();
    assert.equal(await page.locator('img.course-file-image').count(), 0);
    assert.equal(await page.locator('.course-file-text').count(), 0);
    assert.equal(await page.getByRole('link', {name: 'Preview / download in Original Canvas', exact: true}).count(), 1);
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('text, file and URL submissions send work to Canvas and tools launch in a new tab', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await setup(browser);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    await page.context().route('https://tool.test/**', route => route.fulfill({contentType: 'text/html', body: 'tool'}));
    await page.route('https://uploads.test/**', route => route.fulfill({status: 201, contentType: 'application/json', body: '{"id":77,"display_name":"essay.pdf"}'}));
    const [moduleTool] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByRole('button', {name: 'Launch tool in new window'}).first().click()
    ]);
    await moduleTool.waitForURL('https://tool.test/**');
    assert.deepEqual(await page.evaluate(() => window.launches), [{courseId: '34', launchType: 'module_item', moduleItemId: '4'}]);
    await moduleTool.close();
    await page.goto('https://canvas.test/courses/34/assignments/13');
    await page.getByRole('heading', {name: 'Journal', exact: true}).waitFor();
    await page.getByLabel('Submission text').fill('Hello <world> & class');
    await page.getByRole('button', {name: 'Submit text entry', exact: true}).click();
    assert.equal(await page.evaluate(() => window.submissions.length), 0, 'first click only arms the button');
    await page.getByRole('button', {name: 'Click again to confirm', exact: true}).click();
    await page.waitForFunction(() => window.submissions.length === 1);
    assert.deepEqual(await page.evaluate(() => window.submissions), [{submission_type: 'online_text_entry', body: '<p>Hello &lt;world&gt; &amp; class</p>'}]);
    await page.goto('https://canvas.test/courses/34/assignments/14');
    await page.getByRole('heading', {name: 'Report', exact: true}).waitFor();
    await page.getByLabel('Choose files to submit').setInputFiles({name: 'essay.pdf', mimeType: 'application/pdf', buffer: Buffer.from('hello')});
    await page.getByRole('button', {name: 'Submit files', exact: true}).click();
    await page.getByRole('button', {name: 'Click again to confirm', exact: true}).click();
    await page.waitForFunction(() => window.submissions.length === 1);
    assert.deepEqual(await page.evaluate(() => window.submissions), [{submission_type: 'online_upload', file_ids: ['77']}]);
    await page.goto('https://canvas.test/courses/34/assignments/16');
    await page.getByRole('heading', {name: 'Link', exact: true}).waitFor();
    await page.getByLabel('Website URL to submit').fill('example.com/work');
    await page.getByRole('button', {name: 'Submit URL', exact: true}).click();
    await page.getByRole('button', {name: 'Click again to confirm', exact: true}).click();
    await page.waitForFunction(() => window.submissions.length === 1);
    assert.deepEqual(await page.evaluate(() => window.submissions), [{submission_type: 'online_url', url: 'example.com/work'}], 'scheme normalization happens in the API layer, covered by unit tests');
    await page.goto('https://canvas.test/courses/34/assignments/15');
    await page.getByRole('heading', {name: 'Homework', exact: true}).waitFor();
    assert.equal(await page.locator('iframe.course-quiz-frame').count(), 0, 'external tools are never embedded');
    const [assessmentTool] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByRole('button', {name: 'Open tool in new window', exact: true}).click()
    ]);
    await assessmentTool.waitForURL('https://tool.test/**');
    assert.deepEqual(await page.evaluate(() => window.launches[0]), {courseId: '34', launchType: 'assessment', assessmentId: '15'});
    await assessmentTool.close();
    await page.getByRole('link', {name: 'Browse all quizzes', exact: true}).click();
    await page.locator('.course-body').getByRole('heading', {name: 'Quizzes', exact: true}).waitFor();
    assert.equal(new URL(page.url()).pathname, '/courses/34/quizzes');
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('assignment pages keep one Original Canvas exit, custom file picker, and submit-first ordering', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await setup(browser);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    await page.goto('https://canvas.test/courses/34/assignments/13');
    await page.getByRole('heading', {name: 'Journal', exact: true}).waitFor();
    assert.equal(await page.getByRole('link', {name: 'Open this page in Original Canvas', exact: true}).count(), 0);
    const submitTop = await page.getByRole('heading', {name: 'Submit work', exact: true}).boundingBox();
    const feedbackTop = await page.getByRole('heading', {name: 'Submission and feedback', exact: true}).boundingBox();
    assert.ok(submitTop.y < feedbackTop.y, 'Submit work comes before Submission and feedback');
    await page.goto('https://canvas.test/courses/34/assignments/12');
    await page.getByRole('heading', {name: 'Essay', exact: true}).waitFor();
    assert.equal(await page.getByText('Canvas deadline', {exact: false}).count(), 0);
    assert.equal(await page.getByText('Deadline:', {exact: false}).count(), 1);
    const sectionOrder = await page.evaluate(() => [...document.querySelector('#canvas-local-root').shadowRoot.querySelectorAll('.course-body h3')].map(heading => heading.textContent));
    assert.deepEqual(sectionOrder.filter(title => ['Submit work', 'Submission and feedback', 'Local task'].includes(title)), ['Submit work', 'Submission and feedback', 'Local task']);
    await page.goto('https://canvas.test/courses/34/assignments/14');
    await page.getByRole('heading', {name: 'Report', exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Choose files', exact: true}).isVisible(), true);
    assert.equal(await page.getByLabel('Choose files to submit').isHidden(), true, 'OS file input stays hidden behind the custom button');
    await page.evaluate(() => {
      const input = document.querySelector('#canvas-local-root').shadowRoot.querySelector('input[type=file]');
      const transfer = new DataTransfer();
      transfer.items.add(new File(['hello'], 'essay.pdf', {type: 'application/pdf'}));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    });
    assert.match(await page.locator('.course-file-list').textContent(), /essay\.pdf/);
    await page.goto('https://canvas.test/courses/34/quizzes/9');
    await page.getByRole('heading', {name: 'Practice quiz', exact: true}).waitFor();
    assert.equal(await page.getByRole('link', {name: 'Open this page in Original Canvas', exact: true}).count(), 0, 'other course pages keep no header handoff either');
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('quiz taking starts an attempt, saves answers, and submits with confirm', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await setup(browser);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    await page.goto('https://canvas.test/courses/34/quizzes/9');
    await page.getByRole('heading', {name: 'Practice quiz', exact: true}).waitFor();
    assert.equal(await page.getByText('1 of 2 attempts taken.', {exact: false}).count(), 1);
    await page.evaluate(() => {window.requireCode = true;});
    await page.getByRole('button', {name: 'Begin', exact: true}).click();
    await page.getByLabel('Quiz access code').fill('open-sesame');
    await page.getByRole('button', {name: 'Begin with access code', exact: true}).click();
    await page.getByRole('heading', {name: 'Taking attempt 2', exact: true}).waitFor();
    assert.equal(await page.locator('.course-quiz-timer').count(), 1, 'remaining time stays visible while taking');
    assert.equal(await page.locator('.course-take').getByText('What is two plus two?', {exact: true}).count(), 1);
    await page.getByRole('radio', {name: 'Four', exact: true}).check();
    await page.getByLabel('Explain').fill('Because arithmetic.');
    await page.getByRole('button', {name: 'Save answers', exact: true}).click();
    await page.getByText('Answers saved', {exact: false}).waitFor();
    assert.deepEqual(await page.evaluate(() => window.quizCalls.filter(call => call.action === 'quizAnswer').map(call => call.take.answers)), [[{id: 101, answer: 5}, {id: 102, answer: 'Because arithmetic.'}]]);
    await page.getByRole('button', {name: 'Submit quiz', exact: true}).click();
    await page.getByRole('button', {name: 'Click again to confirm', exact: true}).click();
    await page.getByRole('heading', {name: 'Attempt submitted', exact: true}).waitFor();
    assert.equal(await page.getByText('Score: 8', {exact: true}).count(), 1);
    assert.ok(await page.evaluate(() => window.quizCalls.some(call => call.action === 'quizComplete')));
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('quiz assignments redirect to the quiz, attempts use grade fractions, in-progress attempts resume', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await setup(browser);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    const historyLength = await page.evaluate(() => history.length);
    await page.goto('https://canvas.test/courses/34/assignments/17');
    await page.getByRole('heading', {name: 'Practice quiz', exact: true}).waitFor();
    assert.equal(new URL(page.url()).pathname, '/courses/34/quizzes/9');
    assert.equal(await page.evaluate(() => history.length), historyLength + 1, 'the assignment page never lands in history');
    assert.equal(await page.locator('.course-grade-fraction').first().textContent(), '8/10');
    await page.goto('https://canvas.test/courses/34/assignments/12');
    await page.getByRole('heading', {name: 'Essay', exact: true}).waitFor();
    assert.equal(await page.locator('.course-record-grade .course-grade-fraction').first().textContent(), '0/20');
    assert.equal(await page.getByText('Score:', {exact: false}).count(), 0, 'score labels give way to fractions');
    await page.goto('https://canvas.test/courses/34/quizzes/10');
    await page.getByRole('heading', {name: 'Resumable quiz', exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Resume attempt 2', exact: true}).count(), 1);
    assert.equal(await page.getByRole('button', {name: 'Begin', exact: true}).count(), 0, 'no new attempt starts while one is in progress');
    await page.getByRole('button', {name: 'Resume attempt 2', exact: true}).click();
    await page.getByRole('heading', {name: 'Taking attempt 2', exact: true}).waitFor();
    await page.getByRole('radio', {name: 'Four', exact: true}).check();
    await page.getByRole('button', {name: 'Save answers', exact: true}).click();
    await page.getByText('Answers saved', {exact: false}).waitFor();
    assert.equal(await page.evaluate(() => window.quizCalls.find(call => call.action === 'quizAnswer').take.qsId), '42', 'resumed session answers the in-progress submission');
    await page.getByRole('button', {name: 'Submit quiz', exact: true}).click();
    await page.getByRole('button', {name: 'Click again to confirm', exact: true}).click();
    await page.getByRole('heading', {name: 'Attempt submitted', exact: true}).waitFor();
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('browser tab title follows workspace navigation', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await setup(browser);
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    assert.equal(await page.title(), 'Modules - English');
    await page.goto('https://canvas.test/courses/34/assignments/12');
    await page.getByRole('heading', {name: 'Essay', exact: true}).waitFor();
    assert.equal(await page.title(), 'Essay - English');
    await page.getByRole('button', {name: 'Tasks', exact: true}).click();
    await page.getByRole('main', {name: 'Tasks', exact: true}).waitFor();
    assert.equal(await page.title(), 'Tasks', 'leaving a course page must not keep its title');
  } finally {await browser.close();}
});

test('tool-delivered quizzes get a quiz launch instead of a generic tool handoff', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await setup(browser);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    await page.context().route('https://tool.test/**', route => route.fulfill({contentType: 'text/html', body: 'tool'}));
    await page.goto('https://canvas.test/courses/34/assignments/18');
    await page.getByRole('heading', {name: 'Tool quiz', exact: true}).waitFor();
    assert.equal(new URL(page.url()).pathname, '/courses/34/assignments/18', 'stays put when no workspace quiz matches');
    assert.equal(await page.getByRole('link', {name: 'Open quiz', exact: true}).count(), 0);
    assert.equal(await page.getByRole('button', {name: 'Launch tool in new window', exact: true}).count(), 0);
    const [toolPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByRole('button', {name: 'Take quiz in new window', exact: true}).click()
    ]);
    await toolPage.waitForURL('https://tool.test/**');
    assert.deepEqual(await page.evaluate(() => window.launches[0]), {courseId: '34', launchType: 'assessment', assessmentId: '18'});
    await toolPage.close();
    await page.goto('https://canvas.test/courses/34/assignments/19');
    await page.getByRole('heading', {name: 'Practice quiz', exact: true}).waitFor();
    assert.equal(new URL(page.url()).pathname, '/courses/34/quizzes/9', 'unflagged quiz assignments redirect by linkage');
    await page.goto('https://canvas.test/courses/34/assignments/20');
    await page.getByRole('heading', {name: 'New Quiz', exact: true}).waitFor();
    assert.equal(new URL(page.url()).pathname, '/courses/34/assignments/20', 'New Quizzes stay on the assignment page');
    assert.equal(await page.getByText('Watch the video first.', {exact: true}).count(), 1, 'New Quiz instructions render inline');
    assert.equal(await page.getByText('external website', {exact: false}).count(), 0, 'no generic tool copy for New Quizzes');
    const frame = page.locator('iframe.course-quiz-frame');
    await frame.waitFor();
    assert.ok((await frame.getAttribute('src') || '').startsWith('https://tool.test/'), 'the quiz player embeds in the workspace');
    const [newQuizTool] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByRole('link', {name: 'Open quiz in new window', exact: true}).click()
    ]);
    await newQuizTool.waitForURL('https://tool.test/**');
    assert.deepEqual(await page.evaluate(() => window.launches.at(-1)), {courseId: '34', launchType: 'assessment', assessmentId: '20'});
    await newQuizTool.close();
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
});

test('reload reopens the workspace after Escape, which no longer opts out', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await setup(browser);
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name: 'Actually Better Canvas', exact: true}).waitFor();
    assert.equal(await page.locator('.workspace').isVisible(), false);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('actually-better-canvas-mode')), 'workspace', 'Escape closes without choosing Original Canvas');
    await page.goto('https://canvas.test/courses/34');
    await page.getByRole('heading', {name: 'Week one', exact: true}).waitFor();
    assert.equal(await page.locator('.workspace').isVisible(), true, 'reload restores the workspace');
  } finally {await browser.close();}
});

test('instructor HTML is rebuilt safely while preserving rich text, math and course links', {skip}, async () => {
  const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({content: workspace});
    const result = await page.evaluate(() => {
      const html = '<h2 onclick="window.pwned=1">Lesson</h2><p><strong>Important</strong> <em>reading</em></p><table><tr><td colspan="2">Cell</td></tr></table><script>window.pwned=1</script><style>body{display:none}</style><img src="javascript:alert(1)" onerror="window.pwned=1"><svg onload="window.pwned=1"></svg><form action="/submit"><input></form><a href="javascript:alert(1)">Bad link</a><a href="https://canvas.test/courses/34/pages/reading">Reading</a><iframe src="https://media.test/video" title="Lecture"></iframe><math><mfrac><mi>x</mi><mn>2</mn></mfrac></math>';
      const rich = window.CanvasCourseWorkspace.richText(html, 'https://canvas.test/courses/34/pages/lesson', (href, text) => {const a = document.createElement('a'); a.href = href; a.textContent = text; return a;});
      document.body.append(rich);
      return {unsafe: rich.querySelectorAll('script,style,iframe,svg,form,input,[onclick],[onerror],[onload]').length, strong: rich.querySelector('strong').textContent, span: rich.querySelector('td').getAttribute('colspan'), math: rich.querySelector('mfrac').namespaceURI, links: [...rich.querySelectorAll('a')].map(a => a.href), pwned: Boolean(window.pwned)};
    });
    assert.equal(result.unsafe, 0);
    assert.equal(result.strong, 'Important');
    assert.equal(result.span, '2');
    assert.equal(result.math, 'http://www.w3.org/1998/Math/MathML');
    assert.deepEqual(result.links, ['https://canvas.test/courses/34/pages/reading', 'https://media.test/video']);
    assert.equal(result.pwned, false);
  } finally {await browser.close();}
});
