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
  // Some read endpoints wrap arrays in a named envelope instead of returning a bare list.
  async function envelope(path, key) {
    return envelopeList(origin, path, key, fetcher);
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
  if (view === 'assignments') {
    if (id == null) return {...result, items: await list(base + '/assignments?include[]=submission&override_assignment_dates=true')};
    const item = await object(`${base}/assignments/${id}?include[]=submission&override_assignment_dates=true`, id);
    // Link quiz assignments to their workspace quiz when the pairing is visible.
    // Match by linkage, not by flag: Canvas does not always set is_quiz_assignment.
    // New Quizzes reuse ids from a different table, so they must never be
    // started through the classic quiz endpoints.
    let quizId = null;
    let newQuiz = null;
    if (item.is_quiz_assignment || (item.submission_types || []).some(type => ['online_quiz', 'external_tool'].includes(type))) {
      try {
        const match = (await list(base + '/quizzes')).find(quiz => String(quiz.assignment_id) === String(id));
        if (match) {
          const isNewQuiz = /quizzes\.next|new_quiz/i.test(String(match.quiz_type || '')) || match.quiz_lti === true;
          if (isNewQuiz) newQuiz = match;
          else if (/^\d+$/.test(String(match.id))) quizId = String(match.id);
        }
      } catch {quizId = null;}
    }
    // Tool-backed assignments without a classic quiz may still be New Quizzes,
    // which expose a read API but can only be taken inside the quiz player.
    if (!quizId && !newQuiz && (item.submission_types || []).includes('external_tool')) {
      try {
        const fetched = await object(`/api/quiz/v1/courses/${courseId}/quizzes/${id}`, null);
        if (fetched && (fetched.id != null || typeof fetched.title === 'string')) newQuiz = fetched;
      } catch {newQuiz = null;}
    }
    return {...result, item, quizId, newQuiz};
  }
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

// Explicit student-initiated writes. Every entry point validates fixed shapes
// against the route; nothing page-supplied is ever used as a URL or echoed
// into parameters beyond these allowlists.
function checkWriteIds(courseId, id) {
  if (!/^\d+$/.test(String(courseId)) || !/^\d+$/.test(String(id))) throw new Error('Invalid course request.');
}

// Canvas explains most refusals in the response body. Read a short, plain-text
// reason so the workspace can show why instead of a bare status code.
async function statusMessage(response) {
  try {
    const type = response.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      const data = await response.json();
      const errors = Array.isArray(data?.errors) ? data.errors : [];
      const first = errors.find(entry => entry && typeof entry.message === 'string') || (typeof data?.message === 'string' ? data : null);
      if (first) return String(first.message).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    }
  } catch {}
  return '';
}

async function failStatus(response) {
  if (response.status === 401) throw new Error('Sign in to Canvas to read this course.');
  if (response.status === 403) throw new Error('Canvas has restricted access to this content.');
  if (response.status === 404) throw new Error('This content is unavailable or has been removed.');
  const detail = await statusMessage(response);
  throw new Error(`Canvas returned ${response.status}${detail ? ': ' + detail : ''}. Try again.`);
}

async function postJSON(origin, path, body, fetcher) {
  const payload = JSON.stringify(body);
  if (payload.length > 500000) throw new Error('Submission is too large.');
  const response = await fetcher(origin + path, {method: 'POST', headers: {'content-type': 'application/json', accept: 'application/json'}, credentials: 'include', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000), body: payload});
  if (!response.ok) await failStatus(response);
  if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Sign in to Canvas to read this course.');
  const data = await response.json();
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Unexpected Canvas course response.');
  return data;
}

async function getObject(origin, path, fetcher) {
  const response = await fetcher(origin + path, {credentials: 'include', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000)});
  if (!response.ok) await failStatus(response);
  if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Sign in to Canvas to read this course.');
  const data = await response.json();
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Unexpected Canvas course response.');
  return data;
}

