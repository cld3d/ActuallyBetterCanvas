(() => {
  // Tool launch and attempt URLs resolve to the record they belong to, so a
  // reload lands back in the workspace instead of Original Canvas. Editing,
  // downloads and unsupported views still stay out.
  function parse(input, origin = location.origin) {
    let url;
    try {url = new URL(input, origin);} catch {return null;}
    if (url.origin !== origin) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'courses' || !/^\d+$/.test(parts[1] || '')) return null;
    const courseId = parts[1], section = parts[2] || 'home';
    const kinds = {home: 'home', assignments: 'assignments', quizzes: 'quizzes', pages: 'pages', modules: 'modules', announcements: 'announcements', discussion_topics: 'discussions', files: 'files', grades: 'grades', users: 'people'};
    if (!kinds[section]) return null;
    if (section === 'assignments' && parts[3] === 'syllabus' && parts.length === 4) return {courseId, kind: 'syllabus', id: null, path: url.pathname + url.search + url.hash};
    let id;
    try {id = parts[3] ? decodeURIComponent(parts[3]) : null;} catch {return null;}
    if (section === 'modules' && id === 'items') return {courseId, kind: 'modules', id: null, path: url.pathname + url.search + url.hash};
    if (id && (section !== 'pages' ? !/^\d+$/.test(id) : !/^[^/\\?#\u0000-\u001f]+$/.test(id) || ['.', '..', 'new', 'edit'].includes(id))) return null;
    if (id && ['grades', 'users', 'announcements', 'assignments/syllabus'].includes(section)) return null;
    if (section === 'assignments' && !id && /\/syllabus\/?$/.test(url.pathname)) return null;
    const kind = {'assignments/syllabus': 'syllabus', users: 'people', discussion_topics: 'discussions'}[section] || section;
    if (kind === 'assignments' && id && parts[4] != null && !['launch', 'taking', 'submissions'].includes(parts[4])) return null;
    if (kind === 'quizzes' && id && parts[4] != null && parts[4] !== 'take') return null;
    if (kind !== 'assignments' && kind !== 'quizzes' && parts[4] != null) return null;
    if (kind === 'files' && !id && url.searchParams.has('preview')) {
      id = url.searchParams.get('preview');
      if (!/^\d+$/.test(id)) return null;
    }
    return {courseId, kind, id, path: url.pathname + url.search + url.hash};
  }
  globalThis.CanvasCourseRoutes = {parse};
})();
