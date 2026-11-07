import {announcementsRead, collect, workspaceRead} from './api.mjs';
import {courseFileRead, courseRead, quizAnswer, quizComplete, quizResume, quizStart, quizTakeQuestions, submissionUploadInit, submissionUploadPut, submitAssignment, toolLaunch} from './course-api.mjs';
const HOST = 'com.canvas_local.feed';
let currentSync;

async function native(request) {
  try {
    const reply = await chrome.runtime.sendNativeMessage(HOST, request);
    if (!reply.ok) throw new Error(reply.error);
    return reply;
  } catch (error) {
    throw new Error(`Local feed: ${error.message}`);
  }
}

async function register(origin) {
  const existing = await chrome.scripting.getRegisteredContentScripts();
  const ids = existing.filter(script => ['canvas-local', 'canvas-local-preload'].includes(script.id)).map(script => script.id);
  if (ids.length) await chrome.scripting.unregisterContentScripts({ids});
  await chrome.scripting.registerContentScripts([
    {id: 'canvas-local-preload', matches: [origin + '/*'], js: ['course-routes.js', 'preload.js'], runAt: 'document_start'},
    {id: 'canvas-local', matches: [origin + '/*'], js: ['course-workspace.js', 'content.js'], runAt: 'document_idle'}
  ]);
}

async function sync() {
  if (currentSync) return currentSync;
  currentSync = (async () => {
    const {origin} = await chrome.storage.local.get('origin');
    if (!origin) throw new Error('Open Canvas Local settings and connect your Canvas website.');
    try {
      const result = await native(await collect(origin));
      await chrome.storage.local.set({lastError: '', lastSync: result.state.lastSync});
      return result;
    } catch (error) {
      await chrome.storage.local.set({lastError: error.message});
      await native({action: 'status', error: error.message}).catch(() => {});
      throw error;
    }
  })().finally(() => { currentSync = undefined; });
  return currentSync;
}

async function start() {
  await chrome.alarms.create('canvas-sync', {periodInMinutes: 2});
  const {origin} = await chrome.storage.local.get('origin');
  if (origin) {
    await register(origin);
    await sync();
  }
}
chrome.runtime.onInstalled.addListener(() => start().catch(console.error));
chrome.runtime.onStartup.addListener(() => start().catch(console.error));
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'canvas-sync') sync().catch(console.error); });
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  (async () => {
    const {origin} = await chrome.storage.local.get('origin');
    const internal = !sender.tab && sender.url?.startsWith(chrome.runtime.getURL(''));
    if (!internal && (!sender.tab || new URL(sender.url).origin !== origin)) throw new Error('Untrusted message source.');
    if (message.action === 'configure' && internal) {
      const url = new URL(message.origin);
      if (url.protocol !== 'https:' || url.port || url.username || url.password) throw new Error('Use your HTTPS Canvas website URL.');
      if (!await chrome.permissions.contains({origins: [url.origin + '/*']})) throw new Error('Website permission was not granted.');
      if (origin && origin !== url.origin) throw new Error('This installation is already connected to another Canvas site.');
      await chrome.storage.local.set({origin: url.origin});
      await register(url.origin);
      await chrome.alarms.create('canvas-sync', {periodInMinutes: 2});
      return sync();
    }
    if (message.action === 'sync') return sync();
    if (message.action === 'list') {
      const result = await native({action: 'list'});
      const {lastError} = await chrome.storage.local.get('lastError');
      return {...result, lastError};
    }
    if (message.action === 'update') return native({action: 'update', uid: message.uid, patch: message.patch});
    if (message.action === 'course') {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await courseRead(origin, state.identity, message.route)};
    }
    if (message.action === 'submitAssignment') {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await submitAssignment(origin, state.identity, message.route, message.submission)};
    }
    if (message.action === 'submissionUploadInit') {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await submissionUploadInit(origin, state.identity, message.route, message.file)};
    }
    if (message.action === 'submissionUpload') {
      return {ok: true, id: await submissionUploadPut(message.uploadUrl, message.uploadParams, message.file)};
    }
    if (message.action === 'toolLaunch') {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await toolLaunch(origin, state.identity, message.launch)};
    }
    if (message.action === 'quizStart') {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await quizStart(origin, state.identity, message.route, message.options)};
    }
    if (message.action === 'quizQuestions') {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await quizTakeQuestions(origin, state.identity, message.take)};
    }
    if (message.action === 'quizResume') {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await quizResume(origin, state.identity, message.route)};
    }
    if (message.action === 'quizAnswer') {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await quizAnswer(origin, state.identity, message.take)};
    }
    if (message.action === 'quizComplete') {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await quizComplete(origin, state.identity, message.take)};
    }
    if (message.action === 'courseFile') {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await courseFileRead(origin, state.identity, message.route, message.url)};
    }
    if (message.action === 'announcements') {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await announcementsRead(origin, state.identity, message.courseIds)};
    }
    if (['courses', 'inbox', 'conversation'].includes(message.action)) {
      if (!origin) throw new Error('Connect your Canvas website first.');
      const {state} = await native({action: 'list'});
      return {ok: true, ...await workspaceRead(origin, state.identity, message.action, message.id)};
    }
    throw new Error('Unsupported request.');
  })().then(respond, error => respond({ok: false, error: error.message}));
  return true;
});
