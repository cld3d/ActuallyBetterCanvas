import {nextPage, pages, verifyWorkspaceIdentity} from './api.mjs';

const kinds = new Set(['home', 'modules', 'assignments', 'quizzes', 'pages', 'announcements', 'discussions', 'files', 'syllabus', 'grades', 'people']);

// Only explicit read endpoints are accepted. No page-supplied URL is ever fetched.
export async function courseRead(origin, identity, request, fetcher = fetch) {
  const {courseId, kind, id} = request || {};
  if (!/^\d+$/.test(String(courseId)) || !kinds.has(kind) || (id != null &&
      (kind === 'pages' ? !/^[^/\\?#\u0000-\u001f]+$/.test(String(id)) || ['.', '..', 'new', 'edit'].includes(String(id)) : !/^\d+$/.test(String(id))))) throw new Error('Invalid course request.');
  if (id != null && !['modules', 'assignments', 'quizzes', 'pages', 'discussions', 'files'].includes(kind)) throw new Error('Invalid course detail request.');
  const profile = await verifyWorkspaceIdentity(origin, identity, fetcher);
  const base = `/api/v1/courses/${courseId}`;
  async function object(path, expectedId) {
    const response = await fetcher(origin + path, {credentials: 'include', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to Canvas to read this course.' : response.status === 403 ? 'Canvas has restricted access to this content.' : response.status === 404 ? 'This content is unavailable or has been removed.' : `Canvas returned ${response.status}. Try again.`);
    if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Sign in to Canvas to read this course.');
    const data = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data) || (expectedId != null && String(data.id) !== String(expectedId))) throw new Error('Unexpected Canvas course response.');
    return data;
  }
  const list = path => pages(origin, path + (path.includes('?') ? '&' : '?') + 'per_page=100', fetcher);
  function fail(response) {
    throw new Error(response.status === 401 ? 'Sign in to Canvas to read this course.' : response.status === 403 ? 'Canvas has restricted access to this content.' : response.status === 404 ? 'This content is unavailable or has been removed.' : `Canvas returned ${response.status}. Try again.`);
  }
  // Some read endpoints wrap arrays in a named envelope instead of returning a bare list.
  async function envelope(path, key) {
    const out = [];
    let url = path.startsWith('http') ? path : origin + path;
    const visited = new Set();
    while (url) {
      if (visited.has(url) || visited.size >= 100) throw new Error('Canvas pagination did not finish.');
      visited.add(url);
      const response = await fetcher(url, {credentials: 'include', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000)});
      if (!response.ok) fail(response);
      if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Sign in to Canvas to read this course.');
      const data = await response.json();
      if (!data || typeof data !== 'object' || !Array.isArray(data[key])) throw new Error('Unexpected Canvas course response.');
      out.push(...data[key]);
      url = nextPage(response.headers.get('link'), origin);
    }
    return out;
  }
  const course = await object(base + '?include[]=syllabus_body&include[]=total_scores', courseId);
  const tabs = await list(base + '/tabs');
  if (course.access_restricted_by_date) throw new Error('This course is not available yet.');
  let view = kind;
  if (kind === 'home') view = {wiki: 'front_page', modules: 'modules', assignments: 'assignments', syllabus: 'syllabus', feed: 'activity'}[course.default_view] || 'activity';
  const result = {course, tabs, view};
  if (view === 'syllabus') return result;
  if (view === 'activity') return {...result, items: await list(base + '/activity_stream')};
  if (view === 'front_page') return {...result, item: await object(base + '/front_page')};
  if (view === 'modules') {
    const modules = id != null ? [await object(base + '/modules/' + id, id)] : await list(base + '/modules');
    for (const module of modules) {
      if (!/^\d+$/.test(String(module.id))) throw new Error('Unexpected Canvas module response.');
      // Never rely on include[]=items: Canvas may truncate/omit large modules.
      module.items = module.state === 'locked' ? [] : await list(`${base}/modules/${module.id}/items?include[]=content_details`);
    }
    return {...result, items: modules};
  }
  if (view === 'assignments') return id != null ? {...result, item: await object(`${base}/assignments/${id}?include[]=submission&override_assignment_dates=true`, id)} : {...result, items: await list(base + '/assignments?include[]=submission&override_assignment_dates=true')};
  if (view === 'quizzes') {
    if (id == null) return {...result, items: await list(base + '/quizzes')};
    const item = await object(`${base}/quizzes/${id}`, id);
    // Quiz attempts and question review are best-effort: the description and
    // handoff must still render when review is restricted or unavailable.
    let quizAttempts = [], quizQuestions = null, quizReviewAttempt = null;
    try {
      const submissions = await envelope(`${base}/quizzes/${id}/submissions?include[]=submission&per_page=100`, 'quiz_submissions');
      quizAttempts = submissions.filter(s => s && /^\d+$/.test(String(s.id)) && String(s.quiz_id) === String(id) && String(s.user_id) === String(profile.id)).sort((a, b) => (a.attempt || 0) - (b.attempt || 0));
      const latest = [...quizAttempts].reverse().find(s => s.workflow_state === 'complete' || s.workflow_state === 'pending_review') || quizAttempts[quizAttempts.length - 1];
      if (latest) {
        try {
          quizQuestions = await envelope(`/api/v1/quiz_submissions/${latest.id}/questions?include[]=quiz_question&per_page=100`, 'quiz_submission_questions');
          quizReviewAttempt = latest.attempt;
        } catch {quizQuestions = null;}
      }
    } catch {quizAttempts = [];}
    return {...result, item, quizAttempts, quizQuestions, quizReviewAttempt};
  }
  if (view === 'pages') return id != null ? {...result, item: await object(base + '/pages/' + encodeURIComponent(id))} : {...result, items: await list(base + '/pages')};
  if (view === 'announcements' || view === 'discussions') {
    if (id == null) return {...result, items: await list(base + '/discussion_topics' + (view === 'announcements' ? '?only_announcements=true' : ''))};
    const item = await object(`${base}/discussion_topics/${id}`, id);
    // Do not bypass initial-post or locked discussion gates.
    const discussion = !item.locked_for_user && item.user_can_see_posts !== false ? await object(`${base}/discussion_topics/${id}/view`) : null;
    return {...result, item, discussion};
  }
  if (view === 'files') return id != null ? {...result, item: await object(`${base}/files/${id}`, id)} : {...result, items: await list(base + '/files?sort=display_name&order=asc')};
  if (view === 'people') return {...result, items: await list(base + '/users?include[]=enrollments')};
  if (view === 'grades') return {...result, enrollments: await list(base + '/enrollments?user_id=' + encodeURIComponent(profile.id)), items: await list(base + '/assignments?include[]=submission&override_assignment_dates=true')};
  throw new Error('Unsupported course page.');
}

// Fetches a small text preview of a course file. The URL must be a
// same-origin Canvas download URL for the requested file; nothing else loads.
export async function courseFileRead(origin, identity, route, url, fetcher = fetch) {
  const {courseId, kind, id} = route || {};
  if (!/^\d+$/.test(String(courseId)) || kind !== 'files' || !/^\d+$/.test(String(id))) throw new Error('Invalid file request.');
  await verifyWorkspaceIdentity(origin, identity, fetcher);
  let parsed;
  try {parsed = new URL(url, origin);} catch {throw new Error('Invalid file URL.');}
  if (parsed.origin !== origin || parsed.username || parsed.password) throw new Error('Invalid file URL.');
  const match = parsed.pathname.match(/^\/(?:courses\/(\d+)\/files\/(\d+)|files\/(\d+))\/download\/?$/);
  if (!match || (match[1] && match[1] !== String(courseId)) || String(match[2] || match[3]) !== String(id)) throw new Error('Invalid file URL.');
  const response = await fetcher(parsed.href, {credentials: 'include', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to Canvas to read this course.' : response.status === 403 ? 'Canvas has restricted access to this content.' : response.status === 404 ? 'This content is unavailable or has been removed.' : `Canvas returned ${response.status}. Try again.`);
  const contentType = response.headers.get('content-type') || '';
  if (!/^(text\/|application\/json)/.test(contentType)) throw new Error('This file type cannot be previewed here.');
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > 300000) throw new Error('This file is too large to preview here.');
  const text = await response.text();
  const cap = 50000;
  return {text: text.slice(0, cap), truncated: text.length > cap, contentType};
}
