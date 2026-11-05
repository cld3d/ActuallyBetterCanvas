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
        if (id) result.item = item; else result.items = [item];
        result.enrollments = [{grades: {current_score: 87.4}}];
      }
      if (kind === 'quizzes') {
        if (id) {
          result.item = {id: 9, title: 'Practice quiz', description: '<p>Review chapter one.</p>', time_limit: 30, allowed_attempts: 2};
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
    assert.equal(await page.getByRole('link', {name: 'Open this page in Original Canvas', exact: true}).isVisible(), true);
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
