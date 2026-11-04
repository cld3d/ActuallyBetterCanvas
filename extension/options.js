const status = document.querySelector('#status');
const input = document.querySelector('#origin');
chrome.storage.local.get('origin').then(({origin}) => { input.value = origin || ''; });
function describe(reply) {
  if (!reply.ok) throw new Error(reply.error);
  return `${reply.state.assignments.length} assignments cached.\nLast Canvas sync: ${reply.state.lastSync ? new Date(reply.state.lastSync).toLocaleString() : 'not yet synced'}${reply.warning ? '\n' + reply.warning : ''}${reply.lastError || reply.state.syncError ? '\n' + (reply.lastError || reply.state.syncError) : ''}`;
}
chrome.runtime.sendMessage({action: 'list'}).then(reply => { status.textContent = describe(reply); }).catch(error => {status.textContent = error.message;});
document.querySelector('#connect').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  try {
    const origin = new URL(input.value).origin;
    // Must request permissions directly from this user gesture.
    const granted = await chrome.permissions.request({origins: [origin + '/*']});
    if (!granted) throw new Error('Canvas website access was declined.');
    button.disabled = true;
    status.textContent = 'Reading your Canvas assignments…';
    status.textContent = describe(await chrome.runtime.sendMessage({action: 'configure', origin}));
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
document.querySelector('#sync').addEventListener('click', async event => {
  event.target.disabled = true;
  status.textContent = 'Syncing…';
  try { status.textContent = describe(await chrome.runtime.sendMessage({action: 'sync'})); }
  catch (error) { status.textContent = error.message; }
  finally { event.target.disabled = false; }
});
