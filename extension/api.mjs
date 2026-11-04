export function submitted(submission) {
  // Grading, an attempt count, or opening a quiz is NOT proof of submission.
  return Boolean(submission?.submitted_at) || ['submitted', 'pending_review'].includes(submission?.workflow_state);
}

export function nextPage(header, origin) {
  for (const part of (header || '').split(/,\s*(?=<)/)) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (!match) continue;
    const url = new URL(match[1], origin);
    if (url.origin !== origin || !url.pathname.startsWith('/api/v1/')) throw new Error('Unsafe Canvas pagination URL.');
    return url.href;
  }
  return null;
}

export async function pages(origin, path, fetcher = fetch) {
  let url = new URL(path, origin).href;
  const result = [], visited = new Set();
  while (url) {
    if (visited.has(url) || visited.size >= 1000) throw new Error('Canvas pagination did not finish. Previous feed retained.');
    visited.add(url);
    const response = await fetcher(url, {credentials: 'include', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error([401, 403].includes(response.status) ? 'Sign in to Canvas to resume sync.' : `Canvas returned ${response.status}. Previous feed retained.`);
    if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Sign in to Canvas to resume sync.');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Unexpected Canvas response. Previous feed retained.');
    result.push(...data);
    url = nextPage(response.headers.get('link'), origin);
  }
  return result;
}

export async function collect(origin, fetcher = fetch) {
  const response = await fetcher(origin + '/api/v1/users/self/profile', {credentials: 'include', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000)});
  if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Sign in to Canvas to resume sync.');
  const profile = await response.json();
  if (!profile.id) throw new Error('Canvas did not return your user ID.');
  const courses = await pages(origin, '/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=100', fetcher);
  const assignments = [];
  // Serial per-course fetches avoid hammering school rate limits. Commit only a complete snapshot.
  for (const course of courses) {
    if (!course.id || !course.name || course.access_restricted_by_date) throw new Error('An active course is inaccessible. Previous feed retained.');
    const items = await pages(origin, `/api/v1/courses/${course.id}/assignments?include[]=submission&override_assignment_dates=true&per_page=100`, fetcher);
    for (const item of items) {
      if (item.published === false) continue;
      if (!Object.hasOwn(item, 'submission')) throw new Error('Canvas omitted submission status. Previous feed retained.');
      assignments.push({id: String(item.id), courseId: String(course.id), course: course.name,
        title: item.name, canvasDue: item.due_at || null, submitted: submitted(item.submission),
        graded: item.submission?.graded_at != null || item.submission?.score != null});
    }
  }
  return {action: 'sync', origin, user: String(profile.id), assignments};
}

// Supplementary workspace data is read on demand, never part of an assignment snapshot.
export async function workspaceRead(origin, identity, action, id, fetcher = fetch) {
  if (!identity) throw new Error('Sync your assignments before opening courses or inbox.');
  const options = {credentials: 'include', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000)};
  const profileResponse = await fetcher(origin + '/api/v1/users/self/profile', options);
  if (!profileResponse.ok || !(profileResponse.headers.get('content-type') || '').includes('application/json')) throw new Error('Sign in to Canvas to read your workspace.');
  const profile = await profileResponse.json();
  if (!profile.id || identity !== origin + '/' + profile.id) throw new Error('Different Canvas account detected. Your workspace was kept unchanged.');
  if (action === 'courses') return {courses: await pages(origin, '/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=100', fetcher)};
  if (action === 'inbox') return {conversations: await pages(origin, '/api/v1/conversations?per_page=100', fetcher)};
  if (action !== 'conversation' || !/^\d+$/.test(String(id))) throw new Error('Invalid conversation request.');
  // Canvas defaults to marking a conversation read on GET. Explicitly opt out.
  const response = await fetcher(`${origin}/api/v1/conversations/${id}?auto_mark_as_read=false`, options);
  if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Could not read this conversation. Check your Canvas sign-in.');
  const conversation = await response.json();
  if (String(conversation.id) !== String(id) || !Array.isArray(conversation.messages)) throw new Error('Unexpected Canvas conversation response.');
  return {conversation};
}
