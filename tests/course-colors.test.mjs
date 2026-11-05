import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const Colors = createRequire(import.meta.url)('../integrations/desktop/CourseColors.js');

test('class presets offer Google calendar colors without changing their hex values', () => {
  assert.deepEqual(Colors.options,[
    {value:'#7986cb',label:'Lavender'}, {value:'#33b679',label:'Sage'},
    {value:'#8e24aa',label:'Grape'}, {value:'#e67c73',label:'Flamingo'},
    {value:'#f6bf26',label:'Banana'}, {value:'#f4511e',label:'Tangerine'},
    {value:'#039be5',label:'Peacock'}, {value:'#616161',label:'Graphite'},
    {value:'#3f51b5',label:'Blueberry'}, {value:'#0b8043',label:'Basil'},
    {value:'#d50000',label:'Tomato'}
  ]);
  assert.equal(Colors.optionsFor('#0B8043').find(o=>o.value===Colors.normalize('#0B8043')).label,'Basil');
  assert.equal(Colors.optionsFor('#AABBCC').find(o=>o.value==='#aabbcc').label,'Custom (#aabbcc)');
  assert.equal(Colors.optionsFor('').find(o=>o.value==='').label,'Class default');
  assert.equal(Colors.options.length,11,'custom values must not mutate the shared palette');
});
