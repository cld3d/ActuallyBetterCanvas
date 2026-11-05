import {pages, verifyWorkspaceIdentity} from './api.mjs';

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
  if (view === 'quizzes') return id != null ? {...result, item: await object(`${base}/quizzes/${id}`, id)} : {...result, items: await list(base + '/quizzes')};
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