export async function submitAssignment(origin, identity, route, submission, fetcher = fetch) {
  const {courseId, id} = route || {};
  checkWriteIds(courseId, id);
  const clean = {};
  if (submission?.submission_type === 'online_text_entry' && typeof submission.body === 'string' && submission.body.length >= 1 && submission.body.length <= 200000) {
    clean.submission_type = 'online_text_entry'; clean.body = submission.body;
  } else if (submission?.submission_type === 'online_url' && typeof submission.url === 'string' && submission.url.length <= 2048) {
    // Canvas assumes http when the scheme is omitted; match that documented behavior.
    const raw = /^[a-z][a-z0-9+.-]*:/i.test(submission.url.trim()) ? submission.url.trim() : 'http://' + submission.url.trim();
    let parsed;
    try {parsed = new URL(raw);} catch {throw new Error('Enter a valid http or https URL.');}
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Enter a valid http or https URL.');
    clean.submission_type = 'online_url'; clean.url = parsed.href;
  } else if (submission?.submission_type === 'online_upload' && Array.isArray(submission.file_ids) && submission.file_ids.length >= 1 && submission.file_ids.length <= 20 && submission.file_ids.every(fileId => /^\d+$/.test(String(fileId)))) {
    clean.submission_type = 'online_upload'; clean.file_ids = submission.file_ids.map(String);
  } else throw new Error('Invalid submission.');
  await verifyWorkspaceIdentity(origin, identity, fetcher);
  const data = await postJSON(origin, `/api/v1/courses/${courseId}/assignments/${id}/submissions`, {submission: clean}, fetcher);
  if (String(data.assignment_id) !== String(id)) throw new Error('Unexpected Canvas course response.');
  return {submission: data};
}

export async function submissionUploadInit(origin, identity, route, file, fetcher = fetch) {
  const {courseId, id} = route || {};
  checkWriteIds(courseId, id);
  if (!file || typeof file.name !== 'string' || file.name.length < 1 || file.name.length > 255 || /[/\\\0]/.test(file.name)) throw new Error('Invalid file name.');
  if (!Number.isInteger(file.size) || file.size < 1 || file.size > 1073741824) throw new Error('Invalid file size.');
  if (typeof file.content_type !== 'string' || !/^[\w.+-]+\/[\w.+-]+$/.test(file.content_type) || file.content_type.length > 128) throw new Error('Invalid file type.');
  await verifyWorkspaceIdentity(origin, identity, fetcher);
  const data = await postJSON(origin, `/api/v1/courses/${courseId}/assignments/${id}/submissions/self/files`, {name: file.name, size: file.size, content_type: file.content_type}, fetcher);
  let uploadURL;
  try {uploadURL = new URL(data.upload_url);} catch {throw new Error('Unexpected Canvas course response.');}
  if (!['https:', 'http:'].includes(uploadURL.protocol) || uploadURL.username || uploadURL.password || typeof data.upload_params !== 'object' || !data.upload_params || Array.isArray(data.upload_params) || Object.keys(data.upload_params).length > 50) throw new Error('Unexpected Canvas course response.');
  return {uploadUrl: uploadURL.href, uploadParams: data.upload_params};
}

