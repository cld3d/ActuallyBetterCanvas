(() => {
  const labels = {home: 'Home', modules: 'Modules', assignments: 'Assignments', quizzes: 'Quizzes', pages: 'Pages', announcements: 'Announcements', discussions: 'Discussions', files: 'Files', syllabus: 'Syllabus', grades: 'Grades', people: 'People', activity: 'Activity', front_page: 'Home'};
  const safeTags = new Set('p div span h1 h2 h3 h4 h5 h6 br hr strong b em i u s del ins sub sup ul ol li blockquote pre code table thead tbody tfoot tr th td caption dl dt dd details summary'.split(' '));
  const mathTags = new Set('math mrow mi mn mo mtext ms mspace msqrt mroot mfrac msub msup msubsup mover munder munderover mfenced mtable mtr mtd semantics annotation'.split(' '));
  const dropped = new Set(['script', 'style', 'svg', 'form', 'input', 'button', 'textarea', 'select', 'object', 'embed', 'link', 'meta', 'base', 'template']);
  function webURL(value, base = location.href) {
    try {
      const url = new URL(value, base);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url : null;
    } catch {return null;}
  }
  function element(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    node.append(...children.filter(child => child != null));
    return node;
  }
  // Rebuild instructor HTML from an allowlist. Never mount the parsed nodes, scripts,
  // styles, event handlers, forms, SVG or embedded tool frames in the workspace.
  function richText(html, base, link) {
    const container = element('div', {class: 'course-rich'});
    const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
    function copy(source, depth = 0, inLink = false) {
      if (depth > 80) return document.createTextNode(source.textContent || '');
      if (source.nodeType === Node.TEXT_NODE) return document.createTextNode(source.textContent);
      if (source.nodeType !== Node.ELEMENT_NODE) return null;
      const tag = source.localName.toLowerCase();
      if (dropped.has(tag)) return null;
      if (tag === 'a') {
        const url = webURL(source.getAttribute('href') || '', base);
        const label = source.textContent || 'Open link';
        if (!url || inLink) return document.createTextNode(label);
        const anchor = link(url.href, label);
        if (source.childNodes.length) {
          anchor.replaceChildren();
          for (const child of source.childNodes) {const node = copy(child, depth + 1, true); if (node) anchor.append(node);}
        }
        return anchor;
      }
      if (tag === 'img') {
        const url = webURL(source.getAttribute('src') || '', base);
        const alt = source.getAttribute('alt') || source.getAttribute('data-equation-content') || 'Course image';
        if (url?.origin === location.origin && /^\/(?:courses\/\d+\/files\/\d+(?:\/|$)|files\/\d+(?:\/|$)|equation_images\/|images\/)/.test(url.pathname)) {
          return element('img', {src: url.href, alt, loading: 'lazy', referrerpolicy: 'no-referrer'});
        }
        return url && !inLink ? link(url.href, 'View image: ' + alt) : document.createTextNode(alt);
      }
      if (['iframe', 'video', 'audio'].includes(tag)) {
        const url = webURL(source.getAttribute('src') || source.querySelector('source')?.getAttribute('src') || '', base);
        return url && !inLink ? link(url.href, source.getAttribute('title') || 'Open embedded media') : document.createTextNode('Embedded media is available in Original Canvas.');
      }
      const math = mathTags.has(tag) && source.namespaceURI === 'http://www.w3.org/1998/Math/MathML';
      const target = math ? document.createElementNS('http://www.w3.org/1998/Math/MathML', tag) : safeTags.has(tag) ? element(tag) : document.createDocumentFragment();
      if (target.nodeType === Node.ELEMENT_NODE) {
        for (const attr of ['colspan', 'rowspan']) if (['td', 'th'].includes(tag) && /^\d{1,2}$/.test(source.getAttribute(attr) || '')) target.setAttribute(attr, source.getAttribute(attr));
        if (tag === 'ol' && /^\d{1,4}$/.test(source.getAttribute('start') || '')) target.setAttribute('start', source.getAttribute('start'));
      }
      for (const child of source.childNodes) {const node = copy(child, depth + 1, inLink); if (node) target.append(node);}
      return target;
    }
    for (const child of parsed.body.childNodes) {const node = copy(child); if (node) container.append(node);}
    return container;
  }
  const css = `
    .course-workspace{min-width:0}.course-heading{display:flex;justify-content:space-between;align-items:start;gap:20px;margin-bottom:26px}.course-heading h1{font-size:clamp(25px,3vw,36px);margin:5px 0 0}.course-heading .quiet{margin-top:4px}.course-nav{display:flex;flex-wrap:wrap;gap:4px 20px;margin:0 0 32px;padding:0 0 16px;border-bottom:1px solid var(--line)}.course-nav a{padding:6px 0;text-decoration:none;color:var(--muted);font-size:13px}.course-nav a[aria-current=page]{color:var(--accent);font-weight:650;text-decoration:underline;text-underline-offset:9px}.course-nav a:hover{color:var(--accent)}.course-body{min-width:0}.course-body h2{font-size:23px;font-weight:600;letter-spacing:-.025em;margin:0 0 20px}.course-rich{max-width:78ch;overflow-wrap:anywhere;line-height:1.7}.course-rich h1{font-size:30px;line-height:1.25}.course-rich h2{margin-top:30px}.course-rich h3{font-size:19px}.course-rich img{display:block;max-width:100%;height:auto;margin:18px 0}.course-rich table{display:block;max-width:100%;overflow:auto;border-collapse:collapse}.course-rich td,.course-rich th{border:1px solid var(--line);padding:8px 12px;text-align:left}.course-rich pre{overflow:auto;padding:16px;background:var(--surface)}.course-rich blockquote{border-left:2px solid var(--accent);margin-left:0;padding-left:20px;color:var(--muted)}.course-rich a{color:var(--accent);text-underline-offset:3px}.course-record{padding:18px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}.course-record h3{font-size:16px;font-weight:600;margin:0 0 5px}.course-record h3 a{text-decoration:none}.course-record h3 a:hover{text-decoration:underline;text-underline-offset:4px}.course-record p{margin:5px 0}.course-module{margin:0 0 30px}.course-module h3{font-size:18px;margin:0 0 8px}.course-module .course-record{padding:13px 0}.course-meta{display:flex;flex-wrap:wrap;gap:8px 24px;color:var(--muted);font-size:13px;margin:12px 0 22px}.course-original-note{color:var(--muted);font-size:13px;margin:24px 0}.course-rubric{border-top:1px solid var(--line);padding-top:24px;margin-top:30px}.course-reply{padding:18px 0;border-top:1px solid var(--line)}.course-replies{margin-left:20px}.course-fallback{padding:24px 0}.course-loading{color:var(--muted);padding:24px 0}.course-grade{font-variant-numeric:tabular-nums}.course-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:20px 0}.course-workspace button:focus-visible,.course-workspace a:focus-visible{outline:2px solid var(--accent);outline-offset:4px}.course-heading a{white-space:normal}.course-rich math{max-width:100%;overflow:auto}
    @media(max-width:850px){.course-heading{flex-direction:column;gap:12px}.course-nav{gap:4px 16px}.course-heading h1{font-size:26px}.course-meta{gap:8px 16px}.course-replies{margin-left:12px}}
  `;

  function create({request, navigate, original, assignments, taskRow}) {
    const root = element('section', {class: 'course-workspace', 'aria-label': 'Course workspace'});
    let route = null, data = null, error = '', loading = false, version = 0;
    const date = value => value ? new Date(value).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}) : 'No deadline';
    function link(href, label, native = false) {
      const url = webURL(href);
      if (!url) return element('span', {}, label);
      const anchor = element('a', {href: url.href}, label);
      const parsed = globalThis.CanvasCourseRoutes.parse(url.href);
      if (!native && (parsed || (url.origin === location.origin && ['/', '/dashboard', '/courses', '/calendar', '/conversations'].includes(url.pathname)))) {
        anchor.addEventListener('click', event => {
          if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault(); navigate(url.href);
        });
      } else if (url.origin === location.origin) {
        // Unsupported same-origin routes get an explicit real-Canvas handoff.
        anchor.addEventListener('click', event => {
          if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault(); original(url.href);
        });
      } else {anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';}
      return anchor;
    }
    const path = (kind, id) => `/courses/${route.courseId}` + (kind === 'home' ? '' : '/' + ({syllabus: 'assignments/syllabus', discussions: 'discussion_topics', people: 'users'}[kind] || kind)) + (id != null ? '/' + encodeURIComponent(id) : '');
    const rich = html => richText(html, new URL(route.path, location.origin).href, link);
    function nativeButton(href, label) {const anchor = link(href, label, true); anchor.className = 'quiet'; return anchor;}
    function empty(body, message) {body.append(element('div', {class: 'empty'}, message));}
    function record(body, title, href, meta = '') {
      const row = element('article', {class: 'course-record'}, element('h3', {}, href ? link(href, title) : title), meta ? element('p', {class: 'meta'}, meta) : null);
      body.append(row); return row;
    }
    function lock(body, item) {
      if (!item.locked_for_user) return false;
      body.append(element('div', {class: 'notice', role: 'status'}, item.lock_explanation ? new DOMParser().parseFromString(item.lock_explanation, 'text/html').body.textContent : 'This content is locked by Canvas.'));
      return true;
    }
    function itemHref(item) {
      const kinds = {Assignment: 'assignments', Quiz: 'quizzes', Page: 'pages', Discussion: 'discussions', File: 'files'};
      if (item.type === 'Page' && item.page_url) return path('pages', item.page_url);
      if (kinds[item.type] && /^\d+$/.test(String(item.content_id))) return path(kinds[item.type], item.content_id);
      // ExternalTool must launch through Canvas so LTI authentication is preserved.
      return item.type === 'ExternalUrl' ? item.external_url : item.html_url;
    }
    function modules(body) {
      if (!data.items.length) {empty(body, 'No modules to show.'); return;}
      for (const module of data.items) {
        const section = element('section', {class: 'course-module'}, element('h3', {}, module.name));
        body.append(section);
        const details = [module.state, module.unlock_at ? 'Unlocks ' + date(module.unlock_at) : '', module.require_sequential_progress ? 'Complete items in order' : '', module.prerequisite_module_ids?.length ? 'Prerequisites: ' + module.prerequisite_module_ids.map(id => data.items.find(m => String(m.id) === String(id))?.name || 'Module ' + id).join(', ') : ''].filter(Boolean);
        section.append(element('p', {class: 'meta'}, details.join(' · ')));
        if (module.state === 'locked') {section.append(element('p', {class: 'meta'}, 'Open Original Canvas to review unlock requirements.')); continue;}
        for (const item of module.items || []) {
          const locked = item.content_details?.locked_for_user;
          const requirement = item.completion_requirement;
          const meta = [item.type, locked ? 'Locked' : '', requirement ? (requirement.completed ? 'Requirement met' : 'Requirement: ' + requirement.type.replaceAll('_', ' ')) : '', item.content_details?.due_at ? date(item.content_details.due_at) : ''].filter(Boolean).join(' · ');
          record(section, item.title, locked || item.type === 'SubHeader' ? null : itemHref(item), meta);
        }
      }
      body.append(element('p', {class: 'course-original-note'}, 'Reading here does not mark module requirements done. Use Original Canvas for view/participation requirements and mastery paths.'));
    }
    function assignmentDetail(body, item) {
      body.append(element('div', {class: 'course-meta'}, element('span', {}, 'Canvas deadline: ' + date(item.due_at)), element('span', {}, item.points_possible != null ? item.points_possible + ' points' : 'Not graded')));
      if (lock(body, item)) return;
      body.append(rich(item.description));
      const local = assignments().find(a => String(a.courseId) === route.courseId && String(a.url?.match(/\/assignments\/(\d+)/)?.[1]) === String(item.id));
      if (local) {
        body.append(element('h3', {}, 'Your local task'), taskRow(local));
      }
      const submission = item.submission;
      if (submission) {
        body.append(element('h3', {}, 'Submission and feedback'), element('p', {class: 'meta'}, [submission.workflow_state?.replaceAll('_', ' '), submission.submitted_at ? 'Submitted ' + date(submission.submitted_at) : '', submission.grade != null ? 'Grade: ' + submission.grade : '', submission.score != null ? 'Score: ' + submission.score : ''].filter(Boolean).join(' · ')));
        for (const comment of submission.submission_comments || []) body.append(element('article', {class: 'course-record'}, element('strong', {}, comment.author_name || 'Canvas user'), element('p', {}, comment.comment || '')));
      }
      if (item.rubric?.length) {
        const section = element('section', {class: 'course-rubric'}, element('h3', {}, 'Rubric'));
        for (const criterion of item.rubric) {
          const row = record(section, criterion.description || 'Criterion', null, criterion.points + ' points');
          if (criterion.long_description) row.append(rich(criterion.long_description));
          for (const rating of criterion.ratings || []) row.append(element('p', {class: 'meta'}, `${rating.points} — ${rating.description || ''}`));
        }
        body.append(section);
      }
      let action = item.is_quiz_assignment || item.submission_types?.includes('external_tool') ? 'Open activity in Original Canvas' : 'Submit / view submission in Original Canvas';
      body.append(element('div', {class: 'course-actions'}, nativeButton(path('assignments', item.id), action)), element('p', {class: 'course-original-note'}, 'Local completion and personal deadlines never submit work or change Canvas grades.'));
    }
    function discussionDetail(body, item) {
      if (lock(body, item)) return;
      body.append(rich(item.message));
      for (const file of item.attachments || []) body.append(link(file.url, file.display_name || file.filename || 'Attachment'));
      if (item.user_can_see_posts === false) body.append(element('p', {class: 'meta'}, 'Canvas requires an initial post or group access before you can read replies.'));
      const users = new Map((data.discussion?.participants || []).map(user => [String(user.id), user.display_name || user.name]));
      function replies(entries, parent, depth = 0) {
        if (depth > 20) {parent.append(element('p', {class: 'meta'}, 'More replies are available in Original Canvas.')); return;}
        for (const entry of entries || []) {
          const article = element('article', {class: 'course-reply'}, element('strong', {}, users.get(String(entry.user_id)) || 'Canvas user'), element('p', {class: 'meta'}, date(entry.created_at)), rich(entry.deleted ? 'This reply was deleted.' : entry.message));
          parent.append(article);
          if (entry.replies?.length) {const nested = element('div', {class: 'course-replies'}); article.append(nested); replies(entry.replies, nested, depth + 1);}
        }
      }
      replies(data.discussion?.view, body);
      body.append(element('div', {class: 'course-actions'}, nativeButton(path('discussions', item.id), 'Reply in Original Canvas')));
    }
    function paint() {
      const style = element('style', {}, css);
      root.replaceChildren(style);
      const heading = element('header', {class: 'course-heading'}, element('div', {}, link('/courses', 'All courses'), element('h1', {}, data?.course.name || 'Course ' + route.courseId)), nativeButton(route.path, 'Open this page in Original Canvas'));
      root.append(heading);
      if (data) {
        const nav = element('div', {class: 'course-nav', role: 'navigation', 'aria-label': 'Course navigation'});
        const home = link(path('home'), 'Home'); if (route.kind === 'home') home.setAttribute('aria-current', 'page'); nav.append(home);
        for (const tab of data.tabs || []) {
          if (tab.hidden || tab.id === 'home' || !tab.html_url) continue;
          const anchor = link(tab.html_url, tab.label || String(tab.id));
          const parsed = globalThis.CanvasCourseRoutes.parse(tab.html_url);
          if (parsed?.courseId === route.courseId && route.kind !== 'home' && parsed.kind === route.kind) anchor.setAttribute('aria-current', 'page');
          nav.append(anchor);
        }
        root.append(nav);
      }
      const body = element('div', {class: 'course-body', 'aria-busy': String(loading)}); root.append(body);
      if (error) {
        const retry = element('button', {class: 'quiet'}, 'Try again'); retry.addEventListener('click', () => load(true));
        body.append(element('div', {class: 'notice', role: 'alert'}, error, ' ', retry)); return;
      }
      if (loading || !data) {body.append(element('div', {class: 'course-loading', role: 'status'}, 'Loading course content…')); return;}
      const view = data.view, item = data.item;
      body.append(element('h2', {}, item?.title || item?.name || item?.display_name || labels[view] || labels[route.kind]));
      if (view === 'modules') {modules(body); return;}
      if (view === 'syllabus') {if (data.course.syllabus_body) body.append(rich(data.course.syllabus_body)); else empty(body, 'No syllabus has been posted.'); return;}
      if (view === 'front_page' || (view === 'pages' && item)) {if (!lock(body, item)) body.append(rich(item.body)); return;}
      if (view === 'assignments' && item) {assignmentDetail(body, item); return;}
      if (view === 'quizzes' && item) {
        body.append(element('div', {class: 'course-meta'}, element('span', {}, 'Due: ' + date(item.due_at)), element('span', {}, item.time_limit ? item.time_limit + ' minute limit' : 'No time limit'), element('span', {}, item.allowed_attempts === -1 ? 'Unlimited attempts allowed' : (item.allowed_attempts ?? '—') + ' attempts allowed')));
        if (!lock(body, item)) body.append(rich(item.description), element('div', {class: 'course-actions'}, nativeButton(path('quizzes', item.id), 'Take / review quiz in Original Canvas')));
        return;
      }
      if (view === 'discussions' && item) {discussionDetail(body, item); return;}
      if (view === 'files' && item) {
        if (lock(body, item) || item.hidden_for_user) {if (item.hidden_for_user) empty(body, 'This file is not available to you.'); return;}
        body.append(element('p', {class: 'meta'}, [item['content-type'], item.size != null ? Math.ceil(item.size / 1024) + ' KB' : ''].filter(Boolean).join(' · ')), nativeButton(path('files', item.id), 'Preview / download in Original Canvas')); return;
      }
      if (view === 'grades') {
        for (const enrollment of data.enrollments || []) {
          const grades = enrollment.grades || {};
          body.append(element('p', {class: 'course-grade'}, 'Current grade: ' + (grades.current_grade ?? (grades.current_score != null ? grades.current_score + '%' : 'Not available'))));
        }
        body.append(element('p', {class: 'course-original-note'}, 'Canvas-reported grades only. Hidden grades, weighting details, and what-if scores remain in Original Canvas.'));
      }
      const items = data.items || [];
      if (!items.length) {empty(body, 'Nothing has been posted here yet.'); return;}
      for (const entry of items) {
        if (view === 'people') {record(body, entry.name || entry.display_name || 'Canvas user', null, (entry.enrollments || []).map(e => e.type?.replace('Enrollment', '')).filter(Boolean).join(', ')); continue;}
        if (view === 'activity') {record(body, entry.title || entry.type || 'Course activity', entry.html_url, entry.created_at ? date(entry.created_at) : ''); continue;}
        const target = view === 'announcements' ? 'discussions' : view === 'grades' ? 'assignments' : view;
        const id = view === 'pages' ? entry.url : entry.id;
        const meta = [entry.locked_for_user ? 'Locked' : '', entry.due_at ? 'Due ' + date(entry.due_at) : '', entry.submission?.grade != null ? 'Grade: ' + entry.submission.grade : '', entry.points_possible != null ? entry.points_possible + ' points' : '', view === 'pages' && entry.front_page ? 'Front page' : ''].filter(Boolean).join(' · ');
        record(body, entry.title || entry.name || entry.display_name || 'Untitled', path(target, id), meta);
      }
    }
    async function load(force = false) {
      const token = ++version;
      loading = true; error = ''; if (force) data = null; paint();
      try {
        const reply = await request({action: 'course', route: {courseId: route.courseId, kind: route.kind, id: route.id}});
        if (token !== version) return;
        data = reply;
      } catch (reason) {if (token === version) error = reason.message;}
      finally {if (token === version) {loading = false; paint();}}
    }
    return {
      root,
      show(next) {if (route?.path === next.path) return; route = next; data = null; load();},
      refresh() {if (route) load(true);},
      leave() {++version; route = null; data = null; root.replaceChildren();},
      repaint() {if (route) paint();}
    };
  }
  globalThis.CanvasCourseWorkspace = {create, richText};
})();
