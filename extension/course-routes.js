(() => {
  // Deliberately exclude submissions, quiz attempts, editing, downloads and LTI launches.
  // Those documents must remain real Canvas, not a read-only imitation.
  function parse(input, origin = location.origin) {
    let url;
    try {url = new URL(input, origin);} catch {return null;}
    if (url.origin !== origin) return null;
    const match = url.pathname.match(/^\/courses\/(\d+)(?:\/(assignments\/syllabus|assignments|quizzes|pages|modules|announcements|discussion_topics|files|grades|users)(?:\/([^/]+))?)?\/?$/);
    if (!match) return null;
    const courseId = match[1], section = match[2] || 'home';
    let id;
    try {id = match[3] ? decodeURIComponent(match[3]) : null;} catch {return null;}
    if (id && (section !== 'pages' ? !/^\d+$/.test(id) : !/^[^/\\?#\u0000-\u001f]+$/.test(id) || ['.', '..', 'new', 'edit'].includes(id))) return null;
    if (id && ['grades', 'users', 'announcements', 'assignments/syllabus'].includes(section)) return null;
    if (section === 'assignments' && !id && /\/syllabus\/?$/.test(url.pathname)) return null;
    const kind = {'assignments/syllabus': 'syllabus', users: 'people', discussion_topics: 'discussions'}[section] || section;
    if (kind === 'files' && !id && url.searchParams.has('preview')) {
      id = url.searchParams.get('preview');
      if (!/^\d+$/.test(id)) return null;
    }
    return {courseId, kind, id, path: url.pathname + url.search + url.hash};
  }
  globalThis.CanvasCourseRoutes = {parse};
})();
