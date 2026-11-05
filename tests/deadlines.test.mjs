import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {pluginDir, skipDesktop} from './environment.mjs';
const require = createRequire(import.meta.url);
const Tasks = require('../integrations/desktop/Tasks.js');
const Agenda = require('../integrations/desktop/Agenda.js');
const modelPath = join(pluginDir, 'blacksheep.calendar/Model.js');
const Model = !skipDesktop && existsSync(modelPath) ? require(modelPath) : null;
const desktopOptions = {skip: !Model && 'Installed Datebook unavailable or desktop tests disabled'};
process.env.TZ = 'America/Toronto';

const now = new Date('2026-11-04T15:00:00-05:00');
const timed = (uid, at, extra = {}) => ({uid, title:uid, account:'Canvas Local', taskList:'assignments', listName:'Course', due:'2026-11-04', dueAt:at, status:'needsAction', ...extra});

test('Datebook sidebar excludes undated tasks in Day and All modes without removing them elsewhere', () => {
  const data = {tasks:[{title:'Undated',due:''},{title:'Bad date',due:'invalid'},
    {title:'Today',due:'2026-11-04'},{title:'Tomorrow',due:'2026-11-05'},
    timed('Timed','2026-11-04T15:00:00-05:00',{due:''})]};
  for (const all of [false,true]) {
    const rows = Tasks.forDay(data,'2026-11-04','2026-11-04',all,now).filter(Tasks.hasDate);
    assert.equal(rows.some(t=>t.title==='Undated' || t.title==='Bad date'),false);
    assert.equal(rows.some(t=>t.title==='Timed'),true,'an exact dueAt counts as a date');
  }
  assert.equal(data.tasks.length,5);
  assert.equal(Agenda.remainingTasks(data,now,true).some(t=>t.title==='Undated'),true,'lock screen behavior is unchanged');
});

test('class colors survive indexing for both timed and end-of-day deadline markers', () => {
  for (const time of ['16:30', '23:59']) {
    const task = timed('colored', `2026-11-04T${time}:00-05:00`, {color:'#7cb342'});
    assert.equal(Tasks.indexByDay({tasks:[task]}, '#abcdef')['2026-11-04'][0].color, '#7cb342');
  }
});

test('same-day deadlines become overdue at the exact instant; date-only tasks do not', () => {
  const earlier = timed('earlier', '2026-11-04T14:59:00-05:00');
  const later = timed('later', '2026-11-04T15:01:00-05:00');
  assert.equal(Tasks.overdue(earlier, now), true);
  assert.equal(Tasks.overdue(later, now), false);
  assert.equal(Tasks.overdue(timed('exact', now.toISOString()), now), true);
  assert.equal(Tasks.overdue({due:'2026-11-04'}, now), false);
  assert.equal(Tasks.overdue({due:'2026-11-03'}, now), true);
  assert.equal(Tasks.dueLabel(earlier, '2026-11-04', now, true), 'Overdue · Today · 14:59');
  assert.equal(Tasks.dueLabel(later, '2026-11-04', now, false), 'Today · 3:01 PM');
});

test('time ordering overrides course and provider order', () => {
  const later = timed('later', '2026-11-04T23:59:00-05:00', {account:'A'});
  const earlier = timed('earlier', '2026-11-04T16:30:00-05:00', {account:'Z'});
  const data = {tasks:[later, {uid:'date-only',due:'2026-11-04'}, earlier]};
  assert.deepEqual(Tasks.forDay(data,'2026-11-04','2026-11-04',true,now).map(t=>t.uid), ['earlier','later','date-only']);
});

test('local date comes from the timestamp even when the cached date is stale', () => {
  const task = timed('midnight', '2026-11-05T02:00:00Z', {due:'2026-11-05'});
  assert.equal(Tasks.dueDay(task), '2026-11-04');
  assert.equal(Tasks.timeLabel(task, true), '21:00');
  assert.equal(Tasks.forDay({tasks:[task]}, '2026-11-05','2026-11-04',false).length, 0);
  assert.equal(Tasks.indexByDay({tasks:[task]}, '#abcdef', true)['2026-11-04'][0].taskTime, '21:00');
  assert.equal(Agenda.remainingTasks({tasks:[task]}, now, false).length, 1);
});

test('timed tasks are deadline points in day/week grids; date-only tasks stay all-day', () => {
  const task = timed('late', '2026-11-04T23:58:00-05:00');
  const byDay = Tasks.indexByDay({tasks:[task,{title:'Date only',due:'2026-11-04'}]}, '#abcdef', false);
  const row = byDay['2026-11-04'][0];
  assert.equal(row.allDay, false);
  assert.equal(row.deadline, true);
  assert.equal(row.start, row.end, 'must not fabricate a work-session duration');
  assert.equal(byDay['2026-11-04'][1].allDay, true);
});

