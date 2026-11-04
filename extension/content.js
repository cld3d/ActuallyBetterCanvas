(() => {
  if (document.getElementById('canvas-local-root')) return;
  const host = document.createElement('div');
  host.id = 'canvas-local-root';
  const shadow = host.attachShadow({mode: 'closed'});
  document.body.append(host);
  const style = document.createElement('style');
  style.textContent = `
    :host{--bg:#f3f5f3;--surface:#fafcfb;--ink:#202b24;--muted:#526357;--line:#d4ded7;--accent:#305c42;--on-accent:#f5faf6;--tint:#e6eee8;font:15px/1.5 system-ui,sans-serif;color:var(--ink);color-scheme:light}
    *{box-sizing:border-box}button,input,select,textarea{font:inherit}button,a,input,select,textarea{outline-offset:4px}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #729b7f}button,a{touch-action:manipulation}button{cursor:pointer}button:disabled{opacity:.5;cursor:wait}a{color:inherit}button:active{transform:translateY(1px)}
    .launcher{position:fixed;bottom:24px;left:18px;z-index:10000;border:1px solid var(--line);border-radius:10px;background:var(--accent);color:var(--on-accent);padding:12px 18px;font-weight:650;box-shadow:0 4px 20px #17241a20}
    .workspace{position:fixed;inset:0;z-index:10001;background:var(--bg);display:grid;grid-template-columns:228px 1fr;overflow:auto}.workspace[hidden], [hidden]{display:none!important}
    aside{padding:30px 22px;background:var(--surface);border-right:1px solid var(--line);display:flex;flex-direction:column;gap:28px}.brand{font-size:13px;letter-spacing:.1em;font-weight:750}.local{font-size:11px;color:var(--muted);letter-spacing:0;font-weight:450;margin-top:5px}nav{display:grid;gap:6px}nav a,nav button{display:block;text-decoration:none;text-align:left;border:0;padding:10px 12px;border-radius:8px;background:none;color:var(--muted)}nav .selected{background:var(--tint);color:var(--accent);font-weight:650}.sidebar-note{margin-top:auto;font-size:12px;color:var(--muted)}main{padding:32px clamp(24px,5vw,80px);min-width:0;max-width:1500px;width:100%;margin:auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted);font-size:13px;margin-bottom:46px}.topbar div{display:flex;gap:8px}.quiet{border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:8px 12px;border-radius:8px;white-space:nowrap}.primary{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}h1{font-size:clamp(30px,4vw,46px);letter-spacing:-.045em;line-height:1.15;margin:0 0 12px;font-weight:650}.intro{color:var(--muted);margin:0 0 28px}.stats{display:flex;gap:32px;padding:0 0 30px;border-bottom:1px solid var(--line);margin-bottom:24px}.stats strong{font-size:26px;display:block;font-weight:550;font-variant-numeric:tabular-nums}.stats span{color:var(--muted);font-size:12px}.toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 22px}.toolbar input{flex:1;min-width:160px}.toolbar input,.toolbar select{background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:10px 12px}.group-title{font-size:13px;font-weight:650;margin:24px 0 8px;color:var(--muted)}.row{display:grid;grid-template-columns:28px minmax(0,1fr) 170px 65px;gap:14px;align-items:center;padding:19px 4px;border-bottom:1px solid var(--line)}.check{appearance:none;display:grid;place-content:center;width:21px;height:21px;margin:0;border:1.5px solid var(--muted);border-radius:6px;cursor:pointer;background:var(--surface)}.check:checked{background:var(--accent);border-color:var(--accent)}.check:checked:after{content:'✓';color:var(--on-accent);font-size:15px}.title{text-decoration:none;font-weight:600;overflow-wrap:anywhere}.title:hover{text-decoration:underline}.meta{font-size:12px;color:var(--muted);margin-top:5px}.deadline{font-size:13px;font-variant-numeric:tabular-nums}.deadline small{display:block;color:var(--muted);font-size:11px;margin-top:4px}.edit{color:var(--muted);border:0;background:none;padding:10px}.empty{padding:55px 10px;text-align:center;color:var(--muted)}.notice{padding:12px 16px;border:1px solid var(--line);border-radius:8px;background:var(--tint);margin:18px 0;overflow-wrap:anywhere}.notice:empty{display:none}footer{font-size:12px;color:var(--muted);padding-top:28px}dialog{border:1px solid var(--line);border-radius:14px;padding:30px;background:var(--surface);color:var(--ink);width:min(520px,calc(100vw - 32px));max-height:90dvh;overflow:auto}dialog::backdrop{background:#101c1680}dialog h2{font-size:22px;line-height:1.3;margin:0 0 8px}dialog p{color:var(--muted);font-size:13px}label.field{display:grid;gap:8px;margin:22px 0;font-weight:550;font-size:13px}.field input,.field textarea{padding:11px;border:1px solid var(--line);border-radius:8px;color:var(--ink);background:var(--bg);width:100%}.field textarea{resize:vertical;min-height:90px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}dialog .reset{padding:0;border:0;background:none;color:var(--accent);text-decoration:underline;font-size:12px}.source-status{background:var(--tint);padding:12px;border-radius:8px}
    @media(prefers-color-scheme:dark){:host{--bg:#171e1a;--surface:#1e2821;--ink:#e2eae4;--muted:#a7b9ad;--line:#394a3e;--accent:#acd1b7;--on-accent:#16291d;--tint:#2c3c31;color-scheme:dark}}
    @media(max-width:850px){.workspace{grid-template-columns:1fr}aside{display:none}main{padding:22px}.topbar{margin-bottom:28px}.row{grid-template-columns:26px minmax(0,1fr) 46px}.deadline{grid-column:2;grid-row:2}.edit{grid-column:3;grid-row:1}.stats{gap:24px}.topbar{align-items:flex-start}.topbar div{flex-wrap:wrap;justify-content:flex-end}}
  `;
  shadow.append(style);
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else if (key === 'class') node.className = value;
      else node.setAttribute(key, value);
    }
    node.append(...children.filter(x => x != null));
    return node;
  }
  let state = {assignments: []}, view = 'open', query = '', course = '', loading = false, opened = false, previousFocus;
  const launcher = el('button', {class: 'launcher', onclick: () => open()}, 'My workspace');
  const notice = el('div', {class: 'notice', role: 'status', 'aria-live': 'polite'});
  const syncLabel = el('span', {}, 'Connecting to local feed…');
  const stats = el('div', {class: 'stats'}), list = el('div', {});
  const search = el('input', {type: 'search', placeholder: 'Find an assignment…', 'aria-label': 'Search assignments', oninput: e => {query = e.target.value; render();}});
  const courseSelect = el('select', {'aria-label': 'Filter by course', onchange: e => {course = e.target.value; render();}}, el('option', {value: ''}, 'All courses'));
  const viewSelect = el('select', {'aria-label': 'Completion filter', onchange: e => {view = e.target.value; render();}}, el('option', {value: 'open'}, 'To do'), el('option', {value: 'completed'}, 'Completed'), el('option', {value: 'all'}, 'Everything'));
  const syncButton = el('button', {class: 'quiet', onclick: () => refresh(true)}, 'Sync now');
  const workspace = el('section', {class: 'workspace', hidden: '', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Canvas Local workspace'},
    el('aside', {}, el('div', {class: 'brand'}, 'CANVAS LOCAL', el('div', {class: 'local'}, 'A little more breathing room.')),
      el('nav', {'aria-label': 'Canvas navigation'}, el('button', {class: 'selected', onclick: () => {viewSelect.value = view = 'open'; render();}}, 'My workspace'),
        el('a', {href: '/courses'}, 'Courses'), el('a', {href: '/calendar'}, 'Canvas calendar'), el('a', {href: '/conversations'}, 'Inbox'), el('button', {onclick: close}, 'Original Canvas')),
      el('p', {class: 'sidebar-note'}, 'Stored on this laptop.\nSynced while Brave is open.')),
    el('main', {}, el('div', {class: 'topbar'}, syncLabel, el('div', {}, syncButton, el('button', {class: 'quiet', onclick: close}, 'Original Canvas'))),
      el('h1', {tabindex: '-1'}, 'A clearer view of what’s next.'), el('p', {class: 'intro'}, 'Your assignments, with room to work on your own terms.'), stats,
      el('div', {class: 'toolbar'}, search, courseSelect, viewSelect), notice, list,
      el('footer', {}, 'Personal deadlines stay yours. Checking off work never submits it to Canvas. Grades never complete assignments.')));
  shadow.append(launcher, workspace);
  let inertElements = [];
  function close() {
    opened = false; workspace.hidden = true; launcher.hidden = false;
    document.body.style.overflow = priorOverflow;
    for (const [node, wasInert] of inertElements) node.inert = wasInert;
    inertElements = [];
    if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus();
    else launcher.focus();
  }
  let priorOverflow = '';
  function open() {
    if (opened) return;
    previousFocus = document.activeElement;
    priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inertElements = [...document.body.children].filter(node => node !== host).map(node => [node, node.inert]);
    for (const [node] of inertElements) node.inert = true;
    opened = true; workspace.hidden = false; launcher.hidden = true;
    workspace.querySelector('h1').focus();
    refresh();
  }
  async function request(message) {
    const reply = await chrome.runtime.sendMessage(message);
    if (!reply?.ok) throw new Error(reply?.error || 'Local feed did not respond.');
    return reply;
  }
  function ingest(reply) {
    state = reply.state;
    syncLabel.textContent = state.lastSync ? 'Last synced ' + new Date(state.lastSync).toLocaleString() : 'Not synced yet';
    notice.textContent = reply.warning || reply.lastError || state.syncError || '';
    const selected = courseSelect.value;
    courseSelect.replaceChildren(el('option', {value: ''}, 'All courses'), ...[...new Set(state.assignments.map(a => a.course))].sort().map(name => el('option', {value: name}, name)));
    courseSelect.value = selected;
    render();
  }
  async function refresh(force = false) {
    if (loading) return;
    loading = true; syncButton.disabled = true;
    if (!state.assignments.length) list.replaceChildren(el('div', {class: 'empty'}, 'Reading the local assignment feed…'));
    try { ingest(await request({action: force ? 'sync' : 'list'})); }
    catch (error) { notice.textContent = error.message; render(); }
    finally {loading = false; syncButton.disabled = false;}
  }
  const formatDate = value => value ? new Date(value).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}) : 'No deadline';
  function bucket(item) {
    if (item.completed) return 'Completed';
    if (!item.effectiveDue) return 'No deadline';
    const due = new Date(item.effectiveDue), today = new Date();
    if (due < today) return 'Overdue';
    if (due.toDateString() === today.toDateString()) return 'Today';
    return 'Coming up';
  }
  function render() {
    const openItems = state.assignments.filter(a => !a.completed);
    stats.replaceChildren(...[[openItems.length, 'to do'], [openItems.filter(a => bucket(a) === 'Today').length, 'due today'], [openItems.filter(a => bucket(a) === 'Overdue').length, 'overdue']].map(([count, label]) => el('div', {}, el('strong', {}, String(count)), el('span', {}, label))));
    const items = state.assignments.filter(a => (view === 'all' || a.completed === (view === 'completed')) && (!course || a.course === course) && (a.title + ' ' + a.course).toLowerCase().includes(query.toLowerCase()));
    list.replaceChildren();
    if (!items.length) {
      list.append(el('div', {class: 'empty'}, state.assignments.length ? 'Nothing here. Try another filter, or enjoy the breathing room.' : 'No assignments cached yet. Connect your Canvas website from the extension icon, then sync.'));
      return;
    }
    for (const group of ['Overdue', 'Today', 'Coming up', 'No deadline', 'Completed']) {
      const members = items.filter(a => bucket(a) === group);
      if (!members.length) continue;
      list.append(el('h2', {class: 'group-title'}, group + ' · ' + members.length));
      for (const item of members) {
        const checkbox = el('input', {type: 'checkbox', class: 'check', 'aria-label': (item.completed ? 'Reopen ' : 'Complete ') + item.title});
        checkbox.checked = item.completed;
        checkbox.addEventListener('change', async () => {
          checkbox.disabled = true;
          try { ingest(await request({action: 'update', uid: item.uid, patch: {completion: checkbox.checked}})); }
          catch (error) { checkbox.checked = item.completed; notice.textContent = error.message; checkbox.disabled = false; }
        });
        list.append(el('article', {class: 'row'}, checkbox,
          el('div', {}, el('a', {class: 'title', href: item.url}, item.title), el('div', {class: 'meta'}, item.course + ' · ' + (item.submitted ? 'Submitted in Canvas' : 'Not submitted') + (item.graded ? ' · Graded' : '') + (item.completionOverride !== null ? ' · Manual status' : ''))),
          el('div', {class: 'deadline'}, formatDate(item.effectiveDue), el('small', {}, item.dueOverride ? 'Personal deadline' : 'Canvas deadline')),
          el('button', {class: 'edit', 'aria-label': 'Edit ' + item.title, onclick: () => edit(item)}, 'Edit')));
      }
    }
  }
  function edit(item) {
    const dialog = el('dialog', {'aria-labelledby': 'edit-heading'});
    const due = el('input', {type: 'datetime-local', step: '1'});
    if (item.effectiveDue) {
      const date = new Date(item.effectiveDue);
      due.value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    }
    const notes = el('textarea', {maxlength: '20000'}); notes.value = item.notes;
    let follow = false, dirtyDue = false;
    due.addEventListener('input', () => {dirtyDue = true; follow = false;});
    const error = el('p', {role: 'alert'});
    const save = el('button', {class: 'quiet primary', type: 'submit'}, 'Save changes');
    const form = el('form', {}, el('h2', {id: 'edit-heading'}, item.title), el('p', {}, item.course),
      el('p', {class: 'source-status'}, 'Canvas deadline: ' + formatDate(item.canvasDue) + '. ' + (item.submitted ? 'Submitted.' : 'Not submitted.') + ' Grades do not affect completion.'),
      el('label', {class: 'field'}, 'Personal deadline (this laptop’s time zone)', due),
      el('button', {class: 'reset', type: 'button', onclick: () => {follow = true; dirtyDue = false; due.value = ''; error.textContent = 'Will follow the Canvas deadline when saved.';}}, 'Follow Canvas deadline'),
      el('p', {}, 'Leave the deadline empty to remove it personally. Canvas itself is never changed.'),
      el('label', {class: 'field'}, 'Personal notes', notes),
      el('button', {class: 'reset', type: 'button', onclick: async e => {
        e.target.disabled = true;
        try { ingest(await request({action: 'update', uid: item.uid, patch: {completion: null}})); dialog.close(); }
        catch (err) {error.textContent = err.message; e.target.disabled = false;}
      }}, 'Follow Canvas submission status'), error,
      el('div', {class: 'actions'}, save, el('button', {class: 'quiet', type: 'button', onclick: () => dialog.close()}, 'Cancel')));
    form.addEventListener('submit', async event => {
      event.preventDefault(); save.disabled = true;
      try {
        const patch = {notes: notes.value};
        if (follow) patch.followCanvasDue = true;
        else if (dirtyDue) patch.personalDue = due.value ? new Date(due.value).toISOString() : null;
        ingest(await request({action: 'update', uid: item.uid, patch})); dialog.close();
      } catch (err) {error.textContent = err.message; save.disabled = false;}
    });
    dialog.append(form); shadow.append(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();
  }
  // Local cache refresh, not a network poll. Background alarms own Canvas fetching.
  setInterval(() => {if (opened && !document.hidden && !shadow.querySelector('dialog')) refresh();}, 30000);
  shadow.addEventListener('keydown', event => {
    if (event.key === 'Escape' && opened && !shadow.querySelector('dialog')) close();
  });
  if (['/', '/dashboard', '/dashboard/'].includes(location.pathname)) open();
})();
