import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const Agenda = createRequire(import.meta.url)('../integrations/desktop/Agenda.js');
process.env.TZ = 'America/Toronto';

test('events and tasks interleave by exact time, including overdue and future work', () => {
  const now = new Date('2026-11-04T10:00:00-05:00');
  const data = {
    calendars:[{account:'Personal',id:'calendar',shown:true,name:'Calendar'}],
    events:[{account:'Personal',calendar:'calendar',title:'Meeting',start:'2026-11-04T12:00:00-05:00',end:'2026-11-04T13:00:00-05:00'},
      {account:'Personal',calendar:'calendar',title:'Afternoon event',start:'2026-11-04T16:00:00-05:00',end:'2026-11-04T17:00:00-05:00'}],
    tasks:[['Past','2026-11-03T12:00:00-05:00'],['Morning task','2026-11-04T11:00:00-05:00'],['Afternoon task','2026-11-04T14:00:00-05:00'],['End of day','2026-11-04T23:59:00-05:00'],['Tomorrow','2026-11-05T11:00:00-05:00']].map(([title,dueAt])=>({title,uid:title,dueAt}))
  };
  const rows = Agenda.mergeRows(Agenda.remaining(data,now),Agenda.remainingTasks(data,now,true));
  assert.deepEqual(rows.map(r=>r.title),['Past','Morning task','Meeting','Afternoon task','Afternoon event','End of day','Tomorrow']);
  assert.equal(rows[0].overdue,true);
});

test('date-only rows use local midnight, undated rows come last, ties remain stable', () => {
  const event = {kind:'event',title:'All day',allDay:true,start:'2026-11-04'};
  const task = {kind:'task',title:'Date only',due:'2026-11-04'};
  const early = {kind:'event',title:'Early',start:'2026-11-04T04:00:00Z'}; // Previous day, 11 PM local.
  const untimed = {kind:'task',title:'No deadline'};
  const invalid = {kind:'task',title:'Bad date',dueAt:'bad'};
  const events = [event,early], tasks = [untimed,task,invalid];
  assert.deepEqual(Agenda.mergeRows(events,tasks).map(r=>r.title),['Early','All day','Date only','No deadline','Bad date']);
  assert.deepEqual(events,[event,early]);
  assert.deepEqual(tasks,[untimed,task,invalid]);
  assert.deepEqual(Agenda.mergeRows(null,null),[]);
});
