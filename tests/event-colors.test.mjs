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
test('all 24 Google colors display names, never cached hex labels or duplicate entries', () => {
  assert.equal(Object.keys(Colors.colorNames).length,24);
  const palette = [{value:'',label:'Calendar default',color:''}, ...Object.entries(Colors.colorNames).map(([color])=>({value:'label:' + color.slice(1),label:color,color}))];
  palette.push({value:'color:7',label:'Peacock',color:'#039be5'});
  for (const current of [{eventLabelId:'039be5',color:'#039be5'},{colorId:'7',color:'#039be5'}]) {
    const options=Colors.options({eventColors:palette},current);
    assert.equal(options.length,25);
    assert.equal(new Set(options.map(o=>o.label)).size,25);
    assert.ok(options.every(o=>!o.label.includes('#')));
    assert.equal(options.find(o=>o.value===Colors.selection(current)).label,'Peacock');
    assert.ok(options.some(o=>o.label==='Pistachio'));
    assert.ok(options.some(o=>o.label==='Avocado'));
  }
});
test('current color selection distinguishes provider IDs, legacy cache colors and calendar defaults', () => {
  assert.equal(Colors.initial({eventColor:'label:custom',eventColorHint:'#7986cb'},null),'label:custom');
  assert.equal(Colors.initial({eventColor:'',eventColorKnown:true,eventColorHint:'#039be5'},null),'');
  assert.equal(Colors.initial({eventColor:'',eventColorKnown:false,eventColorHint:'#039BE5'},null),'color:7');
  assert.equal(Colors.initial({eventColor:'',eventColorKnown:false,eventColorHint:'#039be5'},{color:'#039be5'}),'');
  const calendar={eventColors:[{value:'label:pistachio',label:'Pistachio',color:'#7cb342'}]};
  assert.equal(Colors.initial({eventColorKnown:false,eventColorHint:'#7cb342'},calendar),'label:pistachio');
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
