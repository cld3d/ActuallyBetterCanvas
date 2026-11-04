(() => {
  if (document.getElementById('canvas-local-root')) return;
  const host = document.createElement('div');
  host.id = 'canvas-local-root';
  const shadow = host.attachShadow({mode: 'closed'});
  document.body.append(host);
  const style = document.createElement('style');
  style.textContent = `
    :host{--bg:#f3f5f3;--surface:#fafcfb;--ink:#202b24;--muted:#526357;--line:#d4ded7;--accent:#305c42;--on-accent:#f5faf6;--tint:#e6eee8;font:15px/1.5 system-ui,sans-serif;color:var(--ink);color-scheme:light}
    *{box-sizing:border-box}button,input,select,textarea{font:inherit}button,a{touch-action:manipulation}button{cursor:pointer}button:disabled{opacity:.5;cursor:wait}a{color:inherit}button:active{transform:translateY(1px)}
    .launcher{position:fixed;bottom:24px;left:18px;z-index:10000;border:1px solid var(--line);border-radius:10px;background:var(--accent);color:var(--on-accent);padding:12px 18px;font-weight:650;box-shadow:0 4px 20px #17241a20}
    .workspace{position:fixed;inset:0;z-index:10001;background:var(--bg);display:grid;grid-template-columns:228px 1fr;overflow:auto}.workspace[hidden], [hidden]{display:none!important}
    aside{padding:30px 22px;background:var(--surface);border-right:1px solid var(--line);display:flex;flex-direction:column;gap:28px}.brand{font-size:13px;letter-spacing:.1em;font-weight:750}.local{font-size:11px;color:var(--muted);letter-spacing:0;font-weight:450;margin-top:5px}nav{display:grid;gap:6px}nav a,nav button{display:block;text-decoration:none;text-align:left;border:0;padding:10px 12px;border-radius:8px;background:none;color:var(--muted)}nav .selected{background:var(--tint);color:var(--accent);font-weight:650}.sidebar-note{margin-top:auto;font-size:12px;color:var(--muted)}main{padding:32px clamp(24px,5vw,80px);min-width:0;max-width:1500px;width:100%;margin:auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted);font-size:13px;margin-bottom:46px}.topbar div{display:flex;gap:8px}.quiet{border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:8px 12px;border-radius:8px;white-space:nowrap}.primary{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}h1{font-size:clamp(30px,4vw,46px);letter-spacing:-.045em;line-height:1.15;margin:0 0 12px;font-weight:650}.intro{color:var(--muted);margin:0 0 28px}.stats{display:flex;gap:32px;padding:0 0 30px;border-bottom:1px solid var(--line);margin-bottom:24px}.stats strong{font-size:26px;display:block;font-weight:550;font-variant-numeric:tabular-nums}.stats span{color:var(--muted);font-size:12px}.toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 22px}.toolbar input{flex:1;min-width:160px}.toolbar input,.toolbar select{background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:10px 12px}.group-title{font-size:13px;font-weight:650;margin:24px 0 8px;color:var(--muted)}.row{display:grid;grid-template-columns:28px minmax(0,1fr) 170px 65px;gap:14px;align-items:center;padding:19px 4px;border-bottom:1px solid var(--line)}.check{appearance:none;display:grid;place-content:center;width:21px;height:21px;margin:0;border:1.5px solid var(--muted);border-radius:6px;cursor:pointer;background:var(--surface)}.check:checked{background:var(--accent);border-color:var(--accent)}.check:checked:after{content:'✓';color:var(--on-accent);font-size:15px}.title{text-decoration:none;font-weight:600;overflow-wrap:anywhere}.title:hover{text-decoration:underline}.meta{font-size:12px;color:var(--muted);margin-top:5px}.deadline{font-size:13px;font-variant-numeric:tabular-nums}.deadline small{display:block;color:var(--muted);font-size:11px;margin-top:4px}.edit{color:var(--muted);border:0;background:none;padding:10px}.empty{padding:55px 10px;text-align:center;color:var(--muted)}.notice{padding:12px 16px;border:1px solid var(--line);border-radius:8px;background:var(--tint);margin:18px 0;overflow-wrap:anywhere}.notice:empty{display:none}footer{font-size:12px;color:var(--muted);padding-top:28px}dialog{border:1px solid var(--line);border-radius:14px;padding:30px;background:var(--surface);color:var(--ink);width:min(520px,calc(100vw - 32px));max-height:90dvh;overflow:auto}dialog::backdrop{background:#101c1680}dialog h2{font-size:22px;line-height:1.3;margin:0 0 8px}dialog p{color:var(--muted);font-size:13px}label.field{display:grid;gap:8px;margin:22px 0;font-weight:550;font-size:13px}.field input,.field textarea{padding:11px;border:1px solid var(--line);border-radius:8px;color:var(--ink);background:var(--bg);width:100%}.field textarea{resize:vertical;min-height:90px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}dialog .reset{padding:0;border:0;background:none;color:var(--accent);text-decoration:underline;font-size:12px}.source-status{background:var(--tint);padding:12px;border-radius:8px}
    @media(prefers-color-scheme:dark){:host{--bg:#171e1a;--surface:#1e2821;--ink:#e2eae4;--muted:#a7b9ad;--line:#394a3e;--accent:#acd1b7;--on-accent:#16291d;--tint:#2c3c31;color-scheme:dark}}
    /* Layers: workspace above Canvas; filter above content; native dialog in top layer. */
    .workspace{grid-template-columns:220px minmax(0,1fr)}aside{position:sticky;top:0;height:100dvh;padding:34px 18px;gap:44px}.brand{padding:0 12px;letter-spacing:.08em;font-size:12px}.local{font-size:20px;font-weight:650;letter-spacing:.02em;color:var(--accent);margin-top:2px}main{align-self:start;margin:0 auto;padding-top:30px;padding-bottom:70px}.topbar{margin-bottom:42px}.intro{max-width:65ch}h1:focus{outline:none}nav button{font-size:14px;padding:12px 14px;position:relative}nav .selected:before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:3px;background:var(--accent);border-radius:3px}
    button,a,input,textarea{transition:background-color .18s,border-color .18s,color .18s,box-shadow .18s,transform .18s,opacity .18s}button:hover:not(:disabled),.course-link:hover{background:var(--tint)}button.primary:hover{background:var(--accent);opacity:.9}.launcher:hover{background:var(--accent);transform:translateY(-2px)}button:active:not(:disabled){transform:scale(.97)}.quiet{font-size:13px;font-weight:550;padding:9px 14px}.stats{gap:44px;margin-bottom:26px}.stats strong{font-size:30px;letter-spacing:-.04em}.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:20px}.tabs button{background:none;border:0;padding:12px 18px;color:var(--muted);position:relative;font-weight:550;font-size:14px}.tabs button[aria-selected=true]{color:var(--accent)}.tabs button[aria-selected=true]:after{content:'';position:absolute;bottom:-1px;left:12px;right:12px;height:2px;background:var(--accent);border-radius:2px}.toolbar{align-items:start}.toolbar input{width:0;min-width:140px}.toolbar input:focus{border-color:var(--accent)}.custom-select{position:relative;min-width:180px;max-width:100%}.select-trigger{display:flex;justify-content:space-between;gap:18px;width:100%;padding:11px 14px;text-align:left;white-space:normal}.select-trigger:after{content:'⌄';margin-left:auto}.select-options{position:absolute;top:calc(100% + 6px);right:0;min-width:100%;width:max-content;max-width:min(340px,80vw);max-height:300px;overflow:auto;z-index:2;border:1px solid var(--line);border-radius:10px;padding:5px;background:var(--surface);box-shadow:0 12px 32px #17241a24}.select-options button{display:block;width:100%;text-align:left;border:0;background:none;color:var(--ink);padding:10px 12px;border-radius:6px;white-space:normal}.select-options button[aria-selected=true]{background:var(--tint);color:var(--accent);font-weight:650}.row{padding:18px 12px;border-radius:9px;transition:background-color .2s,opacity .2s}.row:hover{background:var(--surface)}.row[data-completed=true] .title{color:var(--muted)}.completing .title{text-decoration:line-through;color:var(--muted)}.check{transition:transform .2s,background-color .2s}.check:hover{border-color:var(--accent);transform:scale(1.08)}.edit{border-radius:7px}.group-title{display:flex;align-items:center;gap:12px;margin:26px 0 6px}.group-title:after{content:'';height:1px;background:var(--line);flex:1;margin-left:8px}.empty{padding:64px 20px;border:1px dashed var(--line);border-radius:12px;margin-top:20px}.page-content{min-width:0}.page-content h2{font-size:20px;letter-spacing:-.025em;font-weight:600}.course-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.course-card{padding:26px;border:1px solid var(--line);border-radius:14px;background:var(--surface);min-width:0;display:flex;flex-direction:column}.course-card h2{margin:12px 0 6px;overflow-wrap:anywhere}.course-code{font-size:12px;color:var(--accent);font-weight:650;overflow-wrap:anywhere}.course-card progress{width:100%;height:5px;border:0;border-radius:4px;margin-top:18px;accent-color:var(--accent)}progress::-webkit-progress-bar{background:var(--tint);border-radius:4px}progress::-webkit-progress-value{background:var(--accent);border-radius:4px}.next-task{font-size:13px;color:var(--muted);margin:18px 0 4px}.course-card .actions{margin-top:auto;padding-top:20px}.course-link{text-decoration:none;display:inline-block;border:1px solid var(--line);border-radius:8px}.calendar-controls{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:10px 0 20px}.calendar-controls h2{margin:0}.calendar-controls .actions{margin:0;gap:6px}.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden}.weekday{padding:10px 4px;text-align:center;background:var(--bg);font-size:12px;color:var(--muted)}.calendar-day{min-width:0;min-height:108px;padding:10px;border:0;background:var(--surface);color:var(--ink);text-align:left;display:flex;flex-direction:column;gap:5px;position:relative;isolation:isolate}.calendar-day>span:first-child{font-size:13px;font-weight:600}.calendar-day[aria-pressed=true]{box-shadow:inset 0 0 0 2px var(--accent);background:var(--tint)}.calendar-day.today>span:first-child{color:var(--on-accent);background:var(--accent);padding:0 5px;border-radius:4px;align-self:start}.calendar-day.outside{color:var(--muted);background:var(--bg)}.day-count{position:absolute;right:8px;top:10px;font-size:10px;color:var(--accent);font-weight:650}.day-task{display:block;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;color:var(--muted)}.agenda{margin-top:30px}.agenda h2{margin-bottom:10px}.inbox-layout{display:grid;grid-template-columns:minmax(220px, .85fr) minmax(0,1.5fr);border:1px solid var(--line);border-radius:14px;background:var(--surface);overflow:hidden;min-height:420px}.threads{border-right:1px solid var(--line);max-height:70dvh;overflow:auto}.thread{display:flex;flex-direction:column;gap:7px;background:none;color:var(--ink);border:0;border-bottom:1px solid var(--line);text-align:left;padding:20px;width:100%;overflow-wrap:anywhere}.thread[aria-pressed=true]{background:var(--tint)}.thread.unread strong:before{content:'';display:inline-block;width:6px;height:6px;background:var(--accent);border-radius:50%;margin-right:8px}.preview{font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--muted)}.reader{padding:26px;min-width:0}.reader h2{overflow-wrap:anywhere;margin-top:0}.reader .empty{border:0}.message{padding:22px 0;border-bottom:1px solid var(--line);font-size:14px}.message-body{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7}.skeleton{display:grid;gap:14px;margin:24px 0}.skeleton>div{height:72px;border-radius:10px;background:var(--tint)}
    @keyframes enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes breathe{50%{opacity:.45}}
    @media(prefers-reduced-motion:no-preference){.workspace:not([hidden]) main{animation:enter .3s ease-out}.select-options:not([hidden]),dialog[open]{animation:enter .18s ease-out}.tabs button[aria-selected=true]:after{animation:enter .18s ease-out}.skeleton>div{animation:breathe 1.4s ease-in-out infinite}}
    /* Hide scrollbars only inside this Shadow DOM; preserve normal scrolling. */
    *{scrollbar-width:none}*::-webkit-scrollbar{display:none}
    .brand{display:grid;gap:0;padding:0 12px;line-height:1;letter-spacing:0;color:var(--ink)}.brand-prefix{font-size:12px;font-weight:450;letter-spacing:-.015em;color:var(--muted);margin-bottom:5px}.brand-prefix strong{font-weight:650;color:var(--accent)}.brand-name{font-size:35px;font-weight:750;line-height:1.05;letter-spacing:-.065em}
    .calendar-day[aria-pressed=true]{box-shadow:none}
    /* Task rows are content, not clickable cards: keep dividers straight and surfaces still. */
    .row,.row:hover{border-radius:0;background:transparent;transition:opacity .2s}
    /* Tab hover feedback belongs to the label, not a filled button surface. */
    .tabs button:hover:not(:disabled){background:transparent;color:var(--accent);opacity:.75}.tabs button:focus-visible{background:transparent;text-decoration:underline;text-underline-offset:4px}
    /* One shared underline moves between tabs instead of remounting on each selection. */
    .tabs{position:relative}.tabs button[aria-selected=true]:after{display:none}.tab-indicator{position:absolute;bottom:-1px;left:0;width:1px;height:2px;background:var(--accent);border-radius:2px;transform-origin:left;pointer-events:none;transition:transform .28s cubic-bezier(.2,.8,.2,1)}
    /* Sidebar selection uses one moving rule, without a filled active surface. */
    nav{position:relative}nav button.selected,nav button.selected:hover,nav button.selected:focus-visible{background:transparent}nav .selected:before{display:none}.sidebar-indicator{position:absolute;top:0;left:0;width:3px;height:1px;background:var(--accent);border-radius:3px;transform-origin:top;pointer-events:none;transition:transform .28s cubic-bezier(.2,.8,.2,1)}
    nav button:hover:not(:disabled){background:transparent;color:var(--accent);opacity:.75}
    /* Keep keyboard location visible without the browser's large focus rectangles. */
    *:focus,*:focus-visible{outline:none}button:focus-visible{background:var(--tint);color:var(--accent)}button.primary:focus-visible,.launcher:focus-visible{background:var(--accent);color:var(--on-accent);text-decoration:underline;text-underline-offset:4px}a:focus-visible{text-decoration:underline;text-underline-offset:4px}.check:focus-visible{border-color:var(--accent);background:var(--tint)}.check:checked:focus-visible{background:var(--accent)}input:focus-visible,textarea:focus-visible{border-color:var(--accent)}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
    @media(max-width:850px){.workspace{grid-template-columns:minmax(0,1fr);display:block}aside{position:static;height:auto;padding:16px 22px;gap:16px;border-right:0;border-bottom:1px solid var(--line)}.brand{font-size:10px;padding:0}.local{font-size:13px;display:inline;margin-left:6px}nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}nav button{text-align:center;padding:10px 4px;font-size:12px}nav .selected:before{display:none}main{padding:22px}.topbar{margin-bottom:28px;align-items:flex-start;gap:8px}.topbar>span{max-width:45%;font-size:11px}.topbar div{flex-wrap:wrap;justify-content:flex-end}.topbar .quiet{font-size:11px;padding:8px}.row{grid-template-columns:26px minmax(0,1fr) 46px;gap:10px;padding:16px 4px}.deadline{grid-column:2;grid-row:2}.edit{grid-column:3;grid-row:1}.stats{gap:24px}.stats strong{font-size:26px}.course-grid{grid-template-columns:1fr}.inbox-layout{grid-template-columns:minmax(0,1fr)}.threads{border-right:0;border-bottom:1px solid var(--line);max-height:300px}.reader{padding:20px}.calendar-day{min-height:70px;padding:8px 5px}.day-task{display:none}.day-count{top:auto;bottom:8px;right:auto;left:5px}.calendar-controls{align-items:center}.calendar-controls h2{font-size:18px}.calendar-controls .quiet{padding:8px 10px}.custom-select{min-width:140px}.toolbar input{min-width:130px}h1{font-size:32px}.tabs button{flex:1}}
    @media(max-width:850px){.brand{display:flex;align-items:baseline;gap:8px;padding:0}.brand-prefix{margin:0}.brand-name{font-size:24px}}
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
  const routePages = {'/': 'tasks', '/dashboard': 'tasks', '/courses': 'courses', '/calendar': 'calendar', '/conversations': 'inbox'};
  const pagePaths = {tasks: '/dashboard', courses: '/courses', calendar: '/calendar', inbox: '/conversations'};
  const sourceRoute = location.pathname + location.search;
  const currentRoutePage = () => routePages[location.pathname.replace(/\/$/, '') || '/'];
  // Tab-scoped and origin-scoped: choosing Original Canvas survives its page navigations.
  // Storage may be blocked by the browser; workspace controls must still work in that case.
  const modeKey = 'actually-better-canvas-mode';
  function rememberMode(mode) {try {sessionStorage.setItem(modeKey, mode);} catch {}}
  function originalMode() {try {return sessionStorage.getItem(modeKey) === 'original';} catch {return false;}}
  let state = {assignments: []}, view = 'open', query = '', course = '', loading = false, opened = false, previousFocus;
  let page = currentRoutePage() || 'tasks';
  let catalog = null, conversations = null, remoteLoading = false, remoteError = '', selectedConversation = null, conversationLoading = false, conversationVersion = 0;
  let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1), selectedDay = new Date();
  const pending = new Set();
  const launcher = el('button', {class: 'launcher', onclick: () => {page = currentRoutePage() || page; render(); open();}}, 'Actually Better Canvas');
  const notice = el('div', {class: 'notice', role: 'status', 'aria-live': 'polite'});
  const syncLabel = el('span', {}, 'Connecting to local feed…');
  const list = el('div', {});
  const search = el('input', {type: 'search', placeholder: 'Find an assignment…', 'aria-label': 'Search assignments', oninput: e => {query = e.target.value; render();}});
  const courseOptions = el('div', {class: 'select-options', id: 'course-options', role: 'listbox', 'aria-label': 'Courses', hidden: ''});
  const courseButton = el('button', {class: 'quiet select-trigger', 'aria-label': 'Filter by course', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': 'course-options', onclick: () => toggleCourses()}, 'All courses');
  const courseSelect = el('div', {class: 'custom-select'}, courseButton, courseOptions);
  function selectView(value) {
    view = value; render();
    motion(page === 'calendar' ? pageContent : taskPanel, [{opacity: 0, transform: 'translateY(5px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 180});
  }
  const tabs = el('div', {class: 'tabs', role: 'tablist', 'aria-label': 'Completion filter'}, ...[['open', 'To do'], ['completed', 'Completed']].map(([value, label]) => el('button', {role: 'tab', id: 'tab-' + value, 'aria-controls': 'task-panel', onclick: () => selectView(value)}, label)));
  const tabIndicator = el('span', {class: 'tab-indicator', 'aria-hidden': 'true'});
  tabs.append(tabIndicator);
  function positionTabIndicator() {
    const selected = tabs.querySelector('[aria-selected="true"]');
    if (tabs.hidden || !selected || !selected.offsetWidth) return;
    tabIndicator.style.transform = `translateX(${selected.offsetLeft + 12}px) scaleX(${Math.max(0, selected.offsetWidth - 24)})`;
  }
  new ResizeObserver(positionTabIndicator).observe(tabs);
  tabs.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); view = event.key === 'Home' ? 'open' : event.key === 'End' ? 'completed' : view === 'open' ? 'completed' : 'open';
      selectView(view); tabs.querySelector('[aria-selected="true"]').focus();
    }
  });
  const syncButton = el('button', {class: 'quiet', onclick: () => {refresh(true); if (page === 'courses' || page === 'inbox') loadRemote(true);}}, 'Sync now');
  const toolbar = el('div', {class: 'toolbar'}, search, courseSelect);
  const taskPanel = el('section', {id: 'task-panel', role: 'tabpanel'}, list);
  const pageContent = el('div', {class: 'page-content'});
  const navigation = el('nav', {'aria-label': 'Canvas navigation'}, ...[['tasks', 'Tasks'], ['courses', 'Courses'], ['calendar', 'Calendar'], ['inbox', 'Inbox']].map(([value, label]) => el('button', {'data-page': value, onclick: () => navigate(value)}, label)));
  const sidebarIndicator = el('span', {class: 'sidebar-indicator', 'aria-hidden': 'true'});
  navigation.append(sidebarIndicator);
  function positionSidebarIndicator() {
    const selected = navigation.querySelector('[aria-current="page"]');
    if (!selected?.offsetHeight) return;
    sidebarIndicator.style.transform = `translate(${selected.offsetLeft}px, ${selected.offsetTop + 12}px) scaleY(${Math.max(0, selected.offsetHeight - 24)})`;
  }
  new ResizeObserver(positionSidebarIndicator).observe(navigation);
  const main = el('main', {tabindex: '-1'}, el('div', {class: 'topbar'}, syncLabel, el('div', {}, syncButton, el('button', {class: 'quiet', onclick: close}, 'Original Canvas'))),
    tabs, toolbar, notice, taskPanel, pageContent);
  const workspace = el('section', {class: 'workspace', hidden: '', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Canvas Local workspace'},
    el('aside', {}, el('div', {class: 'brand', role: 'img', 'aria-label': 'Actually Better Canvas'},
      el('span', {class: 'brand-prefix', 'aria-hidden': 'true'}, 'actually ', el('strong', {}, 'better')),
      el('span', {class: 'brand-name', 'aria-hidden': 'true'}, 'canvas')), navigation),
    main);
  shadow.append(launcher, workspace);
  let inertElements = [];
  function close() {
    rememberMode('original');
    // Workspace routing leaves the Canvas document underneath on its original route.
    // Keep the overlay visible until the matching Original Canvas document loads.
    if (location.pathname + location.search !== sourceRoute) {location.reload(); return;}
    opened = false; workspace.hidden = true; launcher.hidden = false;
    document.body.style.overflow = priorOverflow;
    for (const [node, wasInert] of inertElements) node.inert = wasInert;
    inertElements = [];
    if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus();
    else launcher.focus();
  }
  let priorOverflow = '';
  let feedQueue = Promise.resolve(), feedVersion = 0, appliedFeedVersion = 0;
  function open() {
    if (opened) return;
    rememberMode('workspace');
    previousFocus = document.activeElement;
    priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inertElements = [...document.body.children].filter(node => node !== host).map(node => [node, node.inert]);
    for (const [node] of inertElements) node.inert = true;
    opened = true; workspace.hidden = false; launcher.hidden = true;
    positionTabIndicator();
    positionSidebarIndicator();
    main.focus();
    refresh();
    loadRemote();
  }
  async function request(message) {
    if (['list', 'sync', 'update'].includes(message.action)) {
      const version = ++feedVersion;
      const operation = feedQueue.then(() => sendRequest(message));
      feedQueue = operation.catch(() => {});
      return {...await operation, feedVersion: version};
    }
    return sendRequest(message);
  }
  async function sendRequest(message) {
    const reply = await chrome.runtime.sendMessage(message);
    if (!reply?.ok) throw new Error(reply?.error || 'Local feed did not respond.');
    return reply;
  }
  function navigate(value, updateURL = true) {
    if (updateURL && currentRoutePage() !== value) history.pushState(null, '', pagePaths[value]);
    page = value; remoteError = ''; toggleCourses(false); render(); main.focus(); loadRemote();
    motion(page === 'tasks' ? taskPanel : pageContent, [{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'translateY(0)'}]);
  }
  window.addEventListener('popstate', () => {
    if (!opened) return;
    const target = currentRoutePage();
    if (target) navigate(target, false);
    else close();
  });
  function toggleCourses(show = courseOptions.hidden) {
    courseOptions.hidden = !show; courseButton.setAttribute('aria-expanded', String(show));
    if (show) courseOptions.querySelector('[aria-selected="true"]')?.focus();
  }
  function renderCoursesFilter() {
    courseButton.textContent = course || 'All courses';
    courseOptions.replaceChildren(...['', ...new Set(state.assignments.map(a => a.course))].sort().map(name => {
      const option = el('button', {role: 'option', 'aria-selected': String(course === name), tabindex: course === name ? '0' : '-1', onclick: () => {
        course = name; toggleCourses(false); render(); courseButton.focus();
      }}, name || 'All courses');
      return option;
    }));
  }
  courseSelect.addEventListener('keydown', event => {
    const options = [...courseOptions.children];
    if (event.key === 'Escape' && !courseOptions.hidden) {event.preventDefault(); event.stopPropagation(); toggleCourses(false); courseButton.focus();}
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (courseOptions.hidden) {toggleCourses(true); return;}
      const current = options.indexOf(shadow.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      options[next]?.focus();
    }
  });
  shadow.addEventListener('click', event => {if (!courseSelect.contains(event.target)) toggleCourses(false);});
  courseSelect.addEventListener('focusout', event => {if (!courseSelect.contains(event.relatedTarget)) toggleCourses(false);});
  async function loadRemote(force = false) {
    const target = page;
    if (!['courses', 'inbox'].includes(target) || remoteLoading || (!force && (target === 'courses' ? catalog : conversations))) return;
    remoteLoading = true; remoteError = ''; render();
    try {
      const reply = await request({action: target});
      if (target === 'courses') catalog = reply.courses;
      else conversations = reply.conversations;
    } catch (error) {remoteError = error.message;}
    finally {remoteLoading = false; render(); if (target !== page) loadRemote();}
  }
  function ingest(reply) {
    // Exit animations can finish out of order. Never let an older reply undo newer UI state.
    if (reply.feedVersion < appliedFeedVersion) {render(); return;}
    appliedFeedVersion = reply.feedVersion;
    state = reply.state;
    syncLabel.textContent = state.lastSync ? 'Last synced ' + new Date(state.lastSync).toLocaleString() : 'Not synced yet';
    notice.textContent = reply.warning || reply.lastError || state.syncError || '';
    if (course && !state.assignments.some(a => a.course === course)) course = '';
    renderCoursesFilter();
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
  function bucket(item, today = new Date()) {
    if (item.completed) return 'Completed';
    if (!item.effectiveDue) return 'No deadline';
    const due = new Date(item.effectiveDue);
    if (due < today) return 'Overdue';
    if (due.toDateString() === today.toDateString()) return 'Today';
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    if (due.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    // Use local calendar boundaries, not fixed 24-hour offsets, to handle DST.
    const nextMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + ((8 - today.getDay()) % 7 || 7));
    if (due < nextMonday) return 'This week';
    return 'Coming up';
  }
  function render() {
    main.setAttribute('aria-label', {tasks: 'Tasks', courses: 'Courses', calendar: 'Calendar', inbox: 'Inbox'}[page]);
    for (const button of navigation.querySelectorAll('[data-page]')) {
      button.classList.toggle('selected', button.dataset.page === page);
      if (button.dataset.page === page) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    }
    positionSidebarIndicator();
    for (const tab of tabs.querySelectorAll('[role="tab"]')) {const selected = tab.id === 'tab-' + view; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;}
    taskPanel.setAttribute('aria-labelledby', 'tab-' + view);
    for (const tab of tabs.querySelectorAll('[role="tab"]')) tab.setAttribute('aria-controls', page === 'calendar' ? 'calendar-panel' : 'task-panel');
    pageContent.id = page === 'calendar' ? 'calendar-panel' : 'page-content';
    if (page === 'calendar') {pageContent.setAttribute('role', 'tabpanel'); pageContent.setAttribute('aria-labelledby', 'tab-' + view);}
    else {pageContent.removeAttribute('role'); pageContent.removeAttribute('aria-labelledby');}
    tabs.hidden = toolbar.hidden = taskPanel.hidden = !['tasks', 'calendar'].includes(page);
    taskPanel.hidden = page !== 'tasks'; pageContent.hidden = page === 'tasks';
    pageContent.setAttribute('aria-busy', String(remoteLoading && ['courses', 'inbox'].includes(page)));
    positionTabIndicator();
    renderCoursesFilter();
    if (page === 'courses') {renderCatalog(); return;}
    if (page === 'inbox') {renderInbox(); return;}
    if (page === 'calendar') {renderCalendar(); return;}
    const items = filteredItems();
    list.replaceChildren();
    if (!items.length) {
      list.append(el('div', {class: 'empty'}, state.assignments.length ? 'Nothing here. Try another filter, or enjoy the breathing room.' : 'No assignments cached yet. Connect your Canvas website from the extension icon, then sync.'));
      return;
    }
    for (const group of ['Overdue', 'Today', 'Tomorrow', 'This week', 'Coming up', 'No deadline', 'Completed']) {
      const members = items.filter(a => bucket(a) === group);
      if (!members.length) continue;
      list.append(el('h2', {class: 'group-title'}, group + ' · ' + members.length));
      for (const item of members) list.append(taskRow(item));
    }
  }
  function filteredItems() {
    return state.assignments.filter(a => a.completed === (view === 'completed') && (!course || a.course === course) && (a.title + ' ' + a.course).toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
      if (!a.effectiveDue) return b.effectiveDue ? 1 : a.title.localeCompare(b.title);
      if (!b.effectiveDue) return -1;
      return (new Date(a.effectiveDue) - new Date(b.effectiveDue)) * (view === 'completed' ? -1 : 1) || a.title.localeCompare(b.title);
    });
  }
  function motion(node, frames, options) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !node.animate) return Promise.resolve();
    return node.animate(frames, {duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)', ...options}).finished.catch(() => {});
  }
  function taskRow(item) {
    const checkbox = el('input', {type: 'checkbox', class: 'check', 'aria-label': (item.completed ? 'Reopen ' : 'Complete ') + item.title});
    checkbox.checked = item.completed; checkbox.disabled = pending.has(item.uid);
    const row = el('article', {class: 'row', 'data-uid': item.uid, 'data-completed': String(item.completed)}, checkbox,
          el('div', {}, el('a', {class: 'title', href: item.url}, item.title), el('div', {class: 'meta'}, item.course)),
          el('div', {class: 'deadline'}, formatDate(item.effectiveDue), item.dueOverride ? el('small', {}, 'Personal deadline') : null),
          el('button', {class: 'edit', 'aria-label': 'Edit ' + item.title, onclick: () => edit(item)}, 'Edit'));
    checkbox.addEventListener('change', async () => {
      pending.add(item.uid); checkbox.disabled = true; row.classList.add('completing');
      try {
        const [reply] = await Promise.all([request({action: 'update', uid: item.uid, patch: {completion: checkbox.checked}}), motion(checkbox, [{transform: 'scale(.85)'}, {transform: 'scale(1.18)'}, {transform: 'scale(1)'}])]);
        await motion(row, [{opacity: 1, transform: 'translateX(0)'}, {opacity: 0, transform: 'translateX(18px)'}], {duration: 180});
        const positions = new Map([...shadow.querySelectorAll('.row')].map(node => [node.dataset.uid, node.getBoundingClientRect().top]));
        pending.delete(item.uid); ingest(reply);
        for (const node of shadow.querySelectorAll('.row')) {
          const before = positions.get(node.dataset.uid);
          if (before != null) motion(node, [{transform: `translateY(${before - node.getBoundingClientRect().top}px)`}, {transform: 'translateY(0)'}]);
        }
        const next = [...shadow.querySelectorAll('.row .check')].find(node => !node.disabled);
        if (shadow.activeElement === null || shadow.activeElement === document.body) (next || tabs.querySelector('[aria-selected="true"]')).focus();
      } catch (error) {checkbox.checked = item.completed; notice.textContent = error.message; checkbox.disabled = false; row.classList.remove('completing');}
      finally {pending.delete(item.uid);}
    });
    return row;
  }
  function remoteStatus() {
    if (remoteError) pageContent.append(el('div', {class: 'notice', role: 'alert'}, remoteError, ' ', el('button', {class: 'quiet', onclick: () => loadRemote(true)}, 'Try again')));
  }
  function renderCatalog() {
    pageContent.replaceChildren(); remoteStatus();
    const courses = catalog || [...new Map(state.assignments.map(a => [a.courseId || a.course, {id: a.courseId, name: a.course}])).values()];
    const grid = el('div', {class: 'course-grid'});
    for (const entry of courses) {
      const tasks = state.assignments.filter(a => entry.id && a.courseId ? String(a.courseId) === String(entry.id) : a.course === entry.name);
      const complete = tasks.filter(a => a.completed).length;
      const upcoming = tasks.filter(a => !a.completed && a.effectiveDue).sort((a, b) => new Date(a.effectiveDue) - new Date(b.effectiveDue))[0];
      grid.append(el('article', {class: 'course-card'}, el('div', {class: 'course-code'}, entry.course_code || 'Course'), el('h2', {}, entry.name),
        el('p', {class: 'meta'}, `${tasks.length - complete} to do · ${complete} completed`),
        el('progress', {max: String(tasks.length || 1), value: String(complete), 'aria-label': entry.name + ' task completion'}),
        el('p', {class: 'next-task'}, upcoming ? 'Next deadline: ' + formatDate(upcoming.effectiveDue) : 'No upcoming deadlines'),
        el('div', {class: 'actions'}, el('button', {class: 'quiet primary', onclick: () => {course = entry.name; query = ''; search.value = ''; view = 'open'; navigate('tasks');}}, 'View tasks'),
          entry.id ? el('a', {class: 'quiet course-link', href: '/courses/' + encodeURIComponent(entry.id)}, 'Open course') : null)));
    }
    pageContent.append(grid);
    if (!courses.length && !remoteLoading) pageContent.append(el('div', {class: 'empty'}, 'No active courses to show. Sync Canvas to refresh your classes.'));
  }
  const dayKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  function renderCalendar() {
    pageContent.replaceChildren();
    const items = filteredItems();
    const days = new Map();
    for (const item of items) {
      if (!item.effectiveDue) continue;
      const key = dayKey(new Date(item.effectiveDue));
      if (!days.has(key)) days.set(key, []);
      days.get(key).push(item);
    }
    const moveMonth = delta => {
      month = new Date(month.getFullYear(), month.getMonth() + delta, 1); renderCalendar();
      pageContent.querySelector(`[aria-label="${delta > 0 ? 'Next' : 'Previous'} month"]`).focus();
      motion(pageContent.querySelector('.calendar-grid'), [{opacity: .4, transform: `translateX(${delta * 12}px)`}, {opacity: 1, transform: 'translateX(0)'}]);
    };
    const controls = el('div', {class: 'calendar-controls'},
      el('h2', {'aria-live': 'polite'}, month.toLocaleDateString(undefined, {month: 'long', year: 'numeric'})),
      el('div', {class: 'actions'}, el('button', {class: 'quiet', 'aria-label': 'Previous month', onclick: () => moveMonth(-1)}, '‹'),
        el('button', {class: 'quiet', onclick: () => {selectedDay = new Date(); month = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1); renderCalendar();}}, 'Today'),
        el('button', {class: 'quiet', 'aria-label': 'Next month', onclick: () => moveMonth(1)}, '›')));
    const grid = el('div', {class: 'calendar-grid', 'aria-label': 'Task calendar'});
    const sunday = new Date(2026, 10, 1);
    for (let i = 0; i < 7; i++) grid.append(el('div', {class: 'weekday'}, new Date(2026, 10, sunday.getDate() + i).toLocaleDateString(undefined, {weekday: 'short'})));
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
    for (let i = 0; i < 42; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), key = dayKey(date), tasks = days.get(key) || [];
      grid.append(el('button', {class: 'calendar-day' + (date.getMonth() !== month.getMonth() ? ' outside' : '') + (key === dayKey(new Date()) ? ' today' : ''),
        'aria-pressed': String(key === dayKey(selectedDay)), 'aria-label': date.toLocaleDateString(undefined, {dateStyle: 'full'}) + `, ${tasks.length} tasks`,
        onclick: event => {selectedDay = date; renderCalendar(); pageContent.querySelector(`[data-date="${key}"]`)?.focus();}, 'data-date': key},
        el('span', {}, String(date.getDate())), tasks.length ? el('span', {class: 'day-count'}, String(tasks.length)) : null,
        ...tasks.slice(0, 2).map(item => el('span', {class: 'day-task'}, item.title))));
    }
    const agenda = el('section', {class: 'agenda', 'aria-label': 'Selected day tasks'}, el('h2', {}, selectedDay.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})));
    const selected = days.get(dayKey(selectedDay)) || [];
    if (selected.length) agenda.append(...selected.map(taskRow));
    else agenda.append(el('p', {class: 'meta'}, 'No matching tasks due this day.'));
    pageContent.append(controls, grid, agenda);
  }
  async function readConversation(id) {
    const version = ++conversationVersion;
    selectedConversation = null; conversationLoading = true; renderInbox();
    try {
      const reply = await request({action: 'conversation', id});
      if (version !== conversationVersion) return;
      selectedConversation = reply.conversation;
    } catch (error) {if (version === conversationVersion) remoteError = error.message;}
    finally {if (version === conversationVersion) {conversationLoading = false; if (page === 'inbox') {renderInbox(); motion(pageContent.querySelector('.reader'), [{opacity: 0, transform: 'translateY(6px)'}, {opacity: 1, transform: 'translateY(0)'}]);}}}
  }
  function renderInbox() {
    pageContent.replaceChildren(); remoteStatus();
    const threads = el('div', {class: 'threads'});
    for (const thread of conversations || []) {
      threads.append(el('button', {class: 'thread' + (thread.workflow_state === 'unread' ? ' unread' : ''), 'aria-pressed': String(selectedConversation?.id === thread.id), onclick: () => readConversation(thread.id)},
        el('span', {class: 'meta'}, thread.context_name || (thread.participants || []).map(p => p.name).join(', ')),
        el('strong', {}, thread.subject || 'No subject'), el('span', {class: 'preview'}, thread.last_message || ''),
        el('span', {class: 'meta'}, thread.last_message_at ? formatDate(thread.last_message_at) : '')));
    }
    const reader = el('section', {class: 'reader', 'aria-label': 'Conversation', 'aria-live': 'polite'});
    if (conversationLoading) reader.append(el('div', {class: 'skeleton', role: 'status', 'aria-label': 'Loading conversation'}, el('div', {}), el('div', {})));
    else if (selectedConversation) {
      reader.append(el('h2', {}, selectedConversation.subject || 'No subject'));
      const participants = new Map((selectedConversation.participants || []).map(p => [p.id, p.name]));
      const messages = [...(selectedConversation.messages || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      for (const message of messages) reader.append(el('article', {class: 'message'}, el('strong', {}, participants.get(message.author_id) || 'Canvas user'),
        el('div', {class: 'meta'}, formatDate(message.created_at)), el('p', {class: 'message-body'}, message.body || ''),
        ...(message.attachments || []).map(file => el('p', {class: 'meta'}, 'Attachment: ' + (file.display_name || file.filename || 'File')))));
      reader.append(el('p', {class: 'meta'}, 'Replies and attachments are available in Original Canvas.'));
    } else reader.append(el('div', {class: 'empty'}, 'Choose a conversation to read.'));
    if (!remoteLoading && !conversations?.length && !remoteError) pageContent.append(el('div', {class: 'empty'}, 'Your inbox is empty.'));
    else pageContent.append(el('div', {class: 'inbox-layout'}, threads, reader));
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
      el('p', {class: 'source-status'}, 'Canvas deadline: ' + formatDate(item.canvasDue)),
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
  setInterval(() => {if (opened && !document.hidden && ['tasks', 'calendar'].includes(page) && !pending.size && courseOptions.hidden && !shadow.querySelector('dialog')) refresh();}, 30000);
  shadow.addEventListener('keydown', event => {
    if (event.key === 'Escape' && opened && !shadow.querySelector('dialog')) {event.preventDefault(); close();}
    if (event.key === 'Tab' && opened && !shadow.querySelector('dialog')) {
      const focusable = [...workspace.querySelectorAll('button,input,a,textarea,[tabindex="0"]')].filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && (shadow.activeElement === first || shadow.activeElement === main)) {event.preventDefault(); last?.focus();}
      else if (!event.shiftKey && shadow.activeElement === last) {event.preventDefault(); first?.focus();}
    }
  });
  render();
  if (currentRoutePage() && !originalMode()) open();
  document.getElementById('canvas-local-preload-style')?.remove();
})();
