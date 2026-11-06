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
    .course-workspace{min-width:0}.course-heading{display:flex;justify-content:space-between;align-items:start;gap:20px;margin-bottom:26px}.course-heading h1{font-size:clamp(25px,3vw,36px);margin:5px 0 0}.course-heading .quiet{margin-top:4px}.course-nav{display:flex;flex-wrap:wrap;gap:4px 20px;margin:0 0 32px;padding:0;border-bottom:1px solid var(--line)}.course-nav a{padding:6px 0 15px;position:relative;text-decoration:none;color:var(--muted);font-size:13px}.course-nav a[aria-current=page]{color:var(--accent);font-weight:650;text-decoration:none}.course-nav a[aria-current=page]:after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--accent);border-radius:2px}.course-nav a:hover{color:var(--accent)}.course-body{min-width:0}.course-body h2{font-size:23px;font-weight:600;letter-spacing:-.025em;margin:0 0 20px}.course-rich{max-width:78ch;overflow-wrap:anywhere;line-height:1.7}.course-rich h1{font-size:30px;line-height:1.25}.course-rich h2{font-size:23px;margin-top:30px}.course-rich h3{font-size:19px}.course-rich img{display:block;max-width:100%;height:auto;margin:18px 0}.course-rich table{display:block;max-width:100%;overflow:auto;border-collapse:collapse}.course-rich td,.course-rich th{border:1px solid var(--line);padding:8px 12px;text-align:left}.course-rich pre{overflow:auto;padding:16px;background:var(--surface)}.course-rich blockquote{border-left:2px solid var(--accent);margin-left:0;padding-left:20px;color:var(--muted)}.course-rich a{color:var(--accent);text-underline-offset:3px}.course-record{padding:18px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}.course-record h3{font-size:16px;font-weight:600;margin:0 0 5px}.course-record h3 a{text-decoration:none}.course-record h3 a:hover{text-decoration:underline;text-underline-offset:4px}.course-record p{margin:5px 0}.course-module{margin:0 0 30px}.course-module h3{font-size:18px;margin:0 0 8px}.course-module .course-record{padding:13px 0}.course-meta{display:flex;flex-wrap:wrap;gap:8px 24px;color:var(--muted);font-size:13px;margin:12px 0 22px}.course-original-note{color:var(--muted);font-size:13px;margin:24px 0}.course-rubric{border-top:1px solid var(--line);padding-top:24px;margin-top:30px}.course-reply{padding:18px 0;border-top:1px solid var(--line)}.course-replies{margin-left:20px}.course-fallback{padding:24px 0}.course-loading{display:flex;justify-content:center;align-items:center;min-height:calc(100dvh - 60px);padding:24px 0}.nebula-loader{--uib-size:56px;--uib-color:var(--accent,#ff6b00);--uib-speed:1.8s;position:relative;display:inline-flex;align-items:center;justify-content:center;width:var(--uib-size);height:var(--uib-size);flex:none}.nebula-particle{position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;height:100%;width:100%}.nebula-particle:nth-child(1){--uib-delay:0;transform:rotate(8deg)}.nebula-particle:nth-child(2){--uib-delay:-0.4;transform:rotate(36deg)}.nebula-particle:nth-child(3){--uib-delay:-0.9;transform:rotate(72deg)}.nebula-particle:nth-child(4){--uib-delay:-0.5;transform:rotate(90deg)}.nebula-particle:nth-child(5){--uib-delay:-0.3;transform:rotate(144deg)}.nebula-particle:nth-child(6){--uib-delay:-0.2;transform:rotate(180deg)}.nebula-particle:nth-child(7){--uib-delay:-0.6;transform:rotate(216deg)}.nebula-particle:nth-child(8){--uib-delay:-0.7;transform:rotate(252deg)}.nebula-particle:nth-child(9){--uib-delay:-0.1;transform:rotate(300deg)}.nebula-particle:nth-child(10){--uib-delay:-0.8;transform:rotate(324deg)}.nebula-particle:nth-child(11){--uib-delay:-1.2;transform:rotate(335deg)}.nebula-particle:nth-child(12){--uib-delay:-0.5;transform:rotate(290deg)}.nebula-particle:nth-child(13){--uib-delay:-0.2;transform:rotate(240deg)}.nebula-particle::before{content:'';position:absolute;height:17.5%;width:17.5%;border-radius:50%;background-color:var(--uib-color);flex-shrink:0;--uib-d:calc(var(--uib-delay)*var(--uib-speed));animation:nebula-orbit var(--uib-speed) linear var(--uib-d) infinite}@keyframes nebula-orbit{0%{transform:translate(calc(var(--uib-size)*0.5)) scale(0.74);opacity:.65}25%{transform:translate(0) scale(0.47);opacity:.3}50%{transform:translate(calc(var(--uib-size)*-0.5)) scale(0.74);opacity:.65}75%{transform:translate(0) scale(1);opacity:1}100%{transform:translate(calc(var(--uib-size)*0.5)) scale(0.74);opacity:.65}}@media (prefers-reduced-motion:reduce){.nebula-particle::before{animation:none}}.course-grade{font-variant-numeric:tabular-nums}.course-grade-fraction{margin-left:auto;font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:600}.course-record-grade{display:flex;justify-content:space-between;align-items:baseline;gap:16px}.course-record-grade h3{margin:0;min-width:0}.course-record-main{min-width:0;overflow-wrap:anywhere}.course-quiz-question{padding:18px 0;border-top:1px solid var(--line);overflow-wrap:anywhere}.course-quiz-question h4{font-size:15px;font-weight:600;margin:0 0 8px}.course-take{margin-top:26px;border-top:1px solid var(--line);padding-top:6px}.course-quiz-timer{font-variant-numeric:tabular-nums;font-weight:650;color:var(--accent)}.course-take-option{display:flex;gap:10px;align-items:flex-start;padding:8px 0}.course-take-blank{display:grid;gap:6px;margin:10px 0;max-width:46ch}.course-take-input input[type=text],.course-take-input textarea,.course-take-input select,.course-take-blank input,.course-take-blank select{background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:var(--radius,8px);padding:10px 12px;font:inherit;max-width:46ch}.course-take-input textarea{width:100%;min-height:120px}.course-take-question{padding:16px 0;border-top:1px solid var(--line);overflow-wrap:anywhere}.course-take-question h4{font-size:15px;font-weight:600;margin:0 0 8px}.course-answer{margin:12px 0 0;padding:10px 14px;background:var(--surface);border-radius:var(--radius,8px)}.course-answer-label{font-size:12px;color:var(--muted);margin:0 0 4px}.course-file-image{display:block;max-width:100%;height:auto;margin:18px 0;border-radius:var(--radius,8px)}.course-file-text{white-space:pre-wrap;overflow-wrap:anywhere;overflow:auto;max-height:60vh;padding:16px;background:var(--surface);border-radius:var(--radius,8px);font-size:13px;line-height:1.6}.course-quiz-frame{display:block;width:100%;min-height:75vh;border:1px solid var(--line);border-radius:12px;background:var(--surface);margin:8px 0 4px}.course-submit{margin-top:26px;border-top:1px solid var(--line);padding-top:6px}.course-submit h4{font-size:15px;font-weight:600;margin:22px 0 10px}.course-submit-text{width:100%;min-height:160px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:var(--radius,8px);padding:12px;font:inherit;margin-bottom:12px}.course-submit-url{width:100%;max-width:46ch;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:var(--radius,8px);padding:10px 12px;margin-bottom:12px}.course-submit input[type=file]{margin-bottom:12px}.course-file-list{font-size:13px;color:var(--muted);margin:0 0 12px;overflow-wrap:anywhere}.course-file-list:empty{display:none}.course-status{margin:12px 0 0;font-size:13px;color:var(--muted)}.course-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:20px 0}.course-workspace button:focus-visible,.course-workspace a:focus-visible{outline:2px solid var(--accent);outline-offset:4px}.course-heading a{white-space:normal}.course-rich math{max-width:100%;overflow:auto}
    @media(max-width:850px){.course-heading{flex-direction:column;gap:12px}.course-nav{gap:4px 16px}.course-heading h1{font-size:26px}.course-meta{gap:8px 16px}.course-replies{margin-left:12px}}
  `;

  function create({request, navigate, original, assignments, taskRow}) {
    const root = element('section', {class: 'course-workspace', 'aria-label': 'Course workspace'});
    let route = null, data = null, error = '', loading = false, version = 0;
    // Raw browser fetch failures read as gibberish in the UI. Name the moment
    // instead: a dropped connection with saved content still on screen.
    function friendlyError(reason) {
      const message = String(reason?.message || reason || '').trim();
      if (!/failed to fetch/i.test(message)) return message;
      const prefix = message.replace(/failed to fetch/gi, '').replace(/[:\-.\u2013\u2014\s]+$/g, '').trim();
      if (!prefix) return "Couldn't reach Canvas just now. Showing saved work.";
      return prefix + ": couldn't reach Canvas just now.";
    }
    let scoreTimer = null, stopScoreFocus = null;
    function clearScorePoll() {if (scoreTimer) {clearInterval(scoreTimer); scoreTimer = null;} if (stopScoreFocus) {stopScoreFocus(); stopScoreFocus = null;}}
    function submissionSignature(submission) {
      if (!submission) return 'none';
      return JSON.stringify({score: submission.score ?? null, grade: submission.grade ?? null, submitted_at: submission.submitted_at ?? null, workflow_state: submission.workflow_state ?? null, comments: (submission.submission_comments || []).map(comment => (comment.author_name || '') + ': ' + (comment.comment || ''))});
    }
    function renderFeedback(container, item, submission) {
      container.replaceChildren(element('h3', {}, 'Submission and feedback'));
      gradedRow(container, submission.submitted_at ? 'Submitted ' + date(submission.submitted_at) : String(submission.workflow_state || 'unsubmitted').replaceAll('_', ' '), null, `${submission.score ?? '\u2013'}/${item.points_possible ?? '\u2013'}`, submission.grade != null && String(submission.grade) !== String(submission.score ?? '') ? 'Grade: ' + submission.grade : '');
      for (const comment of submission.submission_comments || []) container.append(element('article', {class: 'course-record'}, element('strong', {}, comment.author_name || 'Canvas user'), element('p', {}, comment.comment || '')));
    }
    // Tool quizzes submit inside a cross-origin frame that never signals completion,
    // so poll the submission and patch just the feedback section in place.
    // A full reload here would reset the tool mid-quiz.
    function watchToolScore({item, frame, actions, feedback, setStatus}) {
      clearScorePoll();
      const here = route;
      let last = submissionSignature(item.submission);
      let busy = false;
      async function check(manual) {
        if (route !== here || busy) return;
        busy = true;
        try {
          if (manual) setStatus('Checking for a new score' + '\u2026');
          const reply = await request({action: 'course', route: {courseId: here.courseId, kind: 'assignments', id: String(item.id)}});
          if (route !== here) return;
          const fresh = reply?.item?.submission || null;
          if (!fresh) {if (manual) setStatus('No new score yet.'); return;}
          if (data?.item && String(data.item.id) === String(item.id)) data.item.submission = fresh;
          if (submissionSignature(fresh) === last) {if (manual) setStatus('No new score yet.'); return;}
          last = submissionSignature(fresh);
          if (feedback.isConnected) renderFeedback(feedback, item, fresh);
          setStatus('Score updated.');
        } catch (reason) {if (manual && route === here) setStatus('Could not check the score: ' + friendlyError(reason));}
        finally {busy = false;}
      }
      const refresh = element('button', {class: 'quiet', type: 'button'}, 'Check for new score');
      refresh.addEventListener('click', () => check(true));
      actions.append(refresh);
      let firstLoad = true;
      frame.addEventListener('load', () => {
        if (firstLoad) {firstLoad = false; return;}
        setTimeout(() => {check(false);}, 5000);
      });
      const onFocus = () => {check(false);};
      window.addEventListener('focus', onFocus);
      stopScoreFocus = () => window.removeEventListener('focus', onFocus);
      scoreTimer = setInterval(() => {check(false);}, 20000);
    }
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
    // Thirteen particles orbiting a center, ported from the FRC 7790 site loader.
    // Size the orbit per call site; particles pick up the workspace accent color.
    function nebulaLoader(size = 56, label = 'Loading') {
      const loader = element('div', {class: 'nebula-loader', role: 'status', 'aria-label': label});
      loader.style.setProperty('--uib-size', size + 'px');
      for (let i = 0; i < 13; i++) loader.append(element('div', {class: 'nebula-particle', 'aria-hidden': 'true'}));
      return loader;
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
        status('Could not launch the tool: ' + friendlyError(reason));
      });
    }
    function submitSection(body, item, feedback) {
      const types = item.submission_types || [];
      const section = element('section', {class: 'course-submit'}, element('h3', {}, 'Submit work'));
      body.append(section);
      if (item.group_category_id) section.append(element('p', {class: 'course-original-note'}, 'Group work: this submission counts for your whole group.'));
      if (data.quizId) {
        const open = link(path('quizzes', data.quizId), 'Open quiz'); open.className = 'quiet primary';
        section.append(element('div', {class: 'course-actions'}, open, nativeButton(path('assignments', item.id), 'Open in Original Canvas')));
        return;
      }
      if (data.newQuiz) {
        if (data.newQuiz.instructions) section.append(rich(data.newQuiz.instructions));
        section.append(element('p', {class: 'course-original-note'}, 'This is a New Quiz. It runs in Canvas\u2019s quiz player, shown below.'));
        const actions = element('div', {class: 'course-actions'});
        actions.append(nativeButton(path('assignments', item.id), 'Open in Original Canvas'));
        section.append(actions);
        const setStatus = submitStatus(section);
        setStatus(nebulaLoader(44, 'Loading quiz player'));
        const here = route;
        request({action: 'toolLaunch', launch: {courseId: route.courseId, launchType: 'assessment', assessmentId: String(item.id)}}).then(reply => {
          if (route !== here) return;
          setStatus('');
          const frame = element('iframe', {src: reply.url, title: (data.newQuiz.title || item.title) + ' quiz player', class: 'course-quiz-frame', allow: 'fullscreen'});
          section.append(frame);
          const popout = element('a', {href: reply.url, target: '_blank', rel: 'noopener noreferrer', class: 'quiet'}, 'Open quiz in new window');
          actions.append(popout);
          if (feedback) watchToolScore({item, frame, actions, feedback, setStatus});
        }).catch(reason => {
          if (route !== here) return;
          setStatus('Could not load the quiz player here: ' + friendlyError(reason));
        });
        return;
      }
      if (item.is_quiz_assignment) {
        section.append(element('p', {class: 'course-original-note'}, 'This quiz runs in a connected Canvas tool. Your score syncs back to Canvas.'));
        const button = element('button', {class: 'quiet primary'}, 'Take quiz in new window');
        const setStatus = submitStatus(section);
        button.addEventListener('click', () => {button.disabled = true; launchTool({courseId: route.courseId, launchType: 'assessment', assessmentId: String(item.id)}, setStatus, item.title).finally(() => {button.disabled = false;});});
        section.append(element('div', {class: 'course-actions'}, button, nativeButton(path('assignments', item.id), 'Open in Original Canvas')));
        return;
      }
      if (types.includes('external_tool')) {
        section.append(element('p', {class: 'course-original-note'}, 'This work happens in a connected tool, shown below. Scores sync back to Canvas.'));
        const actions = element('div', {class: 'course-actions'});
        const openTool = element('button', {class: 'quiet primary'}, 'Open tool in new window');
        const quizList = link(path('quizzes'), 'Browse all quizzes'); quizList.className = 'quiet';
        actions.append(openTool, quizList, nativeButton(path('assignments', item.id), 'Open in Original Canvas'));
        section.append(actions);
        const setStatus = submitStatus(section);
        setStatus(nebulaLoader(44, 'Loading tool'));
        const here = route;
        request({action: 'toolLaunch', launch: {courseId: route.courseId, launchType: 'assessment', assessmentId: String(item.id)}}).then(reply => {
          if (route !== here) return;
          setStatus('');
          const frame = element('iframe', {src: reply.url, title: item.title + ' tool', class: 'course-quiz-frame', sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups', allow: 'fullscreen'});
          section.append(frame);
          if (feedback) watchToolScore({item, frame, actions, feedback, setStatus});
        }).catch(reason => {
          if (route !== here) return;
          setStatus('Could not load the tool here: ' + friendlyError(reason));
        });
        openTool.addEventListener('click', () => {openTool.disabled = true; setStatus('Opening tool\u2026'); launchTool({courseId: route.courseId, launchType: 'assessment', assessmentId: String(item.id)}, setStatus, item.title).then(() => setStatus('')).finally(() => {openTool.disabled = false;});});
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
        }, reason => setStatus('Could not submit: ' + friendlyError(reason))));
      }
      if (supported.includes('online_upload')) {
        section.append(element('h4', {}, 'File upload'));
        const picker = element('input', {type: 'file', multiple: '', hidden: '', 'aria-label': 'Choose files to submit'});
        if (item.allowed_extensions?.length) {
          picker.setAttribute('accept', item.allowed_extensions.map(extension => '.' + extension).join(','));
          section.append(element('p', {class: 'meta'}, 'File permitted: ' + item.allowed_extensions.join(', ').toUpperCase()));
        }
        const fileList = element('div', {class: 'course-file-list', role: 'status'});
        const chooseButton = element('button', {class: 'quiet', type: 'button'}, 'Choose files');
        chooseButton.addEventListener('click', () => picker.click());
        picker.addEventListener('change', () => {
          fileList.textContent = [...picker.files || []].map(file => file.name).join(', ');
        });
        const uploadActions = element('div', {class: 'course-actions'});
        const submitFiles = confirmButton('Submit files', async () => {
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
        }, reason => setStatus('Could not submit: ' + friendlyError(reason)));
        uploadActions.append(chooseButton, submitFiles);
        section.append(picker, fileList, uploadActions);
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
        }, reason => setStatus('Could not submit: ' + friendlyError(reason))));
      }
      section.append(element('p', {class: 'course-original-note'}, 'Submitting here sends work to Canvas. It appears in Tasks after the next sync.'));
    }
    function assignmentDetail(body, item) {
      body.append(element('div', {class: 'course-meta'}, element('span', {}, 'Deadline: ' + date(item.due_at)), element('span', {}, item.points_possible != null ? item.points_possible + ' points' : 'Not graded')));
      if (lock(body, item)) return;
      body.append(rich(item.description));
      const local = assignments().find(a => String(a.courseId) === route.courseId && String(a.url?.match(/\/assignments\/(\d+)/)?.[1]) === String(item.id));
      const submission = item.submission;
      const feedback = submission ? element('div', {class: 'course-feedback'}) : null;
      submitSection(body, item, feedback);
      if (feedback) {
        renderFeedback(feedback, item, submission);
        body.append(feedback);
      }
      if (local) {
        body.append(element('h3', {}, 'Local task'), taskRow(local, false));
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
    let take = null, takeTimer = null, takeNotice = '', takeCode = false;
    function clearTake() {if (takeTimer) clearInterval(takeTimer); takeTimer = null; take = null; takeNotice = ''; takeCode = false;}
    function takeTimeLeft() {
      if (!take?.endAt) return null;
      const left = new Date(take.endAt).getTime() - Date.now();
      if (!Number.isFinite(left)) return null;
      if (left <= 0) return 'Time is up — submit your answers now.';
      const minutes = Math.floor(left / 60000), seconds = Math.floor(left % 60000 / 1000);
      return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m left` : `${minutes}m ${String(seconds).padStart(2, '0')} left`;
    }
    function tickTakeTimer() {
      const node = root.querySelector('.course-quiz-timer');
      if (node) node.textContent = takeTimeLeft() || '';
    }
    function takeOptionLabel(answer) {
      const label = element('span', {});
      const text = plainText(answer.answer_text);
      if (text) label.append(document.createTextNode(text));
      else label.append(rich(answer.answer_text || ''));
      return label;
    }
    function takeInput(question, record) {
      const type = question.question_type;
      const answers = question.answers || [];
      const box = element('div', {class: 'course-take-input'});
      const current = take.values[record.id];
      if (type === 'multiple_choice_question' || type === 'true_false_question') {
        for (const answer of answers) {
          const radio = element('input', {type: 'radio', name: 'take-q' + record.id, value: String(answer.id)});
          if (current != null && String(current) === String(answer.id)) radio.checked = true;
          radio.addEventListener('change', () => {take.values[record.id] = /^\d+$/.test(String(answer.id)) ? Number(answer.id) : String(answer.id);});
          const label = element('label', {class: 'course-take-option'}, radio);
          label.append(takeOptionLabel(answer));
          box.append(label);
        }
        return box;
      }
      if (type === 'multiple_answers_question') {
        const chosen = new Set((Array.isArray(current) ? current : []).map(String));
        for (const answer of answers) {
          const check = element('input', {type: 'checkbox', value: String(answer.id)});
          if (chosen.has(String(answer.id))) check.checked = true;
          check.addEventListener('change', () => {
            const next = new Set((Array.isArray(take.values[record.id]) ? take.values[record.id] : []).map(String));
            if (check.checked) next.add(String(answer.id)); else next.delete(String(answer.id));
            take.values[record.id] = [...next].map(value => /^\d+$/.test(value) ? Number(value) : value);
          });
          const label = element('label', {class: 'course-take-option'}, check);
          label.append(takeOptionLabel(answer));
          box.append(label);
        }
        return box;
      }
      if (type === 'short_answer_question' || type === 'numerical_question' || type === 'calculated_question') {
        const field = element('input', {type: 'text', value: current ?? '', 'aria-label': question.question_name || 'Answer'});
        field.addEventListener('input', () => {take.values[record.id] = field.value;});
        box.append(field);
        return box;
      }
      if (type === 'essay_question') {
        const area = element('textarea', {'aria-label': question.question_name || 'Answer'});
        area.value = current ?? '';
        area.addEventListener('input', () => {take.values[record.id] = area.value;});
        box.append(area);
        return box;
      }
      if (type === 'matching_question') {
        const prompts = answers.filter(answer => answer.answer_match_left);
        const rights = [...new Set(answers.map(answer => answer.answer_match_right).filter(Boolean))];
        for (const answer of answers) {
          for (const extra of String(answer.matching_answer_incorrect_matches || '').split(/\r?\n/)) {
            if (extra.trim() && !rights.includes(extra.trim())) rights.push(extra.trim());
          }
        }
        const pairs = Array.isArray(current) ? current : [];
        for (const prompt of prompts) {
          const select = element('select', {'aria-label': plainText(prompt.answer_match_left) || 'Match'});
          select.append(element('option', {value: ''}, 'Choose…'));
          for (const right of rights) {
            const owner = answers.find(answer => answer.answer_match_right === right);
            const option = element('option', {value: owner ? String(owner.id) : right}, right);
            const existing = pairs.find(pair => String(pair?.answer_id) === String(prompt.id));
            if (existing && String(existing.match_id) === option.value) option.selected = true;
            select.append(option);
          }
          select.addEventListener('change', () => {
            const next = (Array.isArray(take.values[record.id]) ? take.values[record.id] : []).filter(pair => String(pair?.answer_id) !== String(prompt.id));
            if (select.value) next.push({answer_id: /^\d+$/.test(String(prompt.id)) ? Number(prompt.id) : String(prompt.id), match_id: /^\d+$/.test(select.value) ? Number(select.value) : select.value});
            take.values[record.id] = next;
          });
          box.append(element('label', {class: 'course-take-blank'}, plainText(prompt.answer_match_left), select));
        }
        if (!prompts.length) box.append(element('p', {class: 'meta'}, 'This question can only be answered in Original Canvas.'));
        return box;
      }
      if (type === 'fill_in_multiple_blanks_question' || type === 'multiple_dropdowns_question') {
        const blanks = [...new Set(answers.map(answer => answer.blank_id).filter(Boolean))];
        const stored = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
        for (const blank of blanks) {
          if (type === 'fill_in_multiple_blanks_question') {
            const field = element('input', {type: 'text', value: stored[blank] ?? '', 'aria-label': blank});
            field.addEventListener('input', () => {
              const next = {...(take.values[record.id] || {})};
              if (field.value) next[blank] = field.value; else delete next[blank];
              take.values[record.id] = next;
            });
            box.append(element('label', {class: 'course-take-blank'}, blank, field));
          } else {
            const select = element('select', {'aria-label': blank});
            select.append(element('option', {value: ''}, 'Choose…'));
            for (const answer of answers.filter(answer => answer.blank_id === blank)) {
              const option = element('option', {value: String(answer.id)}, plainText(answer.answer_text));
              if (stored[blank] != null && String(stored[blank]) === String(answer.id)) option.selected = true;
              select.append(option);
            }
            select.addEventListener('change', () => {
              const next = {...(take.values[record.id] || {})};
              if (select.value) next[blank] = /^\d+$/.test(select.value) ? Number(select.value) : select.value; else delete next[blank];
              take.values[record.id] = next;
            });
            box.append(element('label', {class: 'course-take-blank'}, blank, select));
          }
        }
        if (!blanks.length) box.append(element('p', {class: 'meta'}, 'This question can only be answered in Original Canvas.'));
        return box;
      }
      if (type === 'text_only_question') return null;
      box.append(element('p', {class: 'meta'}, 'This question type can only be answered in Original Canvas.'));
      return box;
    }
    function collectTakeAnswers() {
      const out = [];
      for (const entry of take?.questions || []) {
        const value = take.values[entry.id];
        if (value == null || value === '') continue;
        if (Array.isArray(value) && !value.length) continue;
        if (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length) continue;
        out.push({id: /^\d+$/.test(String(entry.id)) ? Number(entry.id) : String(entry.id), answer: value});
      }
      return out;
    }
    async function openTake(item, session) {
      if (!session.validationToken) {takeNotice = 'Canvas did not return a session token. Take this quiz in Original Canvas.'; paint(); return;}
      try {
        const loaded = await request({action: 'quizQuestions', take: {courseId: route.courseId, quizId: String(item.id), qsId: session.qsId}});
        if (take && take.itemId !== String(item.id)) return;
        take = {qsId: session.qsId, attempt: session.attempt, token: session.validationToken, endAt: session.endAt, questions: loaded.questions, values: {}, itemId: String(item.id)};
        takeNotice = '';
        if (takeTimer) clearInterval(takeTimer);
        takeTimer = setInterval(tickTakeTimer, 1000);
      } catch (reason) {
        takeNotice = 'Could not load questions: ' + friendlyError(reason);
      }
      paint();
    }
    async function beginTake(item, code) {
      takeNotice = 'Starting your attempt…'; paint();
      try {
        const start = await request({action: 'quizStart', route: {courseId: route.courseId, id: String(item.id)}, options: code ? {access_code: code} : {}});
        await openTake(item, {qsId: start.qsId, attempt: start.attempt, validationToken: start.validationToken, endAt: start.endAt});
      } catch (reason) {
        if (/access code/i.test(reason.message)) {takeCode = true; takeNotice = reason.message + ' Enter it below to begin.';}
        else if (/already exists|in progress|conflict|409/i.test(reason.message)) {takeNotice = 'An attempt is already in progress. Trying to resume it…'; paint(); await resumeTake(item); return;}
        else takeNotice = 'Could not start: ' + friendlyError(reason);
        paint();
      }
    }
    async function resumeTake(item) {
      takeNotice = 'Picking up your in-progress attempt…'; paint();
      try {
        const resumed = await request({action: 'quizResume', route: {courseId: route.courseId, id: String(item.id)}});
        await openTake(item, {qsId: resumed.qsId, attempt: resumed.attempt, validationToken: resumed.validationToken, endAt: resumed.endAt});
      } catch (reason) {
        takeNotice = friendlyError(reason); paint();
      }
    }
    function takeSection(body, item) {
      const section = element('section', {class: 'course-take'});
      body.append(section);
      const attempts = data.quizAttempts || [];
      const allowed = item.allowed_attempts;
      const remaining = allowed == null || allowed === -1 || attempts.length < allowed;
      const status = element('p', {class: 'course-status', role: 'status'});
      const showNotice = message => {takeNotice = message; status.textContent = message;};
      if (take && !take.done && take.itemId !== String(item.id)) clearTake();
      if (take?.done) {
        section.append(element('h3', {}, 'Attempt submitted'));
        section.append(element('p', {class: 'course-grade'}, take.score != null ? 'Score: ' + take.score + (take.keptScore != null && take.keptScore !== take.score ? ' (kept: ' + take.keptScore + ')' : '') : 'Submitted for grading.'));
        if (take.finishedAt) section.append(element('p', {class: 'meta'}, 'Finished ' + date(take.finishedAt)));
        section.append(element('p', {class: 'course-original-note'}, 'Attempts and review above refresh automatically.'));
        return;
      }
      if (!take) {
        section.append(element('h3', {}, 'Take quiz'));
        const taken = attempts.length;
        section.append(element('p', {class: 'meta'}, taken ? `${taken} of ${allowed === -1 ? 'unlimited' : allowed ?? 'unlimited'} attempts taken. This will be your attempt ${taken + 1}.` : (allowed && allowed !== -1 ? `0 of ${allowed} attempts taken. This will be your 1st attempt.` : 'This will be your 1st attempt.')));
        const resumable = attempts.find(attempt => attempt?.started_at && !attempt.finished_at);
        let code = '';
        if (takeCode) {
          const field = element('input', {type: 'password', class: 'course-submit-url', placeholder: 'Access code', 'aria-label': 'Quiz access code'});
          field.addEventListener('input', () => {code = field.value;});
          section.append(field);
        }
        if (resumable) {
          section.append(element('p', {class: 'course-original-note'}, 'You have an attempt in progress, including one that may have been started in Original Canvas.'));
          const resume = element('button', {class: 'quiet primary'}, 'Resume attempt ' + (resumable.attempt ?? ''));
          resume.addEventListener('click', async () => {
            resume.disabled = true;
            try {await resumeTake(item);}
            finally {resume.disabled = false;}
          });
          section.append(element('div', {class: 'course-actions'}, resume));
        } else if (remaining) {
          const begin = element('button', {class: 'quiet primary'}, takeCode ? 'Begin with access code' : 'Begin');
          begin.addEventListener('click', async () => {
            begin.disabled = true;
            try {await beginTake(item, code || undefined);}
            finally {begin.disabled = false;}
          });
          section.append(element('div', {class: 'course-actions'}, begin));
        } else {
          section.append(element('p', {class: 'course-original-note'}, 'No attempts remaining.'));
        }
        if (takeNotice) status.textContent = takeNotice;
        section.append(status);
        return;
      }
      section.append(element('h3', {}, 'Taking attempt ' + take.attempt));
      const left = takeTimeLeft();
      if (left || take.endAt) section.append(element('p', {class: 'course-quiz-timer', role: 'timer'}, left || ''));
      let number = 0, answerable = 0;
      for (const entry of take.questions) {
        const question = entry.quiz_question || {};
        number++;
        const article = element('article', {class: 'course-take-question'}, element('h4', {}, (question.question_name || 'Question ' + number) + (question.points_possible != null ? ' · ' + question.points_possible + ' points' : '')));
        if (question.question_text) article.append(rich(question.question_text));
        const input = takeInput(question, entry);
        if (input) {article.append(input); answerable++;}
        section.append(article);
      }
      if (!take.questions.length) section.append(element('p', {class: 'course-original-note'}, 'No questions were returned. Take this quiz in Original Canvas.'));
      const save = element('button', {class: 'quiet'}, 'Save answers');
      save.addEventListener('click', async () => {
        save.disabled = true;
        try {
          const answers = collectTakeAnswers();
          if (!answers.length) {showNotice('Answer at least one question before saving.'); return;}
          showNotice('Saving answers…');
          const reply = await request({action: 'quizAnswer', take: {courseId: route.courseId, quizId: String(item.id), qsId: take.qsId, attempt: take.attempt, validationToken: take.token, answers}});
          showNotice(`Answers saved (${reply.answered} recorded).`);
          paint();
        } catch (reason) {showNotice('Could not save: ' + friendlyError(reason));}
        finally {save.disabled = false;}
      });
      const submit = confirmButton('Submit quiz', async () => {
        showNotice('Submitting…');
        const answers = collectTakeAnswers();
        if (answers.length) {
          try {await request({action: 'quizAnswer', take: {courseId: route.courseId, quizId: String(item.id), qsId: take.qsId, attempt: take.attempt, validationToken: take.token, answers}});}
          catch (reason) {throw new Error('Could not save answers: ' + friendlyError(reason));}
        }
        const done = await request({action: 'quizComplete', take: {courseId: route.courseId, quizId: String(item.id), qsId: take.qsId, attempt: take.attempt, validationToken: take.token}});
        const finished = {done: true, score: done.score, keptScore: done.keptScore, finishedAt: done.finishedAt, itemId: String(item.id)};
        clearTake(); take = finished;
        takeNotice = '';
        paint();
        try {await request({action: 'sync'});} catch {}
        load(true);
      }, reason => {takeNotice = 'Could not submit: ' + friendlyError(reason); paint();});
      section.append(element('div', {class: 'course-actions'}, save, submit));
      if (takeNotice) status.textContent = takeNotice;
      section.append(status);
      if (!answerable) section.append(element('p', {class: 'course-original-note'}, 'None of these questions can be answered here. Take this quiz in Original Canvas.'));
    }
    function quizDetail(body, item) {
      body.append(element('div', {class: 'course-meta'}, element('span', {}, 'Due: ' + date(item.due_at)), element('span', {}, item.time_limit ? item.time_limit + ' minute limit' : 'No time limit'), element('span', {}, item.allowed_attempts === -1 ? 'Unlimited attempts allowed' : (item.allowed_attempts ?? '—') + ' attempts allowed')));
      if (lock(body, item)) return;
      body.append(rich(item.description));
      takeSection(body, item);
      const attempts = data.quizAttempts || [];
      if (attempts.length) {
        body.append(element('h3', {}, 'Your attempts'));
        for (const attempt of attempts) {
          const meta = [attempt.workflow_state ? String(attempt.workflow_state).replaceAll('_', ' ') : '', attempt.finished_at ? 'Finished ' + date(attempt.finished_at) : '', attempt.time_spent != null ? Math.round(attempt.time_spent / 60) + ' min' : ''].filter(Boolean).join(' · ');
          gradedRow(body, 'Attempt ' + (attempt.attempt ?? '?'), null, `${attempt.score ?? '–'}/${item.points_possible ?? '–'}`, meta);
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
        const preview = element('div', {class: 'course-file-text', role: 'status', 'aria-label': 'Loading preview'}, nebulaLoader(48, 'Loading preview'));
        body.append(preview);
        const here = route;
        request({action: 'courseFile', route: {courseId: route.courseId, kind: 'files', id: String(item.id)}, url: item.url}).then(reply => {
          if (route !== here || !preview.isConnected) return;
          preview.textContent = reply.text + (reply.truncated ? '\n… (preview truncated, open the full file in Original Canvas)' : '');
          preview.removeAttribute('role');
        }).catch(reason => {
          if (route !== here || !preview.isConnected) return;
          preview.textContent = 'Preview unavailable here: ' + friendlyError(reason);
        });
      }
      const actions = element('div', {class: 'course-actions'});
      if (item.url) actions.append(element('a', {href: item.url, target: '_blank', rel: 'noopener noreferrer', class: 'quiet', download: item.display_name || item.filename || ''}, 'Download file'));
      actions.append(nativeButton(path('files', item.id), 'Preview / download in Original Canvas'));
      body.append(actions);
    }
    function courseTitle() {
      if (!route) return null;
      if (data) {
        const name = data.item?.title || data.item?.name || data.item?.display_name || labels[data.view] || labels[route.kind] || 'Course';
        return data.course?.name ? name + ' - ' + data.course.name : name;
      }
      return 'Course';
    }
    function paint() {
      clearScorePoll();
      const style = element('style', {}, css);
      root.replaceChildren(style);
      const headingTitle = courseTitle();
      if (headingTitle) document.title = headingTitle;
      const heading = element('header', {class: 'course-heading'}, element('div', {}, data?.course.name ? element('h1', {}, data.course.name) : null));
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
      if (loading || !data) {const loadingBox = element('div', {class: 'course-loading'}); loadingBox.append(nebulaLoader(96, 'Loading course content')); body.append(loadingBox); return;}
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
      } catch (reason) {if (token === version) error = friendlyError(reason);}
      finally {
        if (token !== version) return;
        loading = false;
        // A quiz-linked assignment page adds nothing over the quiz page itself.
        if (!error && data?.view === 'assignments' && data.item && data.quizId) {navigate(path('quizzes', data.quizId), {replace: true}); return;}
        paint();
      }
    }
    return {
      root,
      show(next) {if (route?.path === next.path) return; clearTake(); clearScorePoll(); route = next; data = null; load();},
      refresh() {if (route) load(true);},
      leave() {++version; route = null; data = null; clearTake(); clearScorePoll(); root.replaceChildren();},
      repaint() {if (route) paint();},
      title: courseTitle
    };
  }
  globalThis.CanvasCourseWorkspace = {create, richText};
})();
