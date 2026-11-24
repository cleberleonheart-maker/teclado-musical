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

function readVarLength(view, cursor) {
  let value = 0;
  let byte = 0;
  do {
    byte = view.getUint8(cursor.offset++);
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80 && cursor.offset < cursor.length);
  return value;
}

export function parseMidi(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 14) throw new Error('Arquivo MIDI muito curto');
  const chunks = [];
  let offset = 0;
  while (offset + 8 <= view.byteLength) {
    const type = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
    const length = view.getUint32(offset + 4, false);
    if (offset + 8 + length > view.byteLength) break;
    chunks.push({ type, start: offset + 8, end: offset + 8 + length });
    offset += 8 + length;
  }
  const header = chunks.find((chunk) => chunk.type === 'MThd');
  if (!header || header.end - header.start < 6) throw new Error('Cabeçalho MIDI inválido');
  const format = view.getUint16(header.start, false);
  const tracks = view.getUint16(header.start + 2, false);
  let ticksPerBeat = view.getUint16(header.start + 4, false);
  if (ticksPerBeat & 0x8000) ticksPerBeat = 480;

  const active = new Map();
  const events = [];
  let tempoMicro = 500000;

  for (const chunk of chunks.filter((item) => item.type === 'MTrk')) {
    const cursor = { offset: chunk.start, length: chunk.end };
    let tick = 0;
    let running = null;
    while (cursor.offset < cursor.length) {
      tick += readVarLength(view, cursor);
      let status = view.getUint8(cursor.offset++);
      if (status & 0x80) running = status;
      else status = running;
      if (status === undefined) break;

      if (status === 0xff) {
        const metaType = view.getUint8(cursor.offset++);
        const size = readVarLength(view, cursor);
        if (metaType === 0x51 && size >= 3) {
          tempoMicro = (view.getUint8(cursor.offset) << 16) | (view.getUint8(cursor.offset + 1) << 8) | view.getUint8(cursor.offset + 2);
        }
        cursor.offset += size;
        if (metaType === 0x2f) break;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        cursor.offset += readVarLength(view, cursor);
        continue;
      }
      if (status < 0x80 || status >= 0xf0) continue;

      const note = view.getUint8(cursor.offset++);
      const second = status >= 0xc0 && status <= 0xdf ? 0 : view.getUint8(cursor.offset++);
      const command = status & 0xf0;
      if (command !== 0x90 && command !== 0x80) continue;
      const key = `${status & 0x0f}:${note}`;
      const seconds = tick / ticksPerBeat * 60 / (tempoMicro / 500000);
      if (command === 0x90 && second > 0) {
        active.set(key, { time: seconds, velocity: second / 127 });
      } else {
        const start = active.get(key);
        if (start) {
          active.delete(key);
          events.push({
            note,
            time: start.time,
            duration: Math.max(0.03, seconds - start.time),
            velocity: start.velocity
          });
        }
      }
    }
  }

  events.sort((a, b) => a.time - b.time || a.note - b.note);
  return {
    events,
    bpm: Math.round(clamp(60000000 / tempoMicro, 20, 300)),
    format,
    tracks,
    ticksPerBeat
  };
}
