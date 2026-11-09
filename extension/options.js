const status = document.querySelector('#status');
const input = document.querySelector('#origin');
const friendlyError = value => /failed to fetch/i.test(String(value)) ? 'Couldn’t reach Canvas. Check your connection and sign in to Canvas, then choose Sync now to retry. Your cached assignments are unchanged.' : String(value);
function showError(error) {status.dataset.state = 'error'; status.textContent = friendlyError(error.message);}
chrome.storage.local.get('origin').then(({origin}) => { input.value = origin || ''; });
function describe(reply) {
  if (!reply.ok) throw new Error(reply.error);
  status.dataset.state = reply.lastError || reply.state.syncError || reply.warning ? 'error' : 'ready';
  return `${reply.state.assignments.length} assignments cached.\nLast successful Canvas sync: ${reply.state.lastSync ? new Date(reply.state.lastSync).toLocaleString() : 'not yet synced'}${reply.warning ? '\n' + friendlyError(reply.warning) : ''}${reply.lastError || reply.state.syncError ? '\n' + friendlyError(reply.lastError || reply.state.syncError) : ''}`;
}
chrome.runtime.sendMessage({action: 'list'}).then(reply => { status.textContent = describe(reply); }).catch(showError);
document.querySelector('#connect').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  try {
    const url = new URL(input.value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password) throw new Error('Use your HTTPS Canvas website URL.');
    const origin = url.origin;
    // Must request permissions directly from this user gesture.
    const granted = await chrome.permissions.request({origins: [origin + '/*']});
    if (!granted) throw new Error('Canvas website access was declined.');
    button.disabled = true;
    status.dataset.state = 'loading';
    status.textContent = 'Reading your Canvas assignments…';
    status.textContent = describe(await chrome.runtime.sendMessage({action: 'configure', origin}));
  } catch (error) { showError(error); }
  finally { button.disabled = false; }
});
document.querySelector('#sync').addEventListener('click', async event => {
  event.target.disabled = true;
  status.dataset.state = 'loading';
  status.textContent = 'Syncing…';
  try { status.textContent = describe(await chrome.runtime.sendMessage({action: 'sync'})); }
  catch (error) { showError(error); }
  finally { event.target.disabled = false; }
});