export async function submissionUploadPut(uploadUrl, uploadParams, file, fetcher = fetch) {
  let parsed;
  try {parsed = new URL(uploadUrl);} catch {throw new Error('Invalid upload destination.');}
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Invalid upload destination.');
  if (!uploadParams || typeof uploadParams !== 'object' || Array.isArray(uploadParams) || Object.keys(uploadParams).length > 50) throw new Error('Invalid upload parameters.');
  const {name, type, data} = file || {};
  if (typeof name !== 'string' || name.length < 1 || name.length > 255 || /[/\\\0]/.test(name)) throw new Error('Invalid file name.');
  if (typeof data !== 'string' || !data.length) throw new Error('No file data to upload.');
  let bytes;
  try {bytes = Uint8Array.from(atob(data), character => character.charCodeAt(0));} catch {throw new Error('No file data to upload.');}
  if (!bytes.length) throw new Error('No file data to upload.');
  const form = new FormData();
  for (const [key, value] of Object.entries(uploadParams)) form.append(key, String(value));
  form.append('file', new Blob([bytes], {type: typeof type === 'string' && type ? type : 'application/octet-stream'}), name);
  // The signed destination is not on the Canvas origin, so the service worker
  // performs the write instead of the page, which Canvas's CSP would block.
  const post = await fetcher(parsed.href, {method: 'POST', body: form, redirect: 'follow', signal: AbortSignal.timeout(120000)});
  if (!post.ok && !(post.status >= 300 && post.status < 400)) throw new Error(`Upload failed (status ${post.status}). Try Original Canvas.`);
  let payload = null;
  try {payload = await post.json();} catch {}
  if (!payload || !/^\d+$/.test(String(payload.id))) {
    const location = post.headers.get('location');
    if (!location) throw new Error('Upload did not complete. Try Original Canvas.');
    let next;
    try {next = new URL(location, parsed);} catch {throw new Error('Upload did not complete. Try Original Canvas.');}
    if (!['https:', 'http:'].includes(next.protocol) || next.username || next.password) throw new Error('Upload did not complete. Try Original Canvas.');
    const done = await fetcher(next.href, {redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000)});
    if (!done.ok) throw new Error('Upload did not complete. Try Original Canvas.');
    try {payload = await done.json();} catch {}
  }
  if (!payload || !/^\d+$/.test(String(payload.id))) throw new Error('Upload did not complete. Try Original Canvas.');
  return String(payload.id);
}

export async function toolLaunch(origin, identity, launch, fetcher = fetch) {
  const {courseId, launchType, assessmentId, moduleItemId} = launch || {};
  if (!/^\d+$/.test(String(courseId))) throw new Error('Invalid course request.');
  let query;
  if (launchType === 'assessment' && /^\d+$/.test(String(assessmentId))) query = `launch_type=assessment&assignment_id=${encodeURIComponent(assessmentId)}`;
  else if (launchType === 'module_item' && /^\d+$/.test(String(moduleItemId))) query = `launch_type=module_item&module_item_id=${encodeURIComponent(moduleItemId)}`;
  else throw new Error('Invalid tool launch request.');
  await verifyWorkspaceIdentity(origin, identity, fetcher);
  const data = await getObject(origin, `/api/v1/courses/${courseId}/external_tools/sessionless_launch?${query}`, fetcher);
  let parsed;
  try {parsed = new URL(data.url);} catch {throw new Error('Unexpected Canvas course response.');}
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Unexpected Canvas course response.');
  return {url: parsed.href, name: typeof data.name === 'string' ? data.name : 'External tool'};
}

async function envelopeList(origin, path, key, fetcher) {
  const out = [];
  let url = path.startsWith('http') ? path : origin + path;
  const visited = new Set();
  while (url) {
    if (visited.has(url) || visited.size >= 100) throw new Error('Canvas pagination did not finish.');
    visited.add(url);
    const response = await fetcher(url, {credentials: 'include', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000)});
    if (!response.ok) await failStatus(response);
    if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Sign in to Canvas to read this course.');
    const data = await response.json();
    if (!data || typeof data !== 'object' || !Array.isArray(data[key])) throw new Error('Unexpected Canvas course response.');
    out.push(...data[key]);
    url = nextPage(response.headers.get('link'), origin);
  }
  return out;
}

// Student-initiated quiz taking. Answering and completing re-verify that the
// quiz submission belongs to the signed-in student and the requested quiz.
function checkQuizIds(courseId, quizId, qsId) {
  if (!/^\d+$/.test(String(courseId)) || !/^\d+$/.test(String(quizId)) || !/^\d+$/.test(String(qsId))) throw new Error('Invalid quiz request.');
}

