import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../extension/course-routes.js', import.meta.url), 'utf8');
const context = vm.createContext({URL, location: {origin: 'https://canvas.test'}});
vm.runInContext(source, context);
const parse = input => context.CanvasCourseRoutes.parse(input);

test('course route allowlist handles lists, details, slugs, syllabus and file previews', () => {
  for (const [path, kind, id] of [
    ['/courses/34', 'home', null], ['/courses/34/', 'home', null], ['/courses/34/modules', 'modules', null],
    ['/courses/34/modules/7', 'modules', '7'], ['/courses/34/assignments/12?module_item_id=7', 'assignments', '12'],
    ['/courses/34/quizzes/9', 'quizzes', '9'], ['/courses/34/pages/week%201', 'pages', 'week 1'],
    ['/courses/34/assignments/syllabus', 'syllabus', null], ['/courses/34/discussion_topics/11', 'discussions', '11'],
    ['/courses/34/announcements', 'announcements', null], ['/courses/34/files?preview=5', 'files', '5'],
    ['/courses/34/files/5', 'files', '5'], ['/courses/34/grades', 'grades', null], ['/courses/34/users', 'people', null],
    ['/courses/34/assignments/13980248/launch', 'assignments', '13980248'],
    ['/courses/34/assignments/13980248/taking/292921', 'assignments', '13980248'],
    ['/courses/34/assignments/12/submissions/42', 'assignments', '12'],
    ['/courses/34/quizzes/9/take', 'quizzes', '9'],
    ['/courses/34/modules/items/7', 'modules', null]
  ]) {
    const result = parse(path);
    assert.equal(result?.courseId, '34', path);
    assert.equal(result.kind, kind, path);
    assert.equal(result.id, id, path);
    assert.equal(result.path, path);
  }
});

test('interactive, editing, external and unsafe routes remain original Canvas', () => {
  for (const path of ['/courses', '/courses/34/assignments/new', '/courses/34/assignments/12/submit',
    '/courses/34/quizzes/9/history', '/courses/34/quizzes/9/statistics', '/courses/34/pages/new', '/courses/34/pages/week-1/edit',
    '/courses/34/external_tools/5', '/courses/34/files/5/download', '/courses/34/grades/42',
    '/courses/34/pages/week%2Fsecret', '/courses/34/pages/%00', '/courses/34/files?preview=bad',
    'https://evil.test/courses/34', 'javascript:alert(1)']) assert.equal(parse(path), null, path);
});
