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
    .course-workspace{min-width:0}.course-heading{display:flex;justify-content:space-between;align-items:start;gap:20px;margin-bottom:26px}.course-heading h1{font-size:clamp(25px,3vw,36px);margin:5px 0 0}.course-heading .quiet{margin-top:4px}.course-nav{display:flex;flex-wrap:wrap;gap:4px 20px;margin:0 0 32px;padding:0 0 16px;border-bottom:1px solid var(--line)}.course-nav a{padding:6px 0;text-decoration:none;color:var(--muted);font-size:13px}.course-nav a[aria-current=page]{color:var(--accent);font-weight:650;text-decoration:underline;text-underline-offset:9px}.course-nav a:hover{color:var(--accent)}.course-body{min-width:0}.course-body h2{font-size:23px;font-weight:600;letter-spacing:-.025em;margin:0 0 20px}.course-rich{max-width:78ch;overflow-wrap:anywhere;line-height:1.7}.course-rich h1{font-size:30px;line-height:1.25}.course-rich h2{margin-top:30px}.course-rich h3{font-size:19px}.course-rich img{display:block;max-width:100%;height:auto;margin:18px 0}.course-rich table{display:block;max-width:100%;overflow:auto;border-collapse:collapse}.course-rich td,.course-rich th{border:1px solid var(--line);padding:8px 12px;text-align:left}.course-rich pre{overflow:auto;padding:16px;background:var(--surface)}.course-rich blockquote{border-left:2px solid var(--accent);margin-left:0;padding-left:20px;color:var(--muted)}.course-rich a{color:var(--accent);text-underline-offset:3px}.course-record{padding:18px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}.course-record h3{font-size:16px;font-weight:600;margin:0 0 5px}.course-record h3 a{text-decoration:none}.course-record h3 a:hover{text-decoration:underline;text-underline-offset:4px}.course-record p{margin:5px 0}.course-module{margin:0 0 30px}.course-module h3{font-size:18px;margin:0 0 8px}.course-module .course-record{padding:13px 0}.course-meta{display:flex;flex-wrap:wrap;gap:8px 24px;color:var(--muted);font-size:13px;margin:12px 0 22px}.course-original-note{color:var(--muted);font-size:13px;margin:24px 0}.course-rubric{border-top:1px solid var(--line);padding-top:24px;margin-top:30px}.course-reply{padding:18px 0;border-top:1px solid var(--line)}.course-replies{margin-left:20px}.course-fallback{padding:24px 0}.course-loading{color:var(--muted);padding:24px 0}.course-grade{font-variant-numeric:tabular-nums}.course-grade-fraction{margin-left:auto;font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:600}.course-record-grade{display:flex;justify-content:space-between;align-items:baseline;gap:16px}.course-record-grade h3{margin:0;min-width:0}.course-record-main{min-width:0;overflow-wrap:anywhere}.course-quiz-question{padding:18px 0;border-top:1px solid var(--line);overflow-wrap:anywhere}.course-quiz-question h4{font-size:15px;font-weight:600;margin:0 0 8px}.course-answer{margin:12px 0 0;padding:10px 14px;background:var(--surface);border-radius:8px}.course-answer-label{font-size:12px;color:var(--muted);margin:0 0 4px}.course-file-image{display:block;max-width:100%;height:auto;margin:18px 0;border-radius:8px}.course-file-text{white-space:pre-wrap;overflow-wrap:anywhere;overflow:auto;max-height:60vh;padding:16px;background:var(--surface);border-radius:8px;font-size:13px;line-height:1.6}.course-submit{margin-top:26px;border-top:1px solid var(--line);padding-top:6px}.course-submit h4{font-size:15px;font-weight:600;margin:22px 0 10px}.course-submit-text{width:100%;min-height:160px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:12px;font:inherit;margin-bottom:12px}.course-submit-url{width:100%;max-width:46ch;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin-bottom:12px}.course-submit input[type=file]{margin-bottom:12px}.course-status{margin:12px 0 0;font-size:13px;color:var(--muted)}.course-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:20px 0}.course-workspace button:focus-visible,.course-workspace a:focus-visible{outline:2px solid var(--accent);outline-offset:4px}.course-heading a{white-space:normal}.course-rich math{max-width:100%;overflow:auto}
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
    function gradedRow(body, title, href, fraction, meta = '') {
      const row = element('article', {class: 'course-record course-record-grade'},
        element('div', {class: 'course-record-main'}, element('h3', {}, href ? link(href, title) : title), meta ? element('p', {class: 'meta'}, meta) : null),
        element('span', {class: 'course-grade-fraction'}, fraction));
      body.append(row); return row;
    }
    function gradeFraction(entry) {return `${entry.submission?.score ?? '–'}/${entry.points_possible ?? '–'}`;}
    function plainText(html) {return new DOMParser().parseFromString(String(html || ''), 'text/html').body.textContent.trim();}
    // Only the student's own submitted answer is ever shown. Correct answers,
    // comments and unselected options are never rendered.
    function answerText(question, answer) {
      if (answer == null) return null;
      const answers = question?.answers || [];
      const byId = id => answers.find(a => String(a.id) === String(id));
      const text = value => plainText(value);
      switch (question?.question_type) {
        case 'multiple_choice_question': case 'true_false_question': {
          const found = byId(answer);
          return found ? text(found.answer_text) || 'Selected answer' : String(answer);
        }
        case 'multiple_answers_question':
          return Array.isArray(answer) ? answer.map(id => {const found = byId(id); return found ? text(found.answer_text) || 'Selected answer' : String(id);}).join('; ') : String(answer);
        case 'matching_question':
          return Array.isArray(answer) ? answer.map(pair => {
            const prompt = byId(pair?.answer_id);
            const match = byId(pair?.match_id);
            const left = prompt ? text(prompt.answer_match_left || prompt.answer_text) : String(pair?.answer_id ?? '');
            const right = match ? text(match.answer_match_right || match.answer_text) : String(pair?.match_id ?? '');
            return left || right ? left + ' → ' + right : null;
          }).filter(Boolean).join('; ') || null : String(answer);
        case 'multiple_dropdowns_question': case 'fill_in_multiple_blanks_question':
          if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
            const parts = Object.entries(answer).map(([blank, value]) => {
              const found = typeof value === 'number' || /^\d+$/.test(String(value)) ? byId(value) : null;
              return blank + ': ' + (found ? text(found.answer_text) || 'Selected answer' : String(value ?? ''));
            });
            return parts.length ? parts.join('; ') : null;
          }
          return String(answer);
        case 'file_upload_question': return null;
        default: return typeof answer === 'object' ? null : String(answer);
      }
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
          if (item.type === 'ExternalTool' && !locked) {
            const row = record(section, item.title, null, meta);
            const launch = element('button', {class: 'quiet', type: 'button'}, 'Launch tool in new window');
            const toolStatus = element('span', {class: 'meta', role: 'status'});
            launch.addEventListener('click', () => {
              launch.disabled = true; toolStatus.textContent = 'Launching…';
              launchTool({courseId: route.courseId, launchType: 'module_item', moduleItemId: String(item.id)}, message => {toolStatus.textContent = ''; if (typeof message === 'string') toolStatus.textContent = message; else toolStatus.append(message);}, item.title).finally(() => {launch.disabled = false;});
            });
            row.append(launch, toolStatus);
            continue;
          }
          record(section, item.title, locked || item.type === 'SubHeader' ? null : itemHref(item), meta);
        }
      }
      body.append(element('p', {class: 'course-original-note'}, 'Reading here does not mark module requirements done. Use Original Canvas for view/participation requirements and mastery paths.'));
    }
    function confirmButton(label, action, onError) {
      const button = element('button', {class: 'quiet primary'}, label);
      let armed = false, busy = false;
      button.addEventListener('click', async () => {
        if (busy) return;
        if (!armed) {armed = true; button.textContent = 'Click again to confirm'; return;}
        busy = true; button.disabled = true;
        try {await action();}
        catch (reason) {try {onError(reason);} catch {}}
        finally {busy = false; button.disabled = false; armed = false; button.textContent = label;}
      });
      return button;
    }
    function submitStatus(section) {
      const status = element('p', {class: 'course-status', role: 'status'});
      section.append(status);
      return message => {status.replaceChildren(); if (message) status.append(message);};
    }
    // The second leg of a submission file upload runs here, next to the file:
    // Canvas signs the destination, so the bytes go straight there.
    async function uploadSubmissionFile(uploadUrl, uploadParams, file) {
      const form = new FormData();
      for (const [key, value] of Object.entries(uploadParams)) form.append(key, String(value));
      form.append('file', file, file.name);
      const post = await fetch(uploadUrl, {method: 'POST', body: form, redirect: 'follow', signal: AbortSignal.timeout(120000)});
      if (!post.ok) throw new Error(`Upload failed (status ${post.status}). Try Original Canvas.`);
      let data = null;
      try {data = await post.json();} catch {}
      if (!data || !/^\d+$/.test(String(data.id))) {
        const location = post.headers.get('location');
        if (!location) throw new Error('Upload did not complete. Try Original Canvas.');
        const done = await fetch(location, {credentials: 'include', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000)});
        if (!done.ok) throw new Error('Upload did not complete. Try Original Canvas.');
        data = await done.json();
      }
      if (!data || !/^\d+$/.test(String(data.id))) throw new Error('Upload did not complete. Try Original Canvas.');
      return String(data.id);
    }
    function openLaunchedTab() {
      // Popup blockers only allow tabs opened inside the click handler, so open
      // the tab first and navigate it once Canvas returns the launch URL.
      try {return window.open('about:blank', '_blank');} catch {return null;}
    }
    function launchTool(launch, status, label) {
      const pending = openLaunchedTab();
      if (!pending) status('Popup blocked. Fetching a link you can click instead…');
      return request({action: 'toolLaunch', launch}).then(reply => {
        if (pending && !pending.closed) pending.location.href = reply.url;
        else status(element('span', {}, 'Open ', link(reply.url, label || reply.name, true), ' in a new tab.'));
      }).catch(reason => {
        try {pending?.close();} catch {}
        status('Could not launch the tool: ' + reason.message);
      });
    }
    function submitSection(body, item) {
      const types = item.submission_types || [];
      const section = element('section', {class: 'course-submit'}, element('h3', {}, 'Submit work'));
      body.append(section);
      if (item.group_category_id) section.append(element('p', {class: 'course-original-note'}, 'Group work: this submission counts for your whole group.'));
      if (item.is_quiz_assignment && data.quizId) {
        const open = link(path('quizzes', data.quizId), 'Open quiz'); open.className = 'quiet primary';
        section.append(element('div', {class: 'course-actions'}, open, nativeButton(path('assignments', item.id), 'Open in Original Canvas')));
        return;
      }
      if (types.includes('external_tool')) {
        section.append(element('p', {class: 'course-original-note'}, 'This work happens on an external website. Your score syncs back to Canvas.'));
        const button = element('button', {class: 'quiet primary'}, 'Launch tool in new window');
        const setStatus = submitStatus(section);
        button.addEventListener('click', () => {button.disabled = true; launchTool({courseId: route.courseId, launchType: 'assessment', assessmentId: String(item.id)}, setStatus, item.title).finally(() => {button.disabled = false;});});
        section.append(element('div', {class: 'course-actions'}, button, nativeButton(path('assignments', item.id), 'Open in Original Canvas')));
        return;
      }
      const supported = types.filter(type => ['online_text_entry', 'online_upload', 'online_url'].includes(type));
      if (!supported.length) {
        section.append(element('div', {class: 'course-actions'}, nativeButton(path('assignments', item.id), 'Submit / view submission in Original Canvas')));
        return;
      }
      const setStatus = submitStatus(section);
      async function submitted(message) {
        setStatus(message + ' Refreshing…');
        try {await request({action: 'sync'});} catch {}
        load(true);
      }
      if (supported.includes('online_text_entry')) {
        section.append(element('h4', {}, 'Text entry'));
        const area = element('textarea', {class: 'course-submit-text', 'aria-label': 'Submission text'});
        if (item.submission?.body && !item.submission?.submitted_at) area.value = plainText(item.submission.body);
        section.append(area);
        section.append(confirmButton('Submit text entry', async () => {
          const text = area.value.trim();
          if (!text) {setStatus('Write something first.'); return;}
          setStatus('Submitting text entry…');
          const escapeHtml = line => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const paragraphs = text.split(/\n{2,}/).map(paragraph => '<p>' + paragraph.split(/\n/).map(escapeHtml).join('<br/>') + '</p>');
          const reply = await request({action: 'submitAssignment', route: {courseId: route.courseId, id: String(item.id)}, submission: {submission_type: 'online_text_entry', body: paragraphs.join('')}});
          await submitted('Submitted ' + date(reply.submission.submitted_at) + '.');
        }, reason => setStatus('Could not submit: ' + reason.message)));
      }
      if (supported.includes('online_upload')) {
        section.append(element('h4', {}, 'File upload'));
        const picker = element('input', {type: 'file', multiple: '', 'aria-label': 'Choose files to submit'});
        if (item.allowed_extensions?.length) {
          picker.setAttribute('accept', item.allowed_extensions.map(extension => '.' + extension).join(','));
          section.append(element('p', {class: 'meta'}, 'File permitted: ' + item.allowed_extensions.join(', ').toUpperCase()));
        }
        section.append(picker);
        section.append(confirmButton('Submit files', async () => {
          const files = [...picker.files || []].slice(0, 10);
          if (!files.length) {setStatus('Choose at least one file first.'); return;}
          const ids = [];
          let count = 0;
          for (const file of files) {
            count++;
            setStatus(`Uploading ${count} of ${files.length}…`);
            if (item.allowed_extensions?.length && !item.allowed_extensions.some(extension => file.name.toLowerCase().endsWith('.' + extension.toLowerCase()))) throw new Error(`${file.name} is not an accepted file type.`);
            const init = await request({action: 'submissionUploadInit', route: {courseId: route.courseId, id: String(item.id)}, file: {name: file.name, size: file.size, content_type: file.type || 'application/octet-stream'}});
            ids.push(await uploadSubmissionFile(init.uploadUrl, init.uploadParams, file));
          }
          setStatus('Submitting…');
          const reply = await request({action: 'submitAssignment', route: {courseId: route.courseId, id: String(item.id)}, submission: {submission_type: 'online_upload', file_ids: ids}});
          await submitted('Submitted ' + date(reply.submission.submitted_at) + '.');
        }, reason => setStatus('Could not submit: ' + reason.message)));
      }
      if (supported.includes('online_url')) {
        section.append(element('h4', {}, 'Website URL'));
        const field = element('input', {type: 'url', class: 'course-submit-url', placeholder: 'https://…', 'aria-label': 'Website URL to submit'});
        section.append(field);
        section.append(confirmButton('Submit URL', async () => {
          if (!field.value.trim()) {setStatus('Enter a URL first.'); return;}
          setStatus('Submitting URL…');
          const reply = await request({action: 'submitAssignment', route: {courseId: route.courseId, id: String(item.id)}, submission: {submission_type: 'online_url', url: field.value.trim()}});
          await submitted('Submitted ' + date(reply.submission.submitted_at) + '.');
        }, reason => setStatus('Could not submit: ' + reason.message)));
      }
      section.append(element('p', {class: 'course-original-note'}, 'Submitting here sends work to Canvas. It appears in Tasks after the next sync.'));
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
      submitSection(body, item);
      body.append(element('p', {class: 'course-original-note'}, 'The local task checkbox only tracks your own list. It never submits work or changes Canvas grades.'));
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
    function quizDetail(body, item) {
      body.append(element('div', {class: 'course-meta'}, element('span', {}, 'Due: ' + date(item.due_at)), element('span', {}, item.time_limit ? item.time_limit + ' minute limit' : 'No time limit'), element('span', {}, item.allowed_attempts === -1 ? 'Unlimited attempts allowed' : (item.allowed_attempts ?? '—') + ' attempts allowed')));
      if (lock(body, item)) return;
      body.append(rich(item.description));
      const attempts = data.quizAttempts || [];
      if (attempts.length) {
        body.append(element('h3', {}, 'Your attempts'));
        for (const attempt of attempts) {
          const meta = [attempt.workflow_state ? String(attempt.workflow_state).replaceAll('_', ' ') : '', attempt.score != null ? 'Score: ' + attempt.score : '', attempt.finished_at ? 'Finished ' + date(attempt.finished_at) : '', attempt.time_spent != null ? Math.round(attempt.time_spent / 60) + ' min' : ''].filter(Boolean).join(' · ');
          record(body, 'Attempt ' + (attempt.attempt ?? '?'), null, meta);
        }
      }
      const questions = data.quizQuestions;
      if (questions?.length) {
        body.append(element('h3', {}, data.quizReviewAttempt != null ? 'Review: attempt ' + data.quizReviewAttempt : 'Review'));
        let number = 0;
        for (const entry of questions) {
          const question = entry.quiz_question || {};
          number++;
          const article = element('article', {class: 'course-quiz-question'}, element('h4', {}, (question.question_name || 'Question ' + number) + (question.points_possible != null ? ' · ' + question.points_possible + ' points' : '')));
          if (question.question_text) article.append(rich(question.question_text));
          const given = answerText(question, entry.answer);
          const answerBox = element('div', {class: 'course-answer'}, element('p', {class: 'course-answer-label'}, 'Your answer'));
          answerBox.append(element('p', {}, given || (entry.answer == null ? 'No answer submitted.' : 'Your answer is only available in Original Canvas.')));
          article.append(answerBox);
          if (question.neutral_comments) article.append(element('p', {class: 'meta'}, plainText(question.neutral_comments)));
          body.append(article);
        }
      } else if (attempts.length) {
        body.append(element('p', {class: 'course-original-note'}, 'Question review is not available for this quiz. Review your attempt in Original Canvas.'));
      } else {
        body.append(element('p', {class: 'course-original-note'}, 'You have not attempted this quiz yet.'));
      }
      body.append(element('div', {class: 'course-actions'}, nativeButton(path('quizzes', item.id), 'Take / review quiz in Original Canvas')));
    }
    function fileDetail(body, item) {
      if (lock(body, item) || item.hidden_for_user) {if (item.hidden_for_user) empty(body, 'This file is not available to you.'); return;}
      body.append(element('p', {class: 'meta'}, [item['content-type'], item.size != null ? Math.ceil(item.size / 1024) + ' KB' : ''].filter(Boolean).join(' · ')));
      const type = item['content-type'] || '';
      if (type.startsWith('image/') && item.url) {
        body.append(element('img', {src: item.url, alt: item.display_name || item.filename || 'Course image', class: 'course-file-image', loading: 'lazy'}));
      } else if (/^(text\/|application\/json)/.test(type) && item.url && (item.size == null || item.size <= 102400)) {
        const preview = element('div', {class: 'course-file-text', role: 'status'}, 'Loading preview…');
        body.append(preview);
        const here = route;
        request({action: 'courseFile', route: {courseId: route.courseId, kind: 'files', id: String(item.id)}, url: item.url}).then(reply => {
          if (route !== here || !preview.isConnected) return;
          preview.textContent = reply.text + (reply.truncated ? '\n… (preview truncated, open the full file in Original Canvas)' : '');
          preview.removeAttribute('role');
        }).catch(reason => {
          if (route !== here || !preview.isConnected) return;
          preview.textContent = 'Preview unavailable here: ' + reason.message;
        });
      }
      const actions = element('div', {class: 'course-actions'});
      if (item.url) actions.append(element('a', {href: item.url, target: '_blank', rel: 'noopener noreferrer', class: 'quiet', download: item.display_name || item.filename || ''}, 'Download file'));
      actions.append(nativeButton(path('files', item.id), 'Preview / download in Original Canvas'));
      body.append(actions);
    }
    function paint() {
      const style = element('style', {}, css);
      root.replaceChildren(style);
      const heading = element('header', {class: 'course-heading'}, element('div', {}, link('/courses', 'All courses'), data?.course.name ? element('h1', {}, data.course.name) : null), nativeButton(route.path, 'Open this page in Original Canvas'));
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
      if (view === 'quizzes' && item) {quizDetail(body, item); return;}
      if (view === 'discussions' && item) {discussionDetail(body, item); return;}
      if (view === 'files' && item) {fileDetail(body, item); return;}
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
        if (view === 'grades' || view === 'assignments') {
          const target = view === 'grades' ? 'assignments' : view;
          const meta = [entry.locked_for_user ? 'Locked' : '', entry.due_at ? 'Due ' + date(entry.due_at) : ''].filter(Boolean).join(' · ');
          gradedRow(body, entry.title || entry.name || entry.display_name || 'Untitled', path(target, entry.id), gradeFraction(entry), meta);
          continue;
        }
        const target = view === 'announcements' ? 'discussions' : view;
        const id = view === 'pages' ? entry.url : entry.id;
        const meta = [entry.locked_for_user ? 'Locked' : '', entry.due_at ? 'Due ' + date(entry.due_at) : '', view === 'pages' && entry.front_page ? 'Front page' : ''].filter(Boolean).join(' · ');
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