async function checkQuizSubmission(origin, identity, courseId, quizId, qsId, fetcher) {
  checkQuizIds(courseId, quizId, qsId);
  const profile = await verifyWorkspaceIdentity(origin, identity, fetcher);
  const data = await getObject(origin, `/api/v1/courses/${courseId}/quizzes/${quizId}/submissions/${qsId}`, fetcher);
  const submission = Array.isArray(data.quiz_submissions) ? data.quiz_submissions[0] : data;
  if (!submission || !/^\d+$/.test(String(submission.id)) || String(submission.quiz_id) !== String(quizId) || String(submission.user_id) !== String(profile.id)) throw new Error('Unexpected Canvas course response.');
  return {profile, submission};
}

function checkValidationToken(token) {
  if (typeof token !== 'string' || token.length < 1 || token.length > 4096) throw new Error('Invalid quiz session. Start a new attempt in Original Canvas.');
}

export async function quizStart(origin, identity, route, options, fetcher = fetch) {
  const {courseId, id} = route || {};
  if (!/^\d+$/.test(String(courseId)) || !/^\d+$/.test(String(id))) throw new Error('Invalid course request.');
  const accessCode = options?.access_code;
  if (accessCode != null && (typeof accessCode !== 'string' || accessCode.length > 255)) throw new Error('Invalid access code.');
  const profile = await verifyWorkspaceIdentity(origin, identity, fetcher);
  // Canvas's quiz page reopens an existing attempt instead of creating another.
  // Do the same first: creating a duplicate attempt is what Canvas rejects.
  const open = await currentAttempt(origin, profile, courseId, id, fetcher).catch(() => null);
  if (open) return open;
  let data;
  try {
    data = await postJSON(origin, `/api/v1/courses/${courseId}/quizzes/${id}/submissions`, accessCode ? {access_code: accessCode} : {}, fetcher);
  } catch (error) {
    if (!/Canvas returned 422/.test(String(error?.message))) throw error;
    const resumed = await currentAttempt(origin, profile, courseId, id, fetcher).catch(() => null);
    if (!resumed) throw error;
    return resumed;
  }
  const submission = Array.isArray(data.quiz_submissions) ? data.quiz_submissions[0] : null;
  if (!submission || !/^\d+$/.test(String(submission.id)) || String(submission.quiz_id) !== String(id)) throw new Error('Unexpected Canvas course response.');
  return {qsId: String(submission.id), attempt: submission.attempt, validationToken: typeof submission.validation_token === 'string' ? submission.validation_token : null, endAt: submission.end_at || null, workflowState: submission.workflow_state || null};
}

// Finds this student's unfinished attempt, if Canvas is holding one open.
async function currentAttempt(origin, profile, courseId, quizId, fetcher) {
  const data = await getObject(origin, `/api/v1/courses/${courseId}/quizzes/${quizId}/submission`, fetcher);
  const list = Array.isArray(data.quiz_submissions) ? data.quiz_submissions : [data];
  const current = list.find(s => s && /^\d+$/.test(String(s.id)) && String(s.quiz_id) === String(quizId) && String(s.user_id) === String(profile.id) && s.started_at && !s.finished_at);
  if (!current || typeof current.validation_token !== 'string' || !current.validation_token) return null;
  return {qsId: String(current.id), attempt: current.attempt, validationToken: current.validation_token, endAt: current.end_at || null, workflowState: current.workflow_state || null};
}

export async function quizResume(origin, identity, route, fetcher = fetch) {
  const {courseId, id} = route || {};
  if (!/^\d+$/.test(String(courseId)) || !/^\d+$/.test(String(id))) throw new Error('Invalid course request.');
  const profile = await verifyWorkspaceIdentity(origin, identity, fetcher);
  const resumed = await currentAttempt(origin, profile, courseId, id, fetcher);
  if (resumed) return resumed;
  const data = await getObject(origin, `/api/v1/courses/${courseId}/quizzes/${id}/submission`, fetcher);
  const list = Array.isArray(data.quiz_submissions) ? data.quiz_submissions : [data];
  const mine = list.find(s => s && String(s.quiz_id) === String(id) && String(s.user_id) === String(profile.id) && s.started_at && !s.finished_at);
  if (!mine) throw new Error('No attempt in progress. Begin a new attempt below.');
  throw new Error('Canvas did not share this attempt. Continue it in Original Canvas.');
}

