import test from 'node:test';
import assert from 'node:assert/strict';
import { RHYTHM_STYLES, PROGRESSIONS, DRUM_PADS, chordForProgression } from '../js/rhythm.js';

test('estilos de bateria cobrem 16 passos', () => {
  for (const [key, style] of Object.entries(RHYTHM_STYLES)) {
    for (const row of [...DRUM_PADS.map((pad) => pad.id), 'strum']) {
      assert.equal(style[row].length, 16, `${key}.${row}`);
    }
  }
  assert.equal(Object.keys(RHYTHM_STYLES).length, 12);
  assert.ok(RHYTHM_STYLES.rock.strum.some((value) => value > 0));
  assert.ok(RHYTHM_STYLES.gospel.clap.some((value) => value > 0));
});

test('progressões e acordes funcionam em qualquer tom', () => {
  const cMajor = chordForProgression('pop', 0, 0);
  assert.deepEqual(cMajor.notes, [48, 52, 55]);
  assert.equal(cMajor.label, 'C3');
  const gMajor = chordForProgression('pop', 0, 1);
  assert.deepEqual(gMajor.notes, [55, 59, 62]);
  const aMinor = chordForProgression('pop', 0, 2);
  assert.deepEqual(aMinor.notes, [57, 60, 64]);
  const gospelBridge = chordForProgression('gospel', 0, 3);
  assert.equal(gospelBridge.label, 'E3');
  assert.equal(PROGRESSIONS.gospel.degrees.length, 8);
  const wrapped = chordForProgression('pop', 0, -1);
  assert.equal(wrapped.label, 'F3');
});

test('tom transpõe a harmonia', () => {
  const dMajor = chordForProgression('pop', 2, 0);
  assert.deepEqual(dMajor.notes, [50, 54, 57]);
  assert.equal(dMajor.label, 'D3');
});
