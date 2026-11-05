(() => {
  const routes = ['/', '/dashboard', '/courses', '/calendar', '/conversations'];
  if (!routes.includes(location.pathname.replace(/\/$/, '') || '/') && !globalThis.CanvasCourseRoutes?.parse(location.href)) return;
  try {if (sessionStorage.getItem('actually-better-canvas-mode') === 'original') return;} catch {}
  if (document.getElementById('canvas-local-preload-style')) return;

  // Run before Canvas can paint. Removing this stylesheet restores every original style.
  const style = document.createElement('style');
  style.id = 'canvas-local-preload-style';
  style.textContent = ':root{background:#f3f5f3!important}body{opacity:0!important}@media(prefers-color-scheme:dark){:root{background:#171e1a!important}}';
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
