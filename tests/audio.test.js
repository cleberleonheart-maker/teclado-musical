import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, targetPartsFor } from '../js/audio.js';

test('catálogo de instrumentos', () => {
  assert.ok(Object.keys(PRESETS).length >= 18);
  for (const [key, preset] of Object.entries(PRESETS)) {
    assert.ok(preset.label, `${key} sem rótulo`);
    assert.ok(preset.attack >= 0 && preset.release > 0, `${key} com envelope inválido`);
  }
});

test('instrumentos de corda usam modelo de palheta', () => {
  for (const key of ['guitar', 'acousticGuitar', 'harp', 'banjo']) {
    assert.equal(PRESETS[key].model, 'pluck');
    assert.ok(PRESETS[key].brightness > 0);
    assert.ok(PRESETS[key].damping > 0.95);
  }
  assert.ok(PRESETS.guitar.distortion > 0);
  assert.equal(PRESETS.acousticGuitar.distortion, 0);
});

test('instrumentos de sopro e cordas têm vibrato', () => {
  for (const key of ['violin', 'cello', 'strings', 'flute', 'sax', 'trumpet']) {
    assert.ok(PRESETS[key].vibratoDepth > 0, `${key} sem vibrato`);
  }
});

test('roteamento de dois instrumentos', () => {
  assert.deepEqual(targetPartsFor('single', 60, 60, 'B'), ['B']);
  assert.deepEqual(targetPartsFor('split', 59, 60, 'A'), ['A']);
  assert.deepEqual(targetPartsFor('split', 61, 60, 'A'), ['B']);
  assert.deepEqual(targetPartsFor('layer', 90, 60, 'B'), ['A', 'B']);
});
