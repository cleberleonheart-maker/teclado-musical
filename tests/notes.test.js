import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChord,
  chordLabel,
  isBlack,
  keyToOffset,
  midiToFreq,
  midiToName,
  pitchClass,
  quantizeTime,
  scalePitchClasses
} from '../js/notes.js';

test('notas MIDI e frequências', () => {
  assert.equal(midiToName(60), 'C4');
  assert.equal(midiToName(61), 'C#4');
  assert.equal(midiToName(69), 'A4');
  assert.equal(midiToFreq(69), 440);
  assert.ok(Math.abs(midiToFreq(60) - 261.6256) < 0.001);
  assert.equal(midiToFreq(81, 444), 888);
});

test('teclas pretas e classe de tom', () => {
  assert.equal(isBlack(60), false);
  assert.equal(isBlack(61), true);
  assert.equal(isBlack(63), true);
  assert.equal(isBlack(64), false);
  assert.equal(pitchClass(72), 0);
});

test('mapeamento do teclado do computador', () => {
  assert.equal(keyToOffset('z'), 0);
  assert.equal(keyToOffset('S'), 1);
  assert.equal(keyToOffset('q'), 12);
  assert.equal(keyToOffset('2'), 13);
  assert.equal(keyToOffset('inexistente'), undefined);
});

test('acordes', () => {
  assert.deepEqual(buildChord(60, 'major'), [60, 64, 67]);
  assert.deepEqual(buildChord(60, 'min7'), [60, 63, 67, 70]);
  assert.deepEqual(buildChord(60, 'desconhecido'), [60, 64, 67]);
  assert.equal(chordLabel(60, 'minor'), 'C4m');
});

test('escalas', () => {
  assert.deepEqual([...scalePitchClasses(60, 'major')], [0, 2, 4, 5, 7, 9, 11]);
  assert.deepEqual([...scalePitchClasses(60, 'pentatonicMinor')], [0, 3, 5, 7, 10]);
  assert.equal(scalePitchClasses(62, 'none').size, 0);
});

test('quantização', () => {
  assert.equal(quantizeTime(0.31, 120, 4), 0.25);
  assert.equal(quantizeTime(0.13, 120, 16), 0.125);
});
