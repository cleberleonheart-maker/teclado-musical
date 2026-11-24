import { clamp } from './notes.js';

function varLength(value) {
  const bytes = [value & 0x7f];
  let remaining = value >> 7;
  while (remaining > 0) {
    bytes.unshift((remaining & 0x7f) | 0x80);
    remaining >>= 7;
  }
  return bytes;
}

function split(value, bytes) {
  const result = [];
  for (let index = bytes - 1; index >= 0; index -= 1) result.push((value >> (index * 8)) & 255);
  return result;
}

function ascii(text) {
  return [...text].map((character) => character.charCodeAt(0) & 255);
}

export function buildMidi(events = [], bpm = 120) {
  const ticksPerBeat = 480;
  const tempo = Math.round(60000000 / clamp(bpm, 20, 300));
  const notes = [];
  for (const event of events) {
    if (!Number.isFinite(event.note) || !Number.isFinite(event.time)) continue;
    const note = clamp(Math.round(event.note), 0, 127);
    const velocity = clamp(Math.round((event.velocity ?? 0.85) * 127), 1, 127);
    const start = Math.max(0, Math.round(event.time * bpm / 60 * ticksPerBeat));
    const duration = Math.max(0.03, Number(event.duration) || 0.2);
    const end = Math.max(start + 1, Math.round((event.time + duration) * bpm / 60 * ticksPerBeat));
    notes.push({ tick: start, order: 1, bytes: [0x90, note, velocity] });
    notes.push({ tick: end, order: 0, bytes: [0x80, note, 0] });
  }
  notes.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const name = ascii('Teclado Musical');
  const track = [0, 0xff, 0x03, ...varLength(name.length), ...name];
  const tempoBytes = split(tempo, 3);
  track.push(0, 0xff, 0x51, 0x03, ...tempoBytes);
  track.push(0, 0xff, 0x58, 0x04, 4, 2, 24, 8);

  let previous = 0;
  for (const item of notes) {
    track.push(...varLength(item.tick - previous), ...item.bytes);
    previous = item.tick;
  }
  track.push(0, 0xff, 0x2f, 0x00);

  const header = [...ascii('MThd'), ...split(6, 4), ...split(0, 2), ...split(1, 2), ...split(ticksPerBeat, 2)];
  const trackHeader = [...ascii('MTrk'), ...split(track.length, 4)];
  return new Uint8Array([...header, ...trackHeader, ...track]);
}

export function midiBlob(events, bpm) {
  return new Blob([buildMidi(events, bpm)], { type: 'audio/midi' });
}