test('11:59 PM deadlines appear in the top strip without changing their true deadline', () => {
  for (const instant of ['2026-11-04T23:59:00-05:00','2026-11-04T23:59:59-05:00','2026-11-05T04:59:00Z']) {
    const task = timed('end-of-day',instant);
    const row = Tasks.indexByDay({tasks:[task]},'#abcdef',false)['2026-11-04'][0];
    assert.equal(row.allDay,true);
    assert.equal(row.endOfDay,true);
    assert.equal(row.dueAt,instant);
    assert.equal(row.taskTime,'11:59 PM');
    assert.equal(Tasks.overdue(row,new Date('2026-11-04T23:58:59-05:00')),false);
    assert.equal(Tasks.overdue(row,new Date('2026-11-05T00:00:00-05:00')),true);
    assert.equal(task.allDay,undefined,'the underlying assignment must not be mutated');
  }
  const noon = Tasks.indexByDay({tasks:[timed('noon','2026-11-04T11:59:00-05:00')]})['2026-11-04'][0];
  assert.equal(noon.allDay,false,'11:59 AM is not an end-of-day deadline');
});

test('installed Datebook places timed markers correctly and excludes end-of-day strip tasks', desktopOptions, () => {
  const byDay = Tasks.indexByDay({tasks:[timed('late','2026-11-04T23:58:00-05:00'),timed('end-of-day','2026-11-04T23:59:00-05:00')]});
  const blocks = Model.dayLayout(byDay['2026-11-04'],'2026-11-04');
  assert.equal(blocks.length,1);
  assert.equal(blocks[0].top,1438);
  assert.equal(Model.hourRange(['2026-11-04'],byDay).last,24);
});

test('deadline markers use wall-clock positions through spring and fall DST changes', desktopOptions, () => {
  for (const [day, instant] of [['2026-03-08','2026-03-08T04:30:00-04:00'],['2026-11-01','2026-11-01T04:30:00-05:00']]) {
    const byDay = Tasks.indexByDay({tasks:[timed('dst',instant)]});
    assert.equal(Model.dayLayout(byDay[day],day)[0].top,270);
  }
});

test('lock screen retains overdue tasks, sorts exact times, and updates without a sync', () => {
  const tasks = [timed('evening','2026-11-04T20:00:00-05:00'),timed('afternoon','2026-11-04T16:00:00-05:00'),timed('past','2026-11-04T14:00:00-05:00'),timed('done','2026-11-04T13:00:00-05:00',{status:'completed'})];
  const rows = Agenda.remainingTasks({tasks},now,true);
  assert.deepEqual(rows.map(t=>t.uid),['past','afternoon','evening']);
  assert.equal(rows[0].overdue,true);
  assert.equal(rows[0].location,'Overdue · 2:00 PM · Course');
  assert.equal(rows[1].location,'Due 4:00 PM · Course');
  assert.equal(rows[1].dueLabel,'Today');
  const soon = Agenda.remainingTasks({tasks:[
    timed('tonight','2026-11-04T23:00:00-05:00'),timed('morning','2026-11-05T08:00:00-05:00'),
    timed('later','2026-11-06T08:00:00-05:00'),{uid:'dateless',title:'Dateless',due:''}
  ]},now,true);
  assert.deepEqual(soon.map(t=>t.uid),['tonight','morning','later','dateless']);
  assert.deepEqual(soon.map(t=>t.dueLabel),['Today','Tomorrow','Nov 6','No date']);
  const boundary = Agenda.remainingTasks({tasks:[timed('newyear','2026-01-01T09:00:00-05:00')]},
    new Date('2025-12-31T15:00:00-05:00'),true);
  assert.equal(boundary[0].dueLabel,'Tomorrow');
  const after = Agenda.remainingTasks({tasks},new Date('2026-11-04T16:01:00-05:00'),true);
  assert.equal(after[1].overdue,true);
});

test('invalid exact timestamps fall back safely and undated tasks sort last', () => {
  const tasks = [{uid:'undated',due:''},timed('bad','not-a-date'),timed('future','2026-11-05T12:00:00-05:00')];
  assert.equal(Tasks.dueInstant(tasks[1]), null);
  assert.deepEqual(Agenda.remainingTasks({tasks},now,true).map(t=>t.uid),['bad','future','undated']);
  assert.equal(Tasks.indexByDay({tasks})['2026-11-04'][0].allDay,true);
});
