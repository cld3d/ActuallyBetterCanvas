import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const Clock = createRequire(import.meta.url)('../integrations/desktop/Clock.js');
test('AM/PM editor times round-trip without changing instants', () => {
  for (let minute = 0; minute < 1440; minute++) {
    const value = String(Math.floor(minute / 60)).padStart(2,'0') + ':' + String(minute % 60).padStart(2,'0');
    assert.equal(Clock.canonical(Clock.display(value)),value);
  }
  assert.equal(Clock.display('00:00'),'12:00 AM');
  assert.equal(Clock.display('12:00'),'12:00 PM');
  assert.equal(Clock.display('23:59'),'11:59 PM');
  assert.equal(Clock.canonical('4:30 pm'),'16:30');
  assert.equal(Clock.minutes('13:30 PM'),-1);
  assert.equal(Clock.minutes('12:60 AM'),-1);
});
