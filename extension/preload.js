(() => {
  const routes = ['/', '/dashboard', '/courses', '/calendar', '/conversations', '/announcements'];
  if (!routes.includes(location.pathname.replace(/\/$/, '') || '/') && !globalThis.CanvasCourseRoutes?.parse(location.href)) return;
  try {if (sessionStorage.getItem('actually-better-canvas-mode') === 'original') return;} catch {}
  if (document.getElementById('canvas-local-preload-style')) return;

  // Paint the saved theme on the very first frame so the page never flashes
  // the default palette before the main script applies the active theme.
  // Falls back to the previous system-matched default when nothing is stored.
  let bootBackground = null;
  try {
    const boot = JSON.parse(localStorage.getItem('canvas-local-boot') || 'null');
    if (boot && typeof boot.bg === 'string' && /^#[0-9a-fA-F]{6}$/.test(boot.bg)) bootBackground = boot.bg;
  } catch {}
  if (!bootBackground) {
    try {bootBackground = matchMedia('(prefers-color-scheme: dark)').matches ? '#101013' : '#e1e1e3';} catch {bootBackground = '#e1e1e3';}
  }

  // Run before Canvas can paint. Removing this stylesheet restores every original style.
  const style = document.createElement('style');
  style.id = 'canvas-local-preload-style';
  style.textContent = `:root{background:${bootBackground}!important}body{opacity:0!important}`;
  let observer;
  function attach() {
    if (!document.documentElement) return;
    document.documentElement.append(style);
    observer?.disconnect();
  }
  if (document.documentElement) attach();
  else {observer = new MutationObserver(attach); observer.observe(document, {childList: true});}
  // Never leave Canvas invisible if the main content script fails or is disabled mid-load.
  setTimeout(() => {observer?.disconnect(); style.remove();}, 10000);
})();
