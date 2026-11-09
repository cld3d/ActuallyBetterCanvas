(() => {
  if (document.getElementById('canvas-local-root')) return;
  const host = document.createElement('div');
  host.id = 'canvas-local-root';
  const shadow = host.attachShadow({mode: 'closed'});
  document.body.append(host);
  const style = document.createElement('style');
  style.textContent = `
    :host{--bg:#c0ddbd;--surface:#e5f1e4;--ink:#1c221c;--muted:#4e594e;--line:#95a094;--accent:#266134;--on-accent:#f7fcf7;--tint:#aecfab;--line-strong:#7d877c;--check-ring:#6b7c69;--radius:8px;--radius-sm:calc(var(--radius,8px) - 2px);--radius-lg:calc(var(--radius,8px) + 4px);--state-hover:color-mix(in srgb, var(--accent) 9%, var(--surface));--state-focus:color-mix(in srgb, var(--accent) 12%, var(--surface));--check-mark:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 6.4 4.6 9 10 3.4' fill='none' stroke='%23000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");font:15px/1.5 system-ui,sans-serif;color:var(--ink);color-scheme:light}
    *{box-sizing:border-box}button,input,select,textarea{font:inherit}button,a{touch-action:manipulation}button{cursor:pointer}button:disabled{opacity:.5;cursor:wait}a{color:inherit}button:active{transform:translateY(1px)}
    .launcher{position:fixed;bottom:24px;right:18px;z-index:10000;border:1px solid var(--line);border-radius:var(--radius,10px);background:var(--accent);color:var(--on-accent);padding:12px 18px;font-weight:650;box-shadow:0 4px 20px #17241a20;box-shadow:0 4px 20px color-mix(in srgb, var(--ink) 22%, transparent)}
    .workspace{position:fixed;inset:0;z-index:10001;background:radial-gradient(130% 100% at 85% 0%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 55%),var(--bg);display:grid;grid-template-columns:228px 1fr;overflow:auto}.workspace[hidden], [hidden]{display:none!important}
    aside{padding:30px 22px;background:linear-gradient(180deg, color-mix(in srgb, var(--accent) 22%, var(--surface)), var(--surface) 75%);border-right:1px solid var(--line);display:flex;flex-direction:column;gap:28px}.brand{font-size:13px;letter-spacing:.1em;font-weight:750}.local{font-size:11px;color:var(--muted);letter-spacing:0;font-weight:450;margin-top:5px}nav{display:grid;gap:6px}nav a,nav button{display:block;text-decoration:none;text-align:left;border:0;padding:10px 12px;border-radius:var(--radius-lg);background:none;color:var(--muted)}nav .selected{color:var(--accent);font-weight:650}.sidebar-note{margin-top:auto;font-size:12px;color:var(--muted)}main{padding:32px clamp(24px,5vw,80px);min-width:0;max-width:1500px;width:100%;margin:auto}.quiet{border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:8px 12px;border-radius:var(--radius,8px);white-space:nowrap}
.quiet,.toolbar input,.toolbar select,.select-trigger,.field input,.field textarea,.course-link{border-color:var(--line-strong)}.primary{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}h1{font-size:clamp(30px,4vw,46px);letter-spacing:-.05em;line-height:1.1;margin:0 0 12px;font-weight:700}.intro{color:var(--muted);margin:0 0 28px}.stats{display:flex;gap:32px;padding:0 0 30px;border-bottom:1px solid var(--line);margin-bottom:24px}.stats strong{font-size:26px;display:block;font-weight:550;font-variant-numeric:tabular-nums}.stats span{color:var(--muted);font-size:12px}.toolbar{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 26px}.toolbar input{flex:1;min-width:160px}.toolbar input,.toolbar select{background:var(--surface);color:var(--ink);border:1px solid var(--line-strong);border-radius:var(--radius,8px);padding:10px 12px;min-height:44px}.group-title{font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;margin:24px 0 8px;color:var(--muted)}.row{display:grid;grid-template-columns:22px minmax(0,1fr) auto auto;gap:16px;align-items:center;padding:19px 4px;border-bottom:1px solid color-mix(in srgb, var(--line) 62%, transparent)}
.row:last-child{border-bottom:0}.check{appearance:none;display:grid;place-content:center;position:relative;width:22px;height:22px;margin:0;flex:none;border:0;border-radius:calc(var(--radius,8px) * .65);background:color-mix(in srgb, var(--ink) 6%, transparent);box-shadow:inset 0 0 0 1px var(--check-ring);transition:background-color .15s,box-shadow .15s,opacity .15s;cursor:pointer}
.check::before{content:'';position:absolute;inset:-11px;border-radius:var(--radius-sm)}
.check::after{content:'';width:12px;height:12px;background:currentColor;color:var(--muted);opacity:0;-webkit-mask:var(--check-mark) center/contain no-repeat;mask:var(--check-mark) center/contain no-repeat;transition:opacity .15s}
.check:checked{background:var(--accent);box-shadow:none}
.check:checked::after{opacity:1;color:var(--on-accent)}.title{text-decoration:none;font-weight:600;overflow-wrap:anywhere}.title:hover{text-decoration:underline}.meta{font-size:12px;color:var(--muted);margin-top:5px}.deadline{font-size:13px;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.deadline[data-empty=true]{color:var(--muted);font-size:12px;font-weight:400}.deadline small{display:block;color:var(--muted);font-size:12px;margin-top:4px}.edit{color:var(--muted);border:0;background:none;padding:10px;justify-self:end;text-decoration:underline;text-underline-offset:3px;text-decoration-color:color-mix(in srgb, var(--muted) 45%, transparent)}
.edit:hover:not(:disabled){background:none;color:var(--accent);text-decoration-color:var(--accent)}
.announcement-title:hover:not(:disabled){background:none;color:var(--accent);text-decoration:underline;text-underline-offset:3px}.empty{padding:55px 10px;text-align:center;color:var(--muted)}.nebula-loader{--uib-size:56px;--uib-color:var(--accent,#ff6b00);--uib-speed:1.8s;position:relative;display:inline-flex;align-items:center;justify-content:center;width:var(--uib-size);height:var(--uib-size);flex:none}.nebula-particle{position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;height:100%;width:100%}.nebula-particle:nth-child(1){--uib-delay:0;transform:rotate(8deg)}.nebula-particle:nth-child(2){--uib-delay:-0.4;transform:rotate(36deg)}.nebula-particle:nth-child(3){--uib-delay:-0.9;transform:rotate(72deg)}.nebula-particle:nth-child(4){--uib-delay:-0.5;transform:rotate(90deg)}.nebula-particle:nth-child(5){--uib-delay:-0.3;transform:rotate(144deg)}.nebula-particle:nth-child(6){--uib-delay:-0.2;transform:rotate(180deg)}.nebula-particle:nth-child(7){--uib-delay:-0.6;transform:rotate(216deg)}.nebula-particle:nth-child(8){--uib-delay:-0.7;transform:rotate(252deg)}.nebula-particle:nth-child(9){--uib-delay:-0.1;transform:rotate(300deg)}.nebula-particle:nth-child(10){--uib-delay:-0.8;transform:rotate(324deg)}.nebula-particle:nth-child(11){--uib-delay:-1.2;transform:rotate(335deg)}.nebula-particle:nth-child(12){--uib-delay:-0.5;transform:rotate(290deg)}.nebula-particle:nth-child(13){--uib-delay:-0.2;transform:rotate(240deg)}.nebula-particle::before{content:'';position:absolute;height:17.5%;width:17.5%;border-radius:50%;background-color:var(--uib-color);flex-shrink:0;--uib-d:calc(var(--uib-delay)*var(--uib-speed));animation:nebula-orbit var(--uib-speed) linear var(--uib-d) infinite}@keyframes nebula-orbit{0%{transform:translate(calc(var(--uib-size)*0.5)) scale(0.74);opacity:.65}25%{transform:translate(0) scale(0.47);opacity:.3}50%{transform:translate(calc(var(--uib-size)*-0.5)) scale(0.74);opacity:.65}75%{transform:translate(0) scale(1);opacity:1}100%{transform:translate(calc(var(--uib-size)*0.5)) scale(0.74);opacity:.65}}@media (prefers-reduced-motion:reduce){.nebula-particle::before{animation:none}}.notice{padding:12px 16px;border:1px solid var(--line);border-radius:var(--radius,8px);background:var(--tint);margin:18px 0;overflow-wrap:anywhere}.notice:empty{display:none}footer{font-size:12px;color:var(--muted);padding-top:28px}dialog{border:1px solid var(--line);border-radius:calc(var(--radius,8px) + 6px);padding:30px;box-shadow:0 24px 64px #17241a30;box-shadow:0 24px 64px color-mix(in srgb, var(--ink) 22%, transparent);background:var(--surface);color:var(--ink);width:min(520px,calc(100vw - 32px));max-height:90dvh;overflow:auto}dialog::backdrop{background:color-mix(in srgb, var(--bg) 45%, #000 55%)}dialog h2{font-size:22px;line-height:1.3;margin:0 0 8px}dialog p{color:var(--muted);font-size:13px}label.field{display:grid;gap:8px;margin:22px 0;font-weight:550;font-size:13px}.field input,.field textarea{padding:11px;border:1px solid var(--line-strong);border-radius:var(--radius,8px);color:var(--ink);background:var(--bg);width:100%}.field textarea{resize:vertical;min-height:90px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}dialog .reset{padding:0;border:0;background:none;color:var(--accent);text-decoration:underline;font-size:12px}.source-status{background:var(--tint);padding:12px;border-radius:var(--radius-lg)}
dialog .source-status{color:var(--ink)}
    @media(prefers-color-scheme:dark){:host{--bg:#0b1e0e;--surface:#11421c;--ink:#e6e9e6;--muted:#aab3ab;--line:#536b56;--accent:#94cc9d;--on-accent:#07180a;--tint:#295230;--line-strong:#798c7b;--check-ring:#5c695e;color-scheme:dark}}
    /* Layers: workspace above Canvas; filter above content; native dialog in top layer. */
    .workspace{grid-template-columns:220px minmax(0,1fr)}aside{position:sticky;top:0;height:100dvh;padding:28px 18px;gap:28px}.brand{padding:0 12px;letter-spacing:.08em;font-size:12px}.local{font-size:20px;font-weight:650;letter-spacing:.02em;color:var(--accent);margin-top:2px}main{align-self:start;margin:0 auto;padding-top:30px;padding-bottom:70px}.intro{max-width:65ch}h1:focus{outline:none}nav button{font-size:14px;padding:12px 14px;position:relative}nav .selected:before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:3px;background:var(--accent);border-radius:3px}
    button,a,input,textarea{transition:background-color .18s,border-color .18s,color .18s,box-shadow .18s,transform .18s,opacity .18s}button:hover:not(:disabled),.course-link:hover{background:var(--state-hover)}button.primary:hover{background:var(--accent);opacity:.9}.launcher:hover{background:var(--accent);transform:translateY(-2px)}button:active:not(:disabled){transform:scale(.97)}.quiet{font-size:13px;font-weight:550;padding:9px 14px}.stats{gap:44px;margin-bottom:26px}.stats strong{font-size:30px;letter-spacing:-.04em}.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:20px}.tabs button{background:none;border:0;padding:12px 18px;color:var(--muted);position:relative;font-weight:550;font-size:14px}.tabs button[aria-selected=true]{color:var(--accent)}.tabs button[aria-selected=true]:after{content:'';position:absolute;bottom:-1px;left:12px;right:12px;height:2px;background:var(--accent);border-radius:2px}.toolbar{align-items:start}.toolbar input{width:0;min-width:140px}.toolbar input:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)}.custom-select{position:relative;min-width:180px;max-width:100%}.select-trigger{display:flex;justify-content:space-between;gap:18px;width:100%;padding:11px 14px;text-align:left;white-space:normal}.select-trigger:after{content:'';width:7px;height:7px;flex:none;margin-left:auto;transform:translateY(-2px) rotate(45deg);border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;opacity:.7}.select-options{position:absolute;top:calc(100% + 6px);right:0;min-width:100%;width:max-content;max-width:min(340px,80vw);max-height:300px;overflow:auto;z-index:2;border:1px solid var(--line);border-radius:calc(var(--radius,8px) + 2px);padding:5px;background:var(--surface);box-shadow:0 12px 32px #17241a24;box-shadow:0 12px 32px color-mix(in srgb, var(--ink) 18%, transparent)}.select-options button{display:block;width:100%;text-align:left;border:0;background:none;color:var(--ink);padding:10px 12px;border-radius:var(--radius-sm);white-space:normal}.select-options button[aria-selected=true]{background:color-mix(in srgb, var(--accent) 18%, var(--surface));color:var(--ink);font-weight:650;box-shadow:inset 2px 0 0 var(--accent)}.row{padding:18px 12px;border-radius:9px;transition:background-color .2s,opacity .2s}.row:hover{background:var(--surface)}.row[data-completed=true] .title{color:var(--muted)}.completing .title{text-decoration:line-through;color:var(--muted)}.row:hover .check:not(:checked):not(:disabled):not(:focus-visible),.check:hover:not(:checked):not(:disabled):not(:focus-visible),.check:active:not(:checked):not(:disabled):not(:focus-visible){background:color-mix(in srgb, var(--accent) 10%, transparent);box-shadow:inset 0 0 0 1px var(--check-ring)}
.row:hover .check:not(:checked):not(:disabled):not(:focus-visible)::after,.check:hover:not(:checked):not(:disabled):not(:focus-visible)::after,.check:active:not(:checked):not(:disabled):not(:focus-visible)::after{opacity:.32}.edit{border-radius:var(--radius-sm)}.group-title{display:flex;align-items:center;gap:12px;margin:26px 0 -0.75em;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}.group-title:after{content:'';height:1px;background:color-mix(in srgb, var(--line) 92%, transparent);flex:1}.empty{padding:56px 20px;border:1px solid color-mix(in srgb, var(--line) 45%, transparent);border-radius:var(--radius-lg);background:color-mix(in srgb, var(--surface) 55%, transparent);margin-top:20px}.page-content{min-width:0}.page-content h2{font-size:20px;letter-spacing:-.025em;font-weight:600}.course-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.course-card{padding:26px;border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--surface);min-width:0;display:flex;flex-direction:column}.course-card h2{margin:12px 0 6px;overflow-wrap:anywhere}.course-code{font-size:12px;color:var(--accent);font-weight:650;overflow-wrap:anywhere}.course-card progress{width:100%;height:5px;border:0;border-radius:4px;margin-top:18px;accent-color:var(--accent)}progress::-webkit-progress-bar{background:var(--tint);border-radius:4px}progress::-webkit-progress-value{background:var(--accent);border-radius:4px}.next-task{font-size:13px;color:var(--muted);margin:18px 0 4px}.course-card .actions{margin-top:auto;padding-top:20px}.course-link{text-decoration:none;display:inline-block;border:1px solid var(--line);border-radius:8px}.calendar-controls{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:10px 0 20px}.calendar-controls h2{margin:0}.calendar-controls .actions{margin:0;gap:6px}
.calendar-controls .month-step{width:36px;height:36px;padding:0;display:inline-grid;place-items:center;font-size:18px;line-height:1}
.calendar-controls .quiet{min-height:36px;display:inline-flex;align-items:center;justify-content:center;padding-block:0}.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;background:color-mix(in srgb, var(--line) 55%, var(--surface));border:1px solid var(--line);border-radius:var(--radius-lg);overflow:hidden}.weekday{padding:10px 4px;text-align:center;background:var(--bg);font-size:11px;font-weight:650;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.calendar-day{min-width:0;min-height:108px;padding:10px;border:0;background:var(--surface);color:var(--ink);text-align:left;display:flex;flex-direction:column;gap:5px;position:relative;isolation:isolate}.calendar-day>span:first-child{font-size:13px;font-weight:600}.calendar-day[aria-pressed=true]{box-shadow:inset 0 0 0 2px var(--accent);background:var(--tint)}.calendar-day.today>span:first-child{color:var(--on-accent);background:var(--accent);padding:0 5px;border-radius:4px;align-self:start}.calendar-day.outside{color:var(--muted);background:color-mix(in srgb, var(--surface) 55%, var(--bg))}.day-count{position:absolute;right:8px;top:10px;font-size:11px;font-weight:650;padding:0 5px;border-radius:calc(var(--radius-sm) / 2 + 2px);background:color-mix(in srgb, var(--accent) 16%, transparent);color:var(--accent)}.day-task{display:block;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;color:var(--muted)}.agenda{margin-top:30px}.agenda h2{margin-bottom:10px}.inbox-layout{display:grid;grid-template-columns:minmax(220px, .85fr) minmax(0,1.5fr);border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--surface);overflow:hidden;min-height:420px}.threads{border-right:1px solid var(--line);max-height:70dvh;overflow:auto}.thread{display:flex;flex-direction:column;gap:7px;background:none;color:var(--ink);border:0;border-bottom:1px solid var(--line);text-align:left;padding:20px;width:100%;overflow-wrap:anywhere}.thread[aria-pressed=true]{background:var(--tint)}
.thread:hover:not([aria-pressed=true]){background:color-mix(in srgb, var(--tint) 55%, var(--surface))}
.thread:last-child{border-bottom:0}
.thread[aria-pressed=true] .preview{color:var(--ink)}.thread strong{position:relative;padding-left:14px}
.thread.unread strong:before{content:'';position:absolute;left:0;top:.55em;width:6px;height:6px;background:var(--accent);border-radius:50%;margin:0}.preview{font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--muted)}.reader{padding:26px;min-width:0;max-height:70dvh;overflow:auto}
.reader:has(>.empty){display:flex;align-items:center;justify-content:center}.reader h2{overflow-wrap:anywhere;margin-top:0}.reader .empty{border:0}.message{padding:22px 0;border-bottom:1px solid var(--line);font-size:14px}.message-body{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7}.skeleton{display:grid;gap:14px;margin:24px 0}.skeleton>div{height:72px;border-radius:10px;background:var(--tint)}
    @keyframes enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes breathe{50%{opacity:.45}}
    @media(prefers-reduced-motion:no-preference){.workspace:not([hidden]) main{animation:enter .3s ease-out}.select-options:not([hidden]),dialog[open]{animation:enter .18s ease-out}.tabs button[aria-selected=true]:after{animation:enter .18s ease-out}.skeleton>div{animation:breathe 1.4s ease-in-out infinite}}
    /* Hide scrollbars only inside this Shadow DOM; preserve normal scrolling. */
    ::selection{background:var(--tint);background:color-mix(in srgb, var(--accent) 26%, transparent)}
    *{scrollbar-width:none}*::-webkit-scrollbar{display:none}
    .brand{display:grid;gap:0;padding:0 12px;line-height:1;letter-spacing:0;color:var(--ink);text-decoration:none}.brand-name{font-size:28px;font-weight:750;line-height:1.05;letter-spacing:-.065em}
    .calendar-day[aria-pressed=true]{box-shadow:inset 0 0 0 1.5px var(--accent);background:color-mix(in srgb, var(--tint) 60%, var(--surface))}
.theme-card:hover:not([aria-selected=true]){border-color:color-mix(in srgb, var(--line) 60%, var(--ink))}
.calendar-day:hover:not([aria-pressed=true]){background:color-mix(in srgb, var(--tint) 55%, var(--surface))}
    /* Task rows are content, not clickable cards: keep dividers straight and surfaces still. */
    .row,.row:hover{border-radius:0;background:transparent;transition:opacity .2s}
    /* Tab hover feedback belongs to the label, not a filled button surface. */
    .tabs button:hover:not(:disabled){background:transparent;color:var(--accent);opacity:.75}.tabs button:focus-visible{background:transparent;text-decoration:underline;text-underline-offset:4px}
    /* One shared underline moves between tabs instead of remounting on each selection. */
    .tabs{position:relative;border-bottom:0}.tabs button[aria-selected=true]:after{display:none}.tab-indicator{position:absolute;bottom:-1px;left:0;width:1px;height:2px;background:var(--accent);border-radius:1px;transform-origin:left;pointer-events:none;transition:transform .28s cubic-bezier(.2,.8,.2,1)}
    /* Sidebar selection uses one moving rule, without a filled active surface. */
    nav{position:relative}nav button.selected,nav button.selected:hover,nav button.selected:focus-visible{background:transparent}
nav button.selected:focus-visible{box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--accent) 55%, transparent)}nav .selected:before{display:none}.sidebar-indicator{position:absolute;top:0;left:0;width:3px;height:1px;background:var(--accent);border-radius:1.5px;transform-origin:top;pointer-events:none;transition:transform .28s cubic-bezier(.2,.8,.2,1)}
    nav button:hover:not(:disabled){background:transparent;color:var(--accent);opacity:.75}
    /* Sidebar bottom: theme dot, then sync / Original Canvas / settings spread edge to edge. */
    .sidebar-bottom{margin-top:auto;display:flex;justify-content:space-between;align-items:center}
    .theme-picker{position:relative;flex:none}
    .theme-button{width:36px;height:36px;padding:0;display:inline-flex;align-items:center;justify-content:center;flex:none}
    .theme-button .swatch{width:14px;height:14px;border-radius:50%;background:var(--accent);flex:none}
    .theme-options{position:absolute;bottom:calc(100% + 8px);left:0;min-width:230px;width:max-content;max-width:min(340px,80vw);max-height:min(380px,60dvh);overflow:auto;z-index:2;border:1px solid var(--line);border-radius:calc(var(--radius,8px) + 4px);padding:12px;background:var(--surface);box-shadow:0 12px 32px #17241a24;box-shadow:0 12px 32px color-mix(in srgb, var(--ink) 18%, transparent)}
    .theme-section-label{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:2px 4px 8px}
    .mode-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:12px}
    .mode-row button{border:1px solid var(--line);background:none;color:var(--ink);padding:8px 4px;border-radius:var(--radius-sm);font-size:13px;font-weight:550}
    .mode-row button[aria-selected=true]{background:color-mix(in srgb, var(--accent) 18%, var(--surface));color:var(--ink);border-color:var(--accent);font-weight:700}
    .announcement{padding:18px 4px;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
    .announcement-title{background:none;border:0;padding:0;color:var(--ink);font-weight:550;font-size:16px;text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;position:relative;padding-left:16px}
.announcement-title::after{content:'';width:7px;height:7px;flex:none;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:translateY(-2px) rotate(45deg);transition:transform .18s}
.announcement-title[aria-expanded=true]::after{transform:translateY(1px) rotate(225deg)}
    .announcement-title:hover{color:var(--accent)}
    .announcement.unread .announcement-title{font-weight:700}
    .announcement.unread .announcement-title::before{content:'';position:absolute;left:0;top:.55em;width:8px;height:8px;border-radius:50%;background:var(--accent);margin:0}
    .announcement p{margin:8px 0}
    .announcement .message-body{line-height:1.7;max-width:78ch;white-space:pre-wrap}
    dialog .actions{display:flex;gap:10px;margin-top:16px}
    nav button .nav-badge{display:inline-block;min-width:18px;text-align:center;font-size:11px;font-weight:700;background:var(--accent);color:var(--on-accent);border-radius:9px;padding:1px 5px;margin-left:6px;vertical-align:baseline}
    .sidebar-actions{display:flex;justify-content:space-between;flex:1;min-width:0}
    .theme-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .theme-card{display:flex;flex-direction:column;align-items:center;gap:8px;border:1px solid var(--line);background:none;color:var(--ink);padding:12px 6px 10px;border-radius:10px;font-size:12px;font-weight:550;min-width:min(88px,22vw)}
    .theme-card[aria-selected=true]{border-color:var(--accent);background:color-mix(in srgb, var(--accent) 18%, var(--surface));color:var(--ink);font-weight:700}
    .theme-card .dots{display:flex;gap:8px}
    .theme-card .dot{width:26px;height:26px;border-radius:50%;flex:none;border:1px solid var(--line);box-shadow:inset 0 0 6px #00000022}
    /* Keep keyboard location visible without the browser's large focus rectangles. */
    *:focus,*:focus-visible{outline:none}button:focus-visible{background:var(--state-focus);color:var(--ink);box-shadow:inset 0 0 0 2px var(--accent)}button.primary:focus-visible,.launcher:focus-visible{background:var(--accent);color:var(--on-accent);text-decoration:underline;text-underline-offset:4px}a:focus-visible{text-decoration:underline;text-underline-offset:4px}.row:focus-within .check:focus-visible{box-shadow:inset 0 0 0 1px var(--check-ring),0 0 0 2px var(--bg),0 0 0 4px var(--accent)}
.row:focus-within .check:focus-visible:not(:checked){background:var(--state-focus)}
.check:disabled{opacity:.45;cursor:progress}input:focus-visible,textarea:focus-visible{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
    @media(max-width:850px){.workspace{grid-template-columns:minmax(0,1fr);display:block}aside{position:static;height:auto;padding:16px 22px;gap:16px;border-right:0;border-bottom:1px solid var(--line)}.brand{font-size:10px;padding:0}.local{font-size:13px;display:inline;margin-left:6px}nav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}nav button{text-align:center;padding:10px 4px;font-size:11px}nav .selected:before{display:none}main{padding:22px}.row{grid-template-columns:22px minmax(0,1fr) auto;gap:10px;padding:16px 4px}.deadline{grid-column:2;grid-row:2;text-align:left}.edit{grid-column:3;grid-row:1}.stats{gap:24px}.stats strong{font-size:26px}.course-grid{grid-template-columns:1fr}.inbox-layout{grid-template-columns:minmax(0,1fr)}.threads{border-right:0;border-bottom:1px solid var(--line);max-height:min(48dvh,360px)}
.inbox-layout:has(.reader h2) .reader{order:-1}
.reader{padding:20px;max-height:50dvh}.calendar-day{min-height:70px;padding:8px 5px}.day-task{display:none}.day-count{top:8px;bottom:auto;right:5px;left:auto}.calendar-controls{align-items:center}.calendar-controls h2{font-size:18px}.calendar-controls .quiet{padding:8px 10px}.custom-select{min-width:140px}.toolbar input{min-width:130px}h1{font-size:32px}.tabs button{flex:1}}
    @media(max-width:850px){.brand{display:flex;align-items:baseline;gap:8px;padding:0}.brand-prefix{margin:0}.brand-name{font-size:24px}}
    .sidebar-bottom .quiet.icon-button{padding:0;width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;flex:none}
    .icon-button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;display:block}
    .icon-button.busy svg{animation:spin 1s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    /* One shared tooltip bubble, kept above the workspace overlay and clamped inside the viewport. */
    .tooltip-bubble{position:fixed;z-index:10002;max-width:200px;padding:6px 10px;border-radius:calc(var(--radius,8px) - 1px);background:var(--ink);color:var(--bg);font-size:12px;font-weight:550;line-height:1.4;text-align:center;box-shadow:0 6px 18px #00000030;box-shadow:0 6px 18px color-mix(in srgb, var(--ink) 20%, transparent);pointer-events:none;opacity:0;transition:opacity .15s ease-out}
    .tooltip-bubble.show{opacity:1}
    @media(max-width:560px){nav{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}nav button{white-space:nowrap;font-size:11px;padding:10px 2px}nav .nav-badge{min-width:16px;margin-left:4px}}
    @media(max-width:850px){.theme-options{left:auto;right:-132px;bottom:auto;top:calc(100% + 8px);max-width:calc(100vw - 36px)}}
    @media(max-width:850px){nav button{border-radius:0}}
    .thread.unread strong:before{width:8px;height:8px;top:.45em}.confirm-controls{display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap}
    aside{background:var(--surface)}nav button:hover:not(:disabled){opacity:1}
    .thread[aria-pressed=true]{background:var(--tint);box-shadow:inset 3px 0 var(--accent)}
    .calendar-layout{min-width:0}.reader h2:focus{outline:2px solid var(--accent);outline-offset:4px}
    @media(min-width:1250px){.calendar-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(280px,1fr);gap:28px;align-items:start}.calendar-layout .agenda{margin:0}.calendar-layout .calendar-day{min-height:90px;padding:8px}.calendar-layout .agenda .row{grid-template-columns:22px minmax(0,1fr) auto;gap:10px}.calendar-layout .agenda .deadline{grid-column:2;grid-row:2;text-align:left}.calendar-layout .agenda .edit{grid-column:3;grid-row:1}}
    /* Shared finishing rules: stable reading alignment and unmistakable keyboard cues. */
    #task-panel,#task-panel>div{min-width:0}
    main.tasks-layout{display:grid;grid-template-columns:minmax(0,1fr) 188px;column-gap:32px;align-items:start}
    .tasks-layout>.toolbar{grid-column:1;grid-row:1}
    .tasks-layout>.tabs{grid-column:1;grid-row:2}
    .tasks-layout>.notice{grid-column:1;grid-row:3}
    .tasks-layout>#task-panel{grid-column:1 / -1;grid-row:4}
    .task-progress{padding:0 0 0 28px;border-left:1px solid color-mix(in srgb,var(--line) 60%,transparent)}
    .tasks-layout>.task-progress{grid-column:2;grid-row:1 / 4;align-self:center}
    .rings-wrap{position:relative;width:160px;height:160px;margin:auto}
    .rings-wrap svg{display:block;width:100%;height:100%}
    .rings-center{position:absolute;inset:26%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none;gap:5px}
    .rings-center strong{font-size:26px;font-weight:650;letter-spacing:-.045em;font-variant-numeric:tabular-nums;line-height:1.1}
    .rings-center span{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap;line-height:1.5}
    @media(max-width:1100px){main.tasks-layout{display:block}.tasks-layout>.task-progress{margin-top:28px;padding:24px 0 0;border-left:0;border-top:1px solid var(--line)}}
    .row{align-items:start}.row .check{margin-top:3px}.row .deadline{padding-top:3px}.row .edit{margin-top:-6px}
    dialog h2,.announcement-title,.reader h2{overflow-wrap:anywhere}.course-card h2 a{color:inherit;text-decoration:none}.course-card h2 a:hover{text-decoration:underline;text-underline-offset:4px}
    .course-card progress{height:7px}.loading-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:36px 12px;text-align:center}.loading-state p{margin:0}
    .empty h2{margin:0 0 8px}.empty p{margin:0}.agenda{margin-top:28px}.inbox-back{display:none}
    select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}nav button:focus-visible,.tabs button:focus-visible{box-shadow:inset 0 -3px var(--accent);text-decoration:underline;text-underline-offset:5px}
    .threads,.reader,.course-rich pre,.course-rich table{scrollbar-width:thin;scrollbar-color:var(--line-strong) transparent}
    .threads::-webkit-scrollbar,.reader::-webkit-scrollbar,nav::-webkit-scrollbar{display:block;width:6px;height:4px}.threads::-webkit-scrollbar-thumb,.reader::-webkit-scrollbar-thumb,nav::-webkit-scrollbar-thumb{background:var(--line-strong);border-radius:3px}
    @media(prefers-reduced-motion:reduce){.nebula-particle{display:none}.nebula-loader{border:3px solid var(--line);border-top-color:var(--accent);border-radius:50%;width:24px!important;height:24px!important}}
    @media(max-width:850px){aside{position:relative;padding:12px 18px;gap:8px}.brand{min-height:44px}.sidebar-bottom{position:absolute;top:12px;right:18px;width:176px;margin:0;gap:0}.sidebar-bottom .quiet.icon-button{width:44px;height:44px}nav{display:flex;overflow-x:auto;gap:16px;scrollbar-width:thin}nav button{flex:none;min-height:44px;padding:8px 0;font-size:13px}.sidebar-indicator{display:none}nav button.selected{box-shadow:inset 0 -2px var(--accent)}main{padding:24px 18px}.inbox-layout .reader{order:0;max-height:none}.inbox-layout:not(.has-conversation) .reader{display:none}.inbox-layout.has-conversation .threads{display:none}.inbox-layout.has-conversation .reader{display:block;padding:20px 0}.inbox-back{display:inline-block;margin-bottom:20px}.calendar-day .day-task{display:block;font-size:10px;line-height:1.4;margin-top:6px}.calendar-day .day-task~.day-task{display:none}.calendar-day{min-height:86px}.calendar-controls .quiet{min-height:44px}.reader h2:focus{box-shadow:inset 3px 0 var(--accent);padding-left:12px}}
    /* Final responsive refinements intentionally follow the base mobile rules. */
    input::placeholder,textarea::placeholder{color:var(--muted);opacity:1}.course-card progress{height:8px}progress::-webkit-progress-bar{background:var(--line-strong)}
    .course-card h2 a{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:4px;text-decoration-color:var(--line-strong)}
    @media(max-width:850px){.inbox-layout.has-conversation .reader{padding:20px 18px}.reader h2:focus{padding-left:0;box-shadow:none}.calendar-day{min-height:68px}}
    @media(max-width:360px){nav{display:grid;grid-template-columns:minmax(0,1fr) max-content minmax(0,1fr);gap:2px 6px;overflow:visible}nav button{text-align:center;font-size:12px;min-height:40px}.toolbar{flex-direction:column}.toolbar input,.toolbar .custom-select{width:100%}.calendar-day .day-task{display:none}.calendar-day{min-height:54px}.day-count{top:auto;bottom:5px;right:5px}.calendar-controls{gap:4px}.calendar-controls h2{font-size:16px}.calendar-controls .quiet{padding-inline:8px}}
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
  const routePages = {'/': 'tasks', '/dashboard': 'tasks', '/courses': 'courses', '/calendar': 'calendar', '/conversations': 'inbox', '/announcements': 'announcements'};
  const pagePaths = {tasks: '/dashboard', announcements: '/announcements', courses: '/courses', calendar: '/calendar', inbox: '/conversations'};
  const sourceRoute = location.pathname + location.search;
  const readCourseRoute = input => globalThis.CanvasCourseWorkspace && globalThis.CanvasCourseRoutes?.parse(input);
  const currentRoutePage = () => readCourseRoute(location.href) ? 'course' : routePages[location.pathname.replace(/\/$/, '') || '/'];
  // Tab-scoped and origin-scoped: choosing Original Canvas survives its page navigations.
  // Storage may be blocked by the browser; workspace controls must still work in that case.
  const modeKey = 'actually-better-canvas-mode';
  function rememberMode(mode) {try {sessionStorage.setItem(modeKey, mode);} catch {}}
  function originalMode() {try {return sessionStorage.getItem(modeKey) === 'original';} catch {return false;}}
  let state = {assignments: []}, view = 'open', query = '', course = '', loading = false, opened = false, previousFocus;
  let page = currentRoutePage() || 'tasks';
  let catalog = null, conversations = null, announcements = null, expandedAnnouncement = null, remoteLoading = false, remoteError = '', selectedConversation = null, conversationLoading = false, conversationVersion = 0;
  let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1), selectedDay = new Date();
  const pending = new Set();
  const launcher = el('button', {class: 'launcher', onclick: () => {page = currentRoutePage() || page; render(); open();}}, 'Actually Better Canvas');
  const notice = el('div', {class: 'notice', role: 'status', 'aria-live': 'polite'});
  function icon(paths) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = paths;
    return svg;
  }
  const syncIcon = icon('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>');
  const externalIcon = icon('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>');
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
    const length = Math.max(0, selected.offsetWidth - 24);
    tabIndicator.style.transform = `translateX(${selected.offsetLeft + 12}px) scaleX(${length})`;
    // The scaleX stretch also magnifies the horizontal corner radius, so shrink
    // the specified radius to keep the rendered ends a clean 1px semicircle.
    tabIndicator.style.borderRadius = length > 0 ? `${(1 / length).toFixed(4)}px / 1px` : '0';
  }
  new ResizeObserver(positionTabIndicator).observe(tabs);
  tabs.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); view = event.key === 'Home' ? 'open' : event.key === 'End' ? 'completed' : view === 'open' ? 'completed' : 'open';
      selectView(view); tabs.querySelector('[aria-selected="true"]').focus();
    }
  });
  const syncButton = el('button', {class: 'quiet icon-button', 'aria-label': 'Sync now', 'data-tip': 'Connecting to local feed…', onclick: () => {refresh(true); if (page === 'courses' || page === 'inbox' || page === 'announcements') loadRemote(true); if (page === 'course') courseWorkspace.refresh();}}, syncIcon);
  const originalButton = el('button', {class: 'quiet icon-button', 'aria-label': 'Original Canvas', 'data-tip': 'Original Canvas', onclick: close}, externalIcon);
  const settingsIcon = icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>');
  const settingsButton = el('button', {class: 'quiet icon-button', 'aria-label': 'Extension settings', 'data-tip': 'Extension settings', onclick: () => openConnectionDialog()}, settingsIcon);
  function openConnectionDialog() {
    const siteName = el('strong', {}, '…');
    const status = el('p', {class: 'source-status', role: 'status'}, 'Reading local feed…');
    const syncNow = el('button', {class: 'quiet primary', type: 'button', onclick: async event => {
      event.target.disabled = true; status.textContent = 'Syncing…';
      try {
        const result = await refresh(true);
        status.textContent = (result?.error ? 'Sync failed: ' + result.error + ' ' : '') + `${state.assignments.length} assignments cached.` + (state.lastSync ? ' Last successful sync ' + new Date(state.lastSync).toLocaleString() + '.' : ' No successful sync yet.');
      } catch (error) {status.textContent = friendlyError(error);}
      finally {event.target.disabled = false;}
    }}, 'Sync now');
    const dialog = el('dialog', {'aria-labelledby': 'connection-heading'},
      el('h2', {id: 'connection-heading'}, 'Connection'),
      el('p', {}, 'Canvas website: ', siteName),
      status,
      el('p', {class: 'meta'}, 'To connect a different Canvas site, use the Canvas Local button in the browser toolbar.'),
      el('div', {class: 'actions'}, syncNow, el('button', {class: 'quiet', type: 'button', onclick: () => dialog.close()}, 'Close')));
    shadow.append(dialog);
    dialog.addEventListener('close', () => {dialog.remove(); settingsButton.focus();});
    dialog.showModal();
    syncNow.focus();
    (async () => {
      try {
        const {origin} = await chrome.storage.local.get('origin');
        siteName.textContent = origin || 'Not connected yet';
        const reply = await request({action: 'list'});
        status.textContent = `${reply.state.assignments.length} assignments cached.` + (reply.state.lastSync ? ' Last synced ' + new Date(reply.state.lastSync).toLocaleString() + '.' : ' Not synced yet.');
      } catch (error) {status.textContent = friendlyError(error);}
    })();
  }
  const toolbar = el('div', {class: 'toolbar'}, search, courseSelect);
  const progressWrap = el('div', {class: 'task-progress'});
  const taskPanel = el('section', {id: 'task-panel', role: 'tabpanel'}, list);
  const pageContent = el('div', {class: 'page-content'});
  const courseWorkspace = globalThis.CanvasCourseWorkspace?.create({request, assignments: () => state.assignments, taskRow,
    navigate: (url, opts) => {
      const target = new URL(url, location.origin);
      if (readCourseRoute(target.href)) navigateCourse(target.href, true, opts?.replace);
      else {const value = routePages[target.pathname.replace(/\/$/, '') || '/']; if (value) navigate(value);}
    },
    original: url => {rememberMode('original'); location.assign(url);}
  });
  const navigation = el('nav', {'aria-label': 'Canvas navigation'}, ...[['tasks', 'Tasks'], ['announcements', 'Announcements'], ['courses', 'Courses'], ['calendar', 'Calendar'], ['inbox', 'Inbox']].map(([value, label]) => el('button', {'data-page': value, onclick: () => navigate(value)}, label)));
  const sidebarIndicator = el('span', {class: 'sidebar-indicator', 'aria-hidden': 'true'});
  navigation.append(sidebarIndicator);
  const themeVars = ['--bg', '--surface', '--ink', '--muted', '--line', '--accent', '--on-accent', '--tint', '--line-strong', '--check-ring'];
  // Shape is a per-family identity like color is: neutrals stay crisp, warm
  // families go soft, brights go sharp. Applied through --radius everywhere.
  const themeFamilies = [
    {id: 'graphite', label: 'Graphite', radius: '8px',
      light: {'--bg': '#d4d4d8', '--surface': '#f1f1f3', '--ink': '#202021', '--muted': '#565658', '--line': '#9c9c9e', '--accent': '#3a3a40', '--on-accent': '#fafafb', '--tint': '#c4c4c9', '--line-strong': '#868688', '--check-ring': '#767679'},
      dark: {'--bg': '#101013', '--surface': '#38383f', '--ink': '#e8e8e8', '--muted': '#b0b0b2', '--line': '#5f5f62', '--accent': '#c6c6ce', '--on-accent': '#141416', '--tint': '#47474d', '--line-strong': '#858588', '--check-ring': '#606062'}},
    {id: 'crimson', label: 'Crimson', radius: '6px',
      light: {'--bg': '#faaaa7', '--surface': '#ffe7e6', '--ink': '#2a1a19', '--muted': '#5d4140', '--line': '#a28382', '--accent': '#8f1217', '--on-accent': '#fff8f8', '--tint': '#ef9895', '--line-strong': '#9a7c7b', '--check-ring': '#8a5c5a'},
      dark: {'--bg': '#270b0c', '--surface': '#651b21', '--ink': '#ece6e6', '--muted': '#bcacab', '--line': '#7a5958', '--accent': '#f9a199', '--on-accent': '#240b0c', '--tint': '#6c3435', '--line-strong': '#967c7c', '--check-ring': '#725e5f'}},
    {id: 'ember', label: 'Ember', radius: '10px',
      light: {'--bg': '#fac49b', '--surface': '#ffe9d9', '--ink': '#291e16', '--muted': '#624e40', '--line': '#a99485', '--accent': '#843d00', '--on-accent': '#fff9f4', '--tint': '#eeb285', '--line-strong': '#938072', '--check-ring': '#8b6c55'},
      dark: {'--bg': '#280f00', '--surface': '#572c14', '--ink': '#ebe7e4', '--muted': '#bbada4', '--line': '#785d4a', '--accent': '#f7a776', '--on-accent': '#230d00', '--tint': '#623e24', '--line-strong': '#968172', '--check-ring': '#726157'}},
    {id: 'amber', label: 'Amber', radius: '10px',
      light: {'--bg': '#e8d79d', '--surface': '#f4eed7', '--ink': '#242014', '--muted': '#5d5742', '--line': '#a59e89', '--accent': '#6c5200', '--on-accent': '#fdfaf1', '--tint': '#dac886', '--line-strong': '#8a8470', '--check-ring': '#827856'},
      dark: {'--bg': '#1e1700', '--surface': '#4a350f', '--ink': '#e9e8e4', '--muted': '#b4b0a5', '--line': '#6b6345', '--accent': '#d5b975', '--on-accent': '#191300', '--tint': '#514725', '--line-strong': '#8c866e', '--check-ring': '#696454'}},
    {id: 'matcha', label: 'Matcha', radius: '12px',
      light: {'--bg': '#c0ddbd', '--surface': '#e5f1e4', '--ink': '#1c221c', '--muted': '#4e594e', '--line': '#95a094', '--accent': '#266134', '--on-accent': '#f7fcf7', '--tint': '#aecfab', '--line-strong': '#7d877c', '--check-ring': '#6b7c69'},
      dark: {'--bg': '#0b1e0e', '--surface': '#11421c', '--ink': '#e6e9e6', '--muted': '#aab3ab', '--line': '#536b56', '--accent': '#94cc9d', '--on-accent': '#07180a', '--tint': '#295230', '--line-strong': '#798c7b', '--check-ring': '#5c695e'}},
    {id: 'lagoon', label: 'Lagoon', radius: '12px',
      light: {'--bg': '#a9ebe8', '--surface': '#ddf6f5', '--ink': '#162323', '--muted': '#455c5b', '--line': '#92a9a8', '--accent': '#006061', '--on-accent': '#f3fcfc', '--tint': '#92ddd9', '--line-strong': '#758a89', '--check-ring': '#5e8584'},
      dark: {'--bg': '#001d1c', '--surface': '#144543', '--ink': '#e4e9e9', '--muted': '#a7b5b4', '--line': '#486a68', '--accent': '#72cecf', '--on-accent': '#001918', '--tint': '#294f4e', '--line-strong': '#789190', '--check-ring': '#576b6a'}},
    {id: 'ocean', label: 'Ocean', radius: '10px',
      light: {'--bg': '#b6d9f7', '--surface': '#e1f0fc', '--ink': '#1a2127', '--muted': '#4b5863', '--line': '#919eaa', '--accent': '#205888', '--on-accent': '#f6fbff', '--tint': '#a3caeb', '--line-strong': '#7a8691', '--check-ring': '#65798b'},
      dark: {'--bg': '#041728', '--surface': '#103c5e', '--ink': '#e5e8eb', '--muted': '#a8b2bb', '--line': '#4d657b', '--accent': '#8cc2f5', '--on-accent': '#041524', '--tint': '#274b69', '--line-strong': '#788a9a', '--check-ring': '#5a6672'}},
    {id: 'iris', label: 'Iris', radius: '14px',
      light: {'--bg': '#cfc2f6', '--surface': '#efeaff', '--ink': '#211f29', '--muted': '#514c5f', '--line': '#9591a4', '--accent': '#56408f', '--on-accent': '#faf9ff', '--tint': '#c0b2ea', '--line-strong': '#858193', '--check-ring': '#716a87'},
      dark: {'--bg': '#160d26', '--surface': '#412a68', '--ink': '#e8e7eb', '--muted': '#b2aebc', '--line': '#645c78', '--accent': '#bfaffd', '--on-accent': '#160f25', '--tint': '#4d3d6d', '--line-strong': '#888297', '--check-ring': '#645e6f'}},
    {id: 'rose', label: 'Rose', radius: '12px',
      light: {'--bg': '#efc0de', '--surface': '#fbe7f3', '--ink': '#271d23', '--muted': '#5e4d58', '--line': '#a3919c', '--accent': '#7f3664', '--on-accent': '#fff8fc', '--tint': '#e2afd0', '--line-strong': '#8f7e89', '--check-ring': '#856a7b'},
      dark: {'--bg': '#230d1c', '--surface': '#5a2047', '--ink': '#ebe6e9', '--muted': '#b9acb4', '--line': '#75596a', '--accent': '#eaa3cc', '--on-accent': '#200c19', '--tint': '#643554', '--line-strong': '#927c8a', '--check-ring': '#6f5f6a'}}
  ];
  const themeModes = [
    {id: 'system', label: 'System'},
    {id: 'light', label: 'Light'},
    {id: 'dark', label: 'Dark'}
  ];
  // Migrate pre-split theme ids to a family + mode pair.
  const legacyThemeMap = {
    system: ['graphite', 'system'],
    matcha: ['matcha', 'light'],
    'matcha-dark': ['matcha', 'dark'],
    ocean: ['ocean', 'light'],
    abyss: ['ocean', 'dark'],
    plum: ['rose', 'light'],
    fig: ['rose', 'dark'],
    dune: ['ember', 'light'],
    lavender: ['iris', 'light']
  };
  let themeFamilyId = 'graphite', themeMode = 'system';
  const mediaQuery = matchMedia('(prefers-color-scheme: dark)');
  function resolvedScheme() {
    if (themeMode === 'light') return 'light';
    if (themeMode === 'dark') return 'dark';
    return mediaQuery.matches ? 'dark' : 'light';
  }
  function themeFamily() {return themeFamilies.find(candidate => candidate.id === themeFamilyId) || themeFamilies[0];}
  function themeModeLabel() {return themeModes.find(candidate => candidate.id === themeMode)?.label || 'System';}
  const themeSwatch = el('span', {class: 'swatch', 'aria-hidden': 'true'});
  const themeButton = el('button', {class: 'quiet theme-button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': 'Color theme', 'data-tip': 'Matcha · System', onclick: () => toggleThemePicker()}, themeSwatch);
  const themeOptions = el('div', {class: 'theme-options', role: 'listbox', 'aria-label': 'Color theme', hidden: ''});
  const themePicker = el('div', {class: 'theme-picker'}, themeButton, themeOptions);
  const modeOptions = el('div', {class: 'mode-row', role: 'group', 'aria-label': 'Appearance'});
  const familyGrid = el('div', {class: 'theme-grid'});
  themeOptions.append(el('div', {class: 'theme-section-label'}, 'Appearance'), modeOptions, el('div', {class: 'theme-section-label'}, 'Themes'), familyGrid);
  const modeButtons = new Map(), familyButtons = new Map();
  function dotBackground(vars) {return `linear-gradient(135deg, ${vars['--accent']} 0%, ${vars['--accent']} 38%, ${vars['--surface']} 100%)`;}
  function applyTheme(familyId = themeFamilyId, mode = themeMode, persist = true) {
    const family = themeFamilies.find(candidate => candidate.id === familyId) || themeFamilies[0];
    themeFamilyId = family.id;
    themeMode = themeModes.some(candidate => candidate.id === mode) ? mode : 'system';
    const scheme = resolvedScheme();
    const vars = themeFamily()[scheme];
    for (const key of themeVars) host.style.setProperty(key, vars[key]);
    // Secondary copy also appears on selected/tinted surfaces, not only the base.
    host.style.setProperty('--muted', `color-mix(in srgb, ${vars['--muted']} 85%, ${vars['--ink']})`);
    host.style.setProperty('--radius', family.radius || '8px');
    host.style.setProperty('color-scheme', scheme);
    const label = `${themeFamily().label} · ${themeModeLabel()}`;
    themeSwatch.style.background = dotBackground(vars);
    for (const candidate of themeModes) modeButtons.get(candidate.id)?.setAttribute('aria-selected', String(candidate.id === themeMode));
    for (const candidate of themeFamilies) familyButtons.get(candidate.id)?.setAttribute('aria-selected', String(candidate.id === themeFamilyId));
    themeButton.setAttribute('aria-label', 'Color theme: ' + label);
    themeButton.dataset.tip = label;
    if (persist) {try {localStorage.setItem('canvas-local-theme', themeFamilyId); localStorage.setItem('canvas-local-mode', themeMode);} catch {}}
    // Persist the resolved first-paint values so the document-start guard can
    // paint the active theme before this script runs. System mode follows the
    // live OS setting instead, so it leaves no record behind.
    try {
      if (themeMode === 'system') localStorage.removeItem('canvas-local-boot');
      else localStorage.setItem('canvas-local-boot', JSON.stringify({bg: vars['--bg'], scheme}));
    } catch {}
  }
  function toggleThemePicker(show = themeOptions.hidden) {
    themeOptions.hidden = !show; themeButton.setAttribute('aria-expanded', String(show));
    if (show) (themeOptions.querySelector('[aria-selected="true"]') || themeOptions.querySelector('button'))?.focus();
  }
  for (const candidate of themeModes) {
    const option = el('button', {role: 'option', 'aria-selected': 'false', 'aria-label': 'Appearance: ' + candidate.label, onclick: () => {applyTheme(themeFamilyId, candidate.id); toggleThemePicker(false); themeButton.focus();}}, candidate.label);
    modeButtons.set(candidate.id, option);
    modeOptions.append(option);
  }
  for (const candidate of themeFamilies) {
    const darkDot = el('span', {class: 'dot', 'aria-hidden': 'true'});
    darkDot.style.background = dotBackground(candidate.dark);
    const lightDot = el('span', {class: 'dot', 'aria-hidden': 'true'});
    lightDot.style.background = dotBackground(candidate.light);
    const dots = el('span', {class: 'dots', 'aria-hidden': 'true'}, lightDot, darkDot);
    const option = el('button', {class: 'theme-card', role: 'option', 'aria-selected': 'false', 'aria-label': 'Theme: ' + candidate.label, onclick: () => {applyTheme(candidate.id, themeMode); toggleThemePicker(false); themeButton.focus();}}, dots, el('span', {}, candidate.label));
    option.style.borderRadius = candidate.radius || '10px';
    familyButtons.set(candidate.id, option);
    familyGrid.append(option);
  }
  mediaQuery.addEventListener?.('change', () => {if (themeMode === 'system') applyTheme(themeFamilyId, themeMode);});
  function loadTheme() {
    let family = 'graphite', mode = 'system';
    try {
      const savedFamily = localStorage.getItem('canvas-local-theme');
      const savedMode = localStorage.getItem('canvas-local-mode');
      if (savedFamily && themeFamilies.some(candidate => candidate.id === savedFamily)) {
        family = savedFamily;
        if (themeModes.some(candidate => candidate.id === savedMode)) mode = savedMode;
        return [family, mode];
      }
      // Single-key values predate the family + mode split.
      if (savedFamily && legacyThemeMap[savedFamily]) return legacyThemeMap[savedFamily];
    } catch {}
    return [family, mode];
  }
  function positionSidebarIndicator() {
    const selected = navigation.querySelector('[aria-current="page"]');
    if (!selected?.offsetHeight) return;
    const length = Math.max(0, selected.offsetHeight - 24);
    sidebarIndicator.style.transform = `translate(${selected.offsetLeft}px, ${selected.offsetTop + 12}px) scaleY(${length})`;
    // The scaleY stretch magnifies the vertical corner radius, so shrink the
    // specified radius to keep the rendered ends a clean 1.5px semicircle.
    sidebarIndicator.style.borderRadius = length > 0 ? `1.5px / ${(1.5 / length).toFixed(4)}px` : '0';
  }
  new ResizeObserver(positionSidebarIndicator).observe(navigation);
  const main = el('main', {tabindex: '-1'},
    toolbar, tabs, notice, taskPanel, progressWrap, pageContent);
  const workspace = el('section', {class: 'workspace', hidden: '', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Canvas Local workspace'},
    el('aside', {}, el('a', {class: 'brand', href: pagePaths.tasks, 'aria-label': 'Canvas', onclick: event => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); navigate('tasks');
    }},
      el('span', {class: 'brand-name', 'aria-hidden': 'true'}, 'canvas')), navigation, el('div', {class: 'sidebar-bottom'}, themePicker, syncButton, originalButton, settingsButton)),
    main);
  shadow.append(launcher, workspace);
  applyTheme(...loadTheme(), false);
  const tooltipBubble = el('div', {class: 'tooltip-bubble', role: 'status', hidden: ''});
  shadow.append(tooltipBubble);
  let tooltipTimer = 0, tooltipAnchor = null;
  function placeTooltip(anchor) {
    // Measure first, then clamp the bubble inside the viewport.
    tooltipBubble.style.left = '0px'; tooltipBubble.style.top = '0px';
    const width = tooltipBubble.offsetWidth, height = tooltipBubble.offsetHeight;
    const box = anchor.getBoundingClientRect();
    const padding = 8, gap = 10;
    const left = Math.max(padding, Math.min(box.left + box.width / 2 - width / 2, window.innerWidth - width - padding));
    let top = box.top - height - gap;
    if (top < padding) top = Math.min(box.bottom + gap, window.innerHeight - height - padding);
    tooltipBubble.style.left = Math.round(Math.max(padding, left)) + 'px';
    tooltipBubble.style.top = Math.round(Math.max(padding, top)) + 'px';
  }
  function showTooltip(anchor, delay = 350) {
    if (anchor === tooltipAnchor) return;
    tooltipAnchor = anchor;
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      if (!anchor.isConnected) return;
      const text = anchor.getAttribute('data-tip');
      if (!text) return;
      tooltipBubble.textContent = text;
      tooltipBubble.hidden = false;
      tooltipBubble.classList.remove('show');
      void tooltipBubble.offsetWidth;
      placeTooltip(anchor);
      tooltipBubble.classList.add('show');
    }, delay);
  }
  function hideTooltip() {clearTimeout(tooltipTimer); tooltipAnchor = null; tooltipBubble.classList.remove('show'); tooltipBubble.hidden = true;}
  shadow.addEventListener('mouseover', event => {
    const anchor = event.target.closest?.('[data-tip]');
    if (!anchor || !shadow.contains(anchor)) {tooltipAnchor = null; hideTooltip(); return;}
    showTooltip(anchor);
  });
  shadow.addEventListener('mouseout', event => {
    const left = event.target.closest?.('[data-tip]');
    if (left && !left.contains(event.relatedTarget)) {tooltipAnchor = null; hideTooltip();}
  });
  shadow.addEventListener('focusin', event => {const anchor = event.target.closest?.('[data-tip]'); if (anchor) showTooltip(anchor, 0);});
  shadow.addEventListener('focusout', () => {tooltipAnchor = null; hideTooltip();});
  shadow.addEventListener('click', () => hideTooltip(), true);
  // Scrolling or resizing moves the anchor, so follow it instead of hiding:
  // hiding here would strand users whose scroll momentum outlasts the show delay.
  const repositionTooltip = () => {if (tooltipAnchor && !tooltipBubble.hidden) placeTooltip(tooltipAnchor);};
  workspace.addEventListener('scroll', repositionTooltip, true);
  window.addEventListener('resize', repositionTooltip);
  let inertElements = [];
  let priorOverflow = '', priorTitle = '';
  function close(remember = true) {
    if (remember) rememberMode('original');
    // Workspace routing leaves the Canvas document underneath on its original route.
    // Keep the overlay visible until the matching Original Canvas document loads.
    if (location.pathname + location.search !== sourceRoute) {location.reload(); return;}
    opened = false; workspace.hidden = true; launcher.hidden = false;
    if (priorTitle) document.title = priorTitle;
    document.body.style.overflow = priorOverflow;
    for (const [node, wasInert] of inertElements) node.inert = wasInert;
    inertElements = [];
    if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus();
    else launcher.focus();
  }
  let feedQueue = Promise.resolve(), feedVersion = 0, appliedFeedVersion = 0;
  const pageTitles = {tasks: 'Tasks', announcements: 'Announcements', courses: 'Courses', calendar: 'Calendar', inbox: 'Inbox'};
  function open() {
    if (opened) return;
    rememberMode('workspace');
    previousFocus = document.activeElement;
    priorOverflow = document.body.style.overflow;
    priorTitle = document.title;
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
  // Same thirteen-particle orbit as the course workspace loader.
  function nebulaLoader(size = 56, label = 'Loading') {
    const loader = el('div', {class: 'nebula-loader', role: 'status', 'aria-label': label});
    loader.style.setProperty('--uib-size', size + 'px');
    for (let i = 0; i < 13; i++) loader.append(el('div', {class: 'nebula-particle', 'aria-hidden': 'true'}));
    return el('div', {class: 'loading-state'}, loader, el('p', {class: 'meta', 'aria-hidden': 'true'}, label + '…'));
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
  // Raw browser fetch failures read as gibberish in the UI. Name the moment
  // instead: a dropped connection with saved work still on screen.
  function friendlyError(reason) {
    const message = String(reason?.message || reason || '').trim();
    if (!/failed to fetch/i.test(message)) return message;
    const prefix = message.replace(/failed to fetch/gi, '').replace(/[:\-.\u2013\u2014\s]+$/g, '').trim();
    if (!prefix) return "Couldn't reach Canvas just now. Showing saved work.";
    return prefix + ": couldn't reach Canvas just now.";
  }
  function navigate(value, updateURL = true) {
    if (value === 'course') {navigateCourse(location.href, false); return;}
    if (updateURL && currentRoutePage() !== value) history.pushState(null, '', pagePaths[value]);
    page = value; remoteError = ''; expandedAnnouncement = null; toggleCourses(false); render(); main.focus(); loadRemote();
    motion(page === 'tasks' ? taskPanel : pageContent, [{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'translateY(0)'}]);
  }
  function navigateCourse(url, updateURL = true, replace = false) {
    const target = readCourseRoute(url);
    if (!target) return;
    if (updateURL) {
      if (replace) history.replaceState(null, '', target.path);
      else if (target.path !== location.pathname + location.search + location.hash) history.pushState(null, '', target.path);
    }
    page = 'course'; remoteError = ''; toggleCourses(false); render(); main.focus();
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
  function updateAnnouncementBadge() {
    const button = navigation.querySelector('[data-page="announcements"]');
    if (!button) return;
    const count = (announcements || []).filter(isAnnouncementUnread).length;
    let badge = button.querySelector('.nav-badge');
    if (!count) {badge?.remove(); return;}
    if (!badge) {badge = el('span', {class: 'nav-badge', 'aria-hidden': 'true'}); button.append(badge);}
    badge.textContent = count > 99 ? '99+' : String(count);
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
  shadow.addEventListener('click', event => {if (!themePicker.contains(event.target)) toggleThemePicker(false);});
  shadow.addEventListener('click', event => {
    if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a');
    if (anchor && !anchor.hasAttribute('download') && !anchor.target && readCourseRoute(anchor.href)) {event.preventDefault(); navigateCourse(anchor.href);}
  });
  courseSelect.addEventListener('focusout', event => {if (!courseSelect.contains(event.relatedTarget)) toggleCourses(false);});
  let announcementsLoading = false;
  async function refreshAnnouncementsBadge() {
    if (page === 'announcements' || announcements !== null || announcementsLoading) return;
    // Best effort only: reuse known courses, never start a catalog fetch here.
    const ids = announcementCourseIds();
    if (!ids.length) return;
    announcementsLoading = true;
    try {
      const reply = await request({action: 'announcements', courseIds: ids});
      announcements = reply.announcements || [];
      updateAnnouncementBadge();
    } catch {}
    finally {announcementsLoading = false;}
  }
  async function loadRemote(force = false) {
    const target = page;
    if (!['courses', 'inbox', 'announcements'].includes(target) || remoteLoading || (!force && (target === 'courses' ? catalog : target === 'inbox' ? conversations : announcements))) return;
    remoteLoading = true; remoteError = ''; render();
    try {
      if (target === 'announcements' && !catalog) catalog = (await request({action: 'courses'})).courses;
      const reply = await request(target === 'announcements' ? {action: 'announcements', courseIds: announcementCourseIds()} : {action: target});
      if (target === 'courses') catalog = reply.courses;
      else if (target === 'inbox') conversations = reply.conversations;
      else announcements = reply.announcements || [];
    } catch (error) {remoteError = friendlyError(error);}
    finally {remoteLoading = false; render(); if (target !== page) loadRemote();}
  }
  function announcementCourseIds() {
    const fromCatalog = (catalog || []).map(course => course.id);
    const ids = fromCatalog.length ? fromCatalog : state.assignments.map(a => a.courseId);
    return [...new Set(ids.map(String).filter(id => /^\d+$/.test(id)))];
  }
  const readAnnouncementIds = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem('canvas-local-read-announcements') || '[]');
      if (Array.isArray(saved)) return new Set(saved.map(String).filter(id => /^[\w-]{1,64}$/.test(id)));
    } catch {}
    return new Set();
  })();
  function saveReadAnnouncements() {
    try {
      const known = new Set((announcements || []).map(item => String(item.id)));
      const ids = [...readAnnouncementIds].filter(id => known.has(id)).slice(-500);
      readAnnouncementIds.clear();
      for (const id of ids) readAnnouncementIds.add(id);
      localStorage.setItem('canvas-local-read-announcements', JSON.stringify(ids));
    } catch {}
  }
  function isAnnouncementUnread(item) {
    return item.read_state === 'unread' && !readAnnouncementIds.has(String(item.id));
  }
  function announcementCourse(item) {
    const id = String(item.context_code || '').replace(/^course_/, '');
    const entry = (catalog || []).find(course => String(course.id) === id);
    if (entry) return entry.name;
    const task = state.assignments.find(a => String(a.courseId) === id);
    if (task) return task.course;
    return item.context_name || '';
  }
  function ingest(reply) {
    // Exit animations can finish out of order. Never let an older reply undo newer UI state.
    if (reply.feedVersion < appliedFeedVersion) {render(); return;}
    appliedFeedVersion = reply.feedVersion;
    state = reply.state;
    syncButton.dataset.tip = state.lastSync ? 'Last synced ' + new Date(state.lastSync).toLocaleString() : 'Not synced yet';
    notice.textContent = friendlyError(reply.warning || reply.lastError || state.syncError || '');
    if (course && !state.assignments.some(a => a.course === course)) course = '';
    renderCoursesFilter();
    render();
    refreshAnnouncementsBadge();
  }
  async function refresh(force = false) {
    if (loading) return {error: 'A sync is already in progress.'};
    loading = true; syncButton.disabled = true; syncButton.classList.add('busy');
    if (!state.assignments.length) list.replaceChildren(el('div', {class: 'empty'}, nebulaLoader(56, 'Reading the local assignment feed')));
    try { const reply = await request({action: force ? 'sync' : 'list'}); ingest(reply); return {error: reply.lastError || reply.state.syncError ? friendlyError(reply.lastError || reply.state.syncError) : ''}; }
    catch (error) { notice.textContent = friendlyError(error); render(); return {error: friendlyError(error)}; }
    finally {loading = false; syncButton.disabled = false; syncButton.classList.remove('busy');}
  }
  const formatDate = value => value ? new Date(value).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}) : 'No deadline';
  // Announcement bodies are instructor HTML. Render them as plain text so no
  // markup, entities, or active content ever reach the page.
  function htmlToText(html) {
    const blocked = String(html || '').replace(/<(br|p|div|li|tr|blockquote|h[1-6])[^>]*>/gi, '\n').replace(/<\/(p|div|ul|ol|li|table|tr|blockquote|h[1-6])[^>]*>/gi, '\n');
    const stripped = blocked.replace(/<[^>]*>/g, '');
    const decoder = document.createElement('textarea');
    decoder.innerHTML = stripped;
    return decoder.value.replace(/[ \t\u00a0]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
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
    main.classList.remove('tasks-layout');
    progressWrap.hidden = page !== 'tasks';
    main.setAttribute('aria-label', {tasks: 'Tasks', announcements: 'Announcements', courses: 'Courses', calendar: 'Calendar', inbox: 'Inbox', course: 'Course'}[page]);
    document.title = page === 'course' ? (courseWorkspace?.title() || 'Course') : (pageTitles[page] || 'Canvas Local');
    for (const button of navigation.querySelectorAll('[data-page]')) {
      const selected = button.dataset.page === (page === 'course' ? 'courses' : page);
      button.classList.toggle('selected', selected);
      if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    }
    positionSidebarIndicator();
    updateAnnouncementBadge();
    for (const tab of tabs.querySelectorAll('[role="tab"]')) {const selected = tab.id === 'tab-' + view; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;}
    taskPanel.setAttribute('aria-labelledby', 'tab-' + view);
    for (const tab of tabs.querySelectorAll('[role="tab"]')) tab.setAttribute('aria-controls', page === 'calendar' ? 'calendar-panel' : 'task-panel');
    pageContent.id = page === 'calendar' ? 'calendar-panel' : 'page-content';
    if (page === 'calendar') {pageContent.setAttribute('role', 'tabpanel'); pageContent.setAttribute('aria-labelledby', 'tab-' + view);}
    else {pageContent.removeAttribute('role'); pageContent.removeAttribute('aria-labelledby');}
    tabs.hidden = toolbar.hidden = taskPanel.hidden = !['tasks', 'calendar'].includes(page);
    taskPanel.hidden = page !== 'tasks'; pageContent.hidden = page === 'tasks';
    pageContent.setAttribute('aria-busy', String(remoteLoading && ['courses', 'inbox', 'announcements'].includes(page)));
    positionTabIndicator();
    renderCoursesFilter();
    if (page === 'course') {
      const route = readCourseRoute(location.href);
      if (route) {pageContent.replaceChildren(courseWorkspace.root); courseWorkspace.show(route); courseWorkspace.repaint();}
      return;
    }
    courseWorkspace?.leave();
    if (page === 'courses') {renderCatalog(); return;}
    if (page === 'inbox') {renderInbox(); return;}
    if (page === 'announcements') {renderAnnouncements(); return;}
    if (page === 'calendar') {renderCalendar(); return;}
    const items = filteredItems();
    progressWrap.replaceChildren();
    const rings = tasksProgress();
    if (rings) progressWrap.append(rings);
    progressWrap.hidden = !rings;
    main.classList.toggle('tasks-layout', Boolean(rings));
    list.replaceChildren();
    if (!items.length) {
      const title = query || course ? 'No matching tasks' : view === 'completed' ? 'No completed tasks yet' : state.assignments.length ? 'You’re all caught up' : 'No assignments cached';
      const description = query || course ? 'Try another course or search term.' : state.lastSync ? 'Sync now to check Canvas for new work.' : 'Use Connection settings to check your Canvas site and sync.';
      list.append(el('div', {class: 'empty'}, el('h2', {}, title), el('p', {}, description)));
      return;
    }
    for (const group of ['Overdue', 'Today', 'Tomorrow', 'This week', 'Coming up', 'No deadline', 'Completed']) {
      const members = items.filter(a => bucket(a) === group);
      if (!members.length) continue;
      list.append(el('h2', {class: 'group-title'}, group + ' · ' + members.length));
      for (const item of members) list.append(taskRow(item));
    }
  }
  // Concentric per-class progress rings for the Tasks page, inspired by
  // BetterCampus. Each ring is one class in the current search/course focus;
  // rings fill as tasks are completed. Totals ignore the To do/Completed tab
  // so progress stays visible while working through the list.
  const RING_MAX = 8;
  function tasksProgress() {
    const base = state.assignments.filter(a => (!course || a.course === course) && (a.title + ' ' + a.course).toLowerCase().includes(query.toLowerCase()));
    if (!base.length) return null;
    const groups = new Map();
    for (const item of base) {
      const entry = groups.get(item.course) || {name: item.course, total: 0, done: 0};
      entry.total++;
      if (item.completed) entry.done++;
      groups.set(item.course, entry);
    }
    const sorted = [...groups.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    const shown = sorted.slice(0, RING_MAX);
    const done = base.filter(a => a.completed).length;
    const percent = Math.round(done / base.length * 100);
    // Reserve the central 136-unit diameter for text, regardless of class count.
    // Extra rings get a finer stroke/spacing instead of shrinking the text well.
    const size = 240, center = size / 2, outerRadius = 116, innerRadius = 68;
    const step = shown.length > 1 ? (outerRadius - innerRadius) / (shown.length - 1) : 0;
    const stroke = shown.length > 1 ? Math.min(7, step * .65) : 7;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Overall progress: ${done} of ${base.length} tasks completed`);
    shown.forEach((group, index) => {
      const radius = outerRadius - index * step;
      const shade = 100 - (shown.length > 1 ? index / (shown.length - 1) * 30 : 0);
      const color = `color-mix(in srgb, var(--accent) ${shade}%, var(--bg))`;
      const track = document.createElementNS(svgNS, 'circle');
      track.setAttribute('cx', String(center)); track.setAttribute('cy', String(center)); track.setAttribute('r', String(radius));
      track.setAttribute('fill', 'none'); track.setAttribute('stroke', color); track.setAttribute('stroke-opacity', '0.16'); track.setAttribute('stroke-width', String(stroke));
      svg.append(track);
      const fraction = group.total ? group.done / group.total : 0;
      const arc = document.createElementNS(svgNS, 'circle');
      arc.setAttribute('cx', String(center)); arc.setAttribute('cy', String(center)); arc.setAttribute('r', String(radius));
      arc.setAttribute('fill', 'none'); arc.setAttribute('stroke', color); arc.setAttribute('stroke-width', String(stroke)); arc.setAttribute('stroke-linecap', 'round');
      arc.setAttribute('pathLength', '100'); arc.setAttribute('stroke-dasharray', '100'); arc.setAttribute('stroke-dashoffset', String(100 - fraction * 100));
      if (!fraction) arc.setAttribute('visibility', 'hidden');
      arc.setAttribute('transform', `rotate(-90 ${center} ${center})`);
      const label = document.createElementNS(svgNS, 'title');
      label.textContent = `${group.name}: ${group.done} of ${group.total} completed`;
      arc.append(label);
      svg.append(arc);
    });
    const rings = el('div', {class: 'rings-wrap'}, svg,
      el('div', {class: 'rings-center', 'aria-hidden': 'true'}, el('strong', {}, percent + '%'), el('span', {}, `${done}/${base.length}`)));
    return rings;
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
  // The swipe-away runs only where the row actually leaves the list (Tasks tabs).
  // Embedded rows that stay put, like the assignment page local task, skip it.
  function taskRow(item, exit = true) {
    const checkbox = el('input', {type: 'checkbox', class: 'check', 'aria-label': (item.completed ? 'Reopen ' : 'Complete ') + item.title});
    checkbox.checked = item.completed; checkbox.disabled = pending.has(item.uid);
    const row = el('article', {class: 'row', 'data-uid': item.uid, 'data-completed': String(item.completed)}, checkbox,
          el('div', {}, el('a', {class: 'title', href: item.url}, item.title), el('div', {class: 'meta'}, item.course)),
          el('div', {class: 'deadline', 'data-empty': item.effectiveDue ? 'false' : 'true'}, formatDate(item.effectiveDue), item.dueOverride ? el('small', {}, 'Personal deadline') : null),
          el('button', {class: 'edit', 'aria-label': 'Edit ' + item.title, onclick: () => edit(item)}, 'Edit'));
    checkbox.addEventListener('change', async () => {
      pending.add(item.uid); checkbox.disabled = true; row.classList.add('completing');
      try {
        const [reply] = await Promise.all([request({action: 'update', uid: item.uid, patch: {completion: checkbox.checked}}), motion(checkbox, [{transform: 'scale(.85)'}, {transform: 'scale(1.18)'}, {transform: 'scale(1)'}])]);
        if (exit) await motion(row, [{opacity: 1, transform: 'translateX(0)'}, {opacity: 0, transform: 'translateX(18px)'}], {duration: 180});
        const positions = new Map([...shadow.querySelectorAll('.row')].map(node => [node.dataset.uid, node.getBoundingClientRect().top]));
        pending.delete(item.uid); ingest(reply);
        for (const node of shadow.querySelectorAll('.row')) {
          const before = positions.get(node.dataset.uid);
          if (before != null) motion(node, [{transform: `translateY(${before - node.getBoundingClientRect().top}px)`}, {transform: 'translateY(0)'}]);
        }
        const next = [...shadow.querySelectorAll('.row .check')].find(node => !node.disabled);
        if (shadow.activeElement === null || shadow.activeElement === document.body) (next || tabs.querySelector('[aria-selected="true"]')).focus();
      } catch (error) {checkbox.checked = item.completed; notice.textContent = friendlyError(error); checkbox.disabled = false; row.classList.remove('completing');}
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
      grid.append(el('article', {class: 'course-card'}, el('div', {class: 'course-code'}, entry.course_code || 'Course'), el('h2', {}, entry.id ? el('a', {href: '/courses/' + encodeURIComponent(entry.id)}, entry.name) : entry.name),
        el('p', {class: 'meta'}, `${tasks.length - complete} to do · ${complete} completed`),
        el('progress', {max: String(tasks.length || 1), value: String(complete), 'aria-label': entry.name + ' task completion', 'aria-valuetext': `${complete} of ${tasks.length} tasks completed`}),
        el('p', {class: 'next-task'}, upcoming ? (new Date(upcoming.effectiveDue) < new Date() ? 'Overdue: ' : 'Next deadline: ') + formatDate(upcoming.effectiveDue) : 'No upcoming deadlines'),
        el('div', {class: 'actions'},
          entry.id ? el('a', {class: 'quiet primary course-link', href: '/courses/' + encodeURIComponent(entry.id)}, 'Open course') : null,
          el('button', {class: 'quiet', onclick: () => {course = entry.name; query = ''; search.value = ''; view = 'open'; navigate('tasks');}}, 'View tasks'))));
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
      el('div', {class: 'actions'}, el('button', {class: 'quiet month-step', 'aria-label': 'Previous month', onclick: () => moveMonth(-1)}, '‹'),
        el('button', {class: 'quiet', onclick: () => {selectedDay = new Date(); month = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1); renderCalendar();}}, 'Today'),
        el('button', {class: 'quiet month-step', 'aria-label': 'Next month', onclick: () => moveMonth(1)}, '›')));
    const grid = el('div', {class: 'calendar-grid', 'aria-label': 'Task calendar'});
    const sunday = new Date(2026, 10, 1);
    for (let i = 0; i < 7; i++) grid.append(el('div', {class: 'weekday'}, new Date(2026, 10, sunday.getDate() + i).toLocaleDateString(undefined, {weekday: 'short'})));
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 41);
    const focusDay = selectedDay >= start && selectedDay <= end ? dayKey(selectedDay) : dayKey(new Date(month.getFullYear(), month.getMonth(), 1));
    for (let i = 0; i < 42; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), key = dayKey(date), tasks = days.get(key) || [];
      grid.append(el('button', {class: 'calendar-day' + (date.getMonth() !== month.getMonth() ? ' outside' : '') + (key === dayKey(new Date()) ? ' today' : ''),
        tabindex: key === focusDay ? '0' : '-1',
        onkeydown: event => {
          const offsets = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -date.getDay(), End: 6 - date.getDay()};
          if (!(event.key in offsets)) return;
          event.preventDefault(); selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsets[event.key]);
          month = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1); renderCalendar();
          pageContent.querySelector(`[data-date="${dayKey(selectedDay)}"]`)?.focus();
        },
        'aria-pressed': String(key === dayKey(selectedDay)), 'aria-label': date.toLocaleDateString(undefined, {dateStyle: 'full'}) + `, ${tasks.length} tasks`,
        onclick: event => {selectedDay = date; renderCalendar(); pageContent.querySelector(`[data-date="${key}"]`)?.focus();}, 'data-date': key},
        el('span', {}, String(date.getDate())), tasks.length ? el('span', {class: 'day-count'}, String(tasks.length)) : null,
        ...tasks.slice(0, 2).map(item => el('span', {class: 'day-task'}, item.title))));
    }
    const agenda = el('section', {class: 'agenda', 'aria-label': 'Selected day tasks'}, el('h2', {}, selectedDay.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})));
    const selected = days.get(dayKey(selectedDay)) || [];
    if (selected.length) agenda.append(...selected.map(item => taskRow(item)));
    else agenda.append(el('p', {class: 'meta'}, 'No matching tasks due this day.'));
    pageContent.append(controls, el('div', {class: 'calendar-layout'}, grid, agenda));
  }
  async function readConversation(id) {
    const version = ++conversationVersion;
    remoteError = '';
    selectedConversation = null; conversationLoading = true; renderInbox();
    pageContent.querySelector(`[data-thread="${id}"]`)?.focus({preventScroll: true});
    try {
      const reply = await request({action: 'conversation', id});
      if (version !== conversationVersion) return;
      selectedConversation = reply.conversation;
    } catch (error) {if (version === conversationVersion) remoteError = friendlyError(error);}
    finally {if (version === conversationVersion) {conversationLoading = false; if (page === 'inbox') {renderInbox(); pageContent.querySelector(selectedConversation ? '.reader h2' : `[data-thread="${id}"]`)?.focus({preventScroll: true}); motion(pageContent.querySelector('.reader'), [{opacity: 0, transform: 'translateY(6px)'}, {opacity: 1, transform: 'translateY(0)'}]);}}}
  }
  let inboxScroll = 0;
  function renderInbox() {
    const previousThreads = pageContent.querySelector('.threads');
    if (previousThreads?.clientHeight) inboxScroll = previousThreads.scrollTop;
    pageContent.replaceChildren(); remoteStatus();
    if (!conversations?.length) {
      if (remoteLoading) pageContent.append(nebulaLoader(56, 'Loading conversations'));
      if (conversations && !remoteError) pageContent.append(el('div', {class: 'empty'}, 'Your inbox is empty.'));
      return;
    }
    const threads = el('div', {class: 'threads'});
    for (const thread of conversations || []) {
      threads.append(el('button', {class: 'thread' + (thread.workflow_state === 'unread' ? ' unread' : ''), 'data-thread': String(thread.id), 'aria-pressed': String(selectedConversation?.id === thread.id), onclick: () => readConversation(thread.id)},
        el('span', {class: 'meta'}, thread.context_name || (thread.participants || []).map(p => p.name).join(', ')),
        el('strong', {}, thread.subject || 'No subject'), el('span', {class: 'preview'}, thread.last_message || ''),
        el('span', {class: 'meta'}, thread.last_message_at ? formatDate(thread.last_message_at) : '')));
    }
    const reader = el('section', {class: 'reader', 'aria-label': 'Conversation', 'aria-live': 'polite'});
    if (conversationLoading) reader.append(el('button', {class: 'quiet inbox-back', onclick: () => {conversationVersion++; conversationLoading = false; selectedConversation = null; renderInbox(); pageContent.querySelector('.thread')?.focus({preventScroll: true});}}, 'Back to conversations'), nebulaLoader(32, 'Loading conversation'));
    else if (selectedConversation) {
      const id = selectedConversation.id;
      reader.append(el('button', {class: 'quiet inbox-back', onclick: () => {selectedConversation = null; renderInbox(); pageContent.querySelector(`[data-thread="${id}"]`)?.focus({preventScroll: true});}}, 'Back to conversations'), el('h2', {tabindex: '-1'}, selectedConversation.subject || 'No subject'));
      const participants = new Map((selectedConversation.participants || []).map(p => [p.id, p.name]));
      const messages = [...(selectedConversation.messages || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      for (const message of messages) reader.append(el('article', {class: 'message'}, el('strong', {}, participants.get(message.author_id) || 'Canvas user'),
        el('div', {class: 'meta'}, formatDate(message.created_at)), el('p', {class: 'message-body'}, message.body || ''),
        ...(message.attachments || []).map(file => el('p', {class: 'meta'}, 'Attachment: ' + (file.display_name || file.filename || 'File')))));
      reader.append(el('p', {class: 'meta'}, 'Replies and attachments are available in Original Canvas.'));
    } else reader.append(el('div', {class: 'empty'}, 'Choose a conversation to read.'));
    pageContent.append(el('div', {class: 'inbox-layout' + (selectedConversation || conversationLoading ? ' has-conversation' : '')}, threads, reader));
    threads.scrollTop = inboxScroll;
  }
  function renderAnnouncements() {
    pageContent.replaceChildren(); remoteStatus();
    if (!announcements?.length) {
      if (remoteLoading) pageContent.append(nebulaLoader(56, 'Loading announcements'));
      if (announcements && !remoteError) pageContent.append(el('div', {class: 'empty'}, 'No announcements.'));
      return;
    }
    const items = [...announcements].sort((a, b) => {
      if (!a.posted_at) return b.posted_at ? 1 : 0;
      if (!b.posted_at) return -1;
      return new Date(b.posted_at) - new Date(a.posted_at);
    });
    for (const item of items) {
      const open = expandedAnnouncement != null && String(expandedAnnouncement) === String(item.id);
      const card = el('article', {class: 'announcement' + (isAnnouncementUnread(item) ? ' unread' : '')},
        el('button', {class: 'announcement-title', 'data-announcement': String(item.id), 'aria-expanded': String(open), onclick: () => {if (!open && isAnnouncementUnread(item)) {readAnnouncementIds.add(String(item.id)); saveReadAnnouncements();} expandedAnnouncement = open ? null : item.id; render(); pageContent.querySelector(`[data-announcement="${item.id}"]`)?.focus({preventScroll: true});}},
          item.title || 'Untitled announcement'),
        el('div', {class: 'meta'}, [announcementCourse(item), item.posted_at ? formatDate(item.posted_at) : ''].filter(Boolean).join(' · ')));
      if (open) {
        const text = htmlToText(item.message);
        card.append(text ? el('p', {class: 'message-body'}, text) : el('p', {class: 'meta'}, 'No text.'));
        if (item.html_url) card.append(el('p', {}, el('a', {class: 'quiet', href: item.html_url}, 'Open in Original Canvas')));
      }
      pageContent.append(card);
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
      el('p', {class: 'source-status'}, 'Canvas deadline: ' + formatDate(item.canvasDue)),
      el('label', {class: 'field'}, 'Personal deadline (this laptop’s time zone)', due),
      el('button', {class: 'reset', type: 'button', onclick: () => {follow = true; dirtyDue = false; due.value = ''; error.textContent = 'Will follow the Canvas deadline when saved.';}}, 'Follow Canvas deadline'),
      el('p', {}, 'Leave the deadline empty to remove it personally. Canvas itself is never changed.'),
      el('label', {class: 'field'}, 'Personal notes', notes),
      el('button', {class: 'reset', type: 'button', onclick: async e => {
        e.target.disabled = true;
        try { ingest(await request({action: 'update', uid: item.uid, patch: {completion: null}})); dialog.close(); }
        catch (err) {error.textContent = friendlyError(err); e.target.disabled = false;}
      }}, 'Follow Canvas submission status'), error,
      el('div', {class: 'actions'}, save, el('button', {class: 'quiet', type: 'button', onclick: () => dialog.close()}, 'Cancel')));
    form.addEventListener('submit', async event => {
      event.preventDefault(); save.disabled = true;
      try {
        const patch = {notes: notes.value};
        if (follow) patch.followCanvasDue = true;
        else if (dirtyDue) patch.personalDue = due.value ? new Date(due.value).toISOString() : null;
        ingest(await request({action: 'update', uid: item.uid, patch})); dialog.close();
      } catch (err) {error.textContent = friendlyError(err); save.disabled = false;}
    });
    dialog.append(form); shadow.append(dialog);
    dialog.addEventListener('close', () => {
      dialog.remove();
      const row = [...shadow.querySelectorAll('.row')].find(node => node.dataset.uid === item.uid);
      (row?.querySelector('.edit') || main).focus({preventScroll: true});
    });
    dialog.showModal();
  }
  // Local cache refresh, not a network poll. Background alarms own Canvas fetching.
  setInterval(() => {if (opened && !document.hidden && ['tasks', 'calendar'].includes(page) && !pending.size && courseOptions.hidden && !shadow.querySelector('dialog')) refresh();}, 30000);
  shadow.addEventListener('keydown', event => {
    // Escape only dismisses open menus; it never closes the workspace itself.
    if (event.key === 'Escape' && opened && !shadow.querySelector('dialog')) {
      hideTooltip();
      if (!themeOptions.hidden) {event.preventDefault(); event.stopPropagation(); toggleThemePicker(false); themeButton.focus();}
    }
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
