import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMidi } from '../js/export.js';

test('MIDI gerado tem cabeçalho e notas válidas', () => {
  const bytes = buildMidi([
    { note: 60, time: 0, duration: 0.5, velocity: 0.8 },
    { note: 64, time: 0.5, duration: 0.5, velocity: 0.7 }
  ], 120);
  const text = String.fromCharCode(...bytes.slice(0, 4));
  assert.equal(text, 'MThd');
  assert.equal(bytes[9], 0x00);
  assert.equal(bytes[11], 0x01);
  assert.equal(bytes[12] << 8 | bytes[13], 480);
  assert.ok(bytes.includes(0x90));
  assert.ok(bytes.includes(0x80));
  assert.equal(bytes[bytes.length - 3], 0xff);
  assert.equal(bytes[bytes.length - 2], 0x2f);
});

test('MIDI lida com sequência vazia', () => {
  const bytes = buildMidi([], 90);
  assert.ok(bytes.length > 20);
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'MThd');
});
