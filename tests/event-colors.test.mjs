import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const Colors = createRequire(import.meta.url)('../integrations/desktop/EventColors.js');

test('event picker preserves current labels and supports provider palettes', () => {
  const event = {eventLabelId:'existing',color:'#7cb342'};
  const options = Colors.options(null,event);
  assert.equal(Colors.selection(event),'label:existing');
  assert.ok(options.some(o=>o.value==='color:7'));
  assert.ok(options.some(o=>o.value==='label:existing'));
  const calendar={eventColors:[{value:'label:avocado',label:'Avocado',color:'#c0ca33'}]};
  assert.equal(Colors.options(calendar,null)[0].label,'Avocado');
});
test('color-only event writes, default resets, and series flags reach calendar CLI', () => {
  const draft={uid:'Test/calendar/event',eventColorChanged:true,eventColor:'label:pistachio'};
  assert.deepEqual(Colors.args(draft,{args:[]}),{args:['update',draft.uid,'--event-color','label:pistachio']});
  assert.deepEqual(Colors.args({...draft,eventColor:'',series:true},{args:[]}).args,['update',draft.uid,'--event-color','','--series']);
  assert.deepEqual(Colors.args({...draft,eventColorChanged:false},{args:[]}),{args:[]});
  assert.deepEqual(Colors.args(draft,{error:'bad time'}),{error:'bad time'});
  const existing={args:['update',draft.uid,'--title','New','--series']};
  assert.equal(Colors.args({...draft,series:true},existing).args.filter(x=>x==='--series').length,1);
  assert.deepEqual(existing.args,['update',draft.uid,'--title','New','--series']);
});