export async function quizTakeQuestions(origin, identity, take, fetcher = fetch) {
  const {courseId, quizId, qsId} = take || {};
  await checkQuizSubmission(origin, identity, courseId, quizId, qsId, fetcher);
  const questions = await envelopeList(origin, `/api/v1/quiz_submissions/${qsId}/questions?include[]=quiz_question&per_page=100`, 'quiz_submission_questions', fetcher);
  for (const entry of questions) {
    if (!entry || !/^\d+$/.test(String(entry.id))) throw new Error('Unexpected Canvas course response.');
  }
  return {questions};
}

function checkQuizAnswers(answers) {
  if (!Array.isArray(answers) || answers.length < 1 || answers.length > 200) throw new Error('Invalid quiz answers.');
  const clean = [];
  for (const entry of answers) {
    if (!entry || !/^\d+$/.test(String(entry.id))) throw new Error('Invalid quiz answers.');
    if (entry.answer === undefined) continue;
    const answer = entry.answer;
    if (answer == null || ['string', 'number', 'boolean'].includes(typeof answer)) {clean.push({id: String(entry.id), answer}); continue;}
    if (Array.isArray(answer)) {
      if (answer.length > 100 || !answer.every(value => value == null || ['string', 'number', 'boolean'].includes(typeof value))) throw new Error('Invalid quiz answers.');
      clean.push({id: String(entry.id), answer}); continue;
    }
    if (typeof answer === 'object' && !Object.values(answer).some(value => value != null && typeof value === 'object')) {
      if (Object.keys(answer).length > 100) throw new Error('Invalid quiz answers.');
      const kept = {};
      for (const [key, value] of Object.entries(answer)) {
        if (/^[\w.+-/-]{1,64}$/.test(key) && (value == null || ['string', 'number', 'boolean'].includes(typeof value))) kept[key] = value;
      }
      clean.push({id: String(entry.id), answer: kept}); continue;
    }
    throw new Error('Invalid quiz answers.');
  }
  if (!clean.length) throw new Error('Invalid quiz answers.');
  return clean;
}

export async function quizAnswer(origin, identity, take, fetcher = fetch) {
  const {courseId, quizId, qsId, attempt, validationToken, answers} = take || {};
  checkQuizIds(courseId, quizId, qsId);
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error('Invalid quiz attempt.');
  checkValidationToken(validationToken);
  const clean = checkQuizAnswers(answers);
  await checkQuizSubmission(origin, identity, courseId, quizId, qsId, fetcher);
  const data = await postJSON(origin, `/api/v1/quiz_submissions/${qsId}/questions`, {attempt, validation_token: validationToken, quiz_questions: clean}, fetcher);
  if (!Array.isArray(data.quiz_submission_questions)) throw new Error('Unexpected Canvas course response.');
  return {answered: data.quiz_submission_questions.length};
}

export async function quizComplete(origin, identity, take, fetcher = fetch) {
  const {courseId, quizId, qsId, attempt, validationToken} = take || {};
  checkQuizIds(courseId, quizId, qsId);
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error('Invalid quiz attempt.');
  checkValidationToken(validationToken);
  await checkQuizSubmission(origin, identity, courseId, quizId, qsId, fetcher);
  const data = await postJSON(origin, `/api/v1/courses/${courseId}/quizzes/${quizId}/submissions/${qsId}/complete`, {attempt, validation_token: validationToken}, fetcher);
  const submission = Array.isArray(data.quiz_submissions) ? data.quiz_submissions[0] : null;
  if (!submission || String(submission.quiz_id) !== String(quizId)) throw new Error('Unexpected Canvas course response.');
  return {score: submission.score ?? null, keptScore: submission.kept_score ?? null, workflowState: submission.workflow_state || null, finishedAt: submission.finished_at || null};
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
