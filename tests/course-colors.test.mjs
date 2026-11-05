import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const Colors = createRequire(import.meta.url)('../integrations/desktop/CourseColors.js');

test('class preset names replace color names without changing their hex values', () => {
  assert.deepEqual(Colors.options,[
    {value:'#7cb342',label:'Philosophy'}, {value:'#0b8043',label:'Chemistry'},
    {value:'#039be5',label:'Calculus'}, {value:'#3f51b5',label:'Engineering'},
    {value:'#c0ca33',label:'Physics'}, {value:'#7986cb',label:'Honors'},
    {value:'#616161',label:'Other'}
  ]);
  assert.equal(Colors.optionsFor('#0B8043').find(o=>o.value===Colors.normalize('#0B8043')).label,'Chemistry');
  assert.equal(Colors.optionsFor('#AABBCC').find(o=>o.value==='#aabbcc').label,'Custom (#aabbcc)');
  assert.equal(Colors.optionsFor('').find(o=>o.value==='').label,'Class default');
  assert.equal(Colors.options.length,7,'custom values must not mutate the shared palette');
});
