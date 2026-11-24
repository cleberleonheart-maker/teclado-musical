import { clamp, quantizeTime } from './notes.js';

export class Sequencer {
  constructor(engine, callbacks = {}) {
    this.engine = engine;
    this.callbacks = callbacks;
    this.events = [];
    this.recording = false;
    this.playing = false;
    this.loop = false;
    this.timers = new Set();
    this.openNotes = new Map();
    this.activeNotes = new Set();
    this.recStart = 0;
  }

  startRecording(clear = true) {
    this.stop();
    if (clear) this.events = [];
    this.recording = true;
    this.recStart = performance.now();
    this.callbacks.onChange?.(this);
    return true;
  }

  recordNoteOn(note, velocity = 0.85) {
    if (!this.recording) return;
    const event = {
      note,
      time: Math.max(0, (performance.now() - this.recStart) / 1000),
      duration: null,
      velocity: clamp(velocity, 0.05, 1)
    };
    this.events.push(event);
    this.openNotes.set(note, event);
    this.callbacks.onChange?.(this);
  }

  recordNoteOff(note) {
    if (!this.recording) return;
    const event = this.openNotes.get(note);
    if (!event) return;
    event.duration = Math.max(0.06, (performance.now() - this.recStart) / 1000 - event.time);
    this.openNotes.delete(note);
    this.callbacks.onChange?.(this);
  }

  stopRecording() {
    if (!this.recording) return;
    for (const event of this.openNotes.values()) {
      event.duration = Math.max(0.1, (performance.now() - this.recStart) / 1000 - event.time);
    }
    this.openNotes.clear();
    this.recording = false;
    this.callbacks.onChange?.(this);
  }

  schedule(fn, delay) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, Math.max(0, delay));
    this.timers.add(id);
    return id;
  }

  play() {
    if (!this.events.length) return false;
    this.stop();
    this.playing = true;
    const runCycle = () => {
      if (!this.playing) return;
      this.playStart = performance.now();
      for (const event of this.events) {
        this.schedule(() => {
          if (!this.playing) return;
          this.engine.noteOn(event.note, { velocity: event.velocity, source: 'seq', skipArp: true });
          this.activeNotes.add(event.note);
          this.callbacks.onNote?.(event.note, true);
          this.schedule(() => {
            this.engine.noteOff(event.note, { source: 'seq' });
            this.activeNotes.delete(event.note);
            this.callbacks.onNote?.(event.note, false);
          }, (event.duration || 0.2) * 1000);
        }, event.time * 1000);
      }
      const tail = (this.duration + 0.2) * 1000;
      if (this.loop) {
        this.schedule(runCycle, tail);
      } else {
        this.schedule(() => this.stop(), tail);
      }
    };
    runCycle();
    this.callbacks.onChange?.(this);
    return true;
  }

  stop() {
    if (this.recording) this.stopRecording();
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    for (const note of this.activeNotes) {
      this.engine.noteOff(note, { source: 'seq' });
      this.callbacks.onNote?.(note, false);
    }
    this.activeNotes.clear();
    if (this.playing || this.recording) {
      this.playing = false;
      this.callbacks.onChange?.(this);
    }
    this.playing = false;
  }

  togglePlay() {
    if (this.playing || this.recording) {
      this.stop();
      return false;
    }
    return this.play();
  }

  setLoop(value) {
    this.loop = Boolean(value);
    this.callbacks.onChange?.(this);
  }

  clear() {
    this.stop();
    this.stopRecording();
    this.events = [];
    this.callbacks.onChange?.(this);
  }

  removeLast() {
    this.events.pop();
    this.callbacks.onChange?.(this);
  }

  quantize(bpm, division = 4) {
    const step = 60 / clamp(bpm, 20, 300) / division;
    for (const event of this.events) {
      event.time = quantizeTime(event.time, bpm, division);
      event.duration = Math.max(step, quantizeTime(event.duration || step, bpm, division));
    }
    this.callbacks.onChange?.(this);
  }

  get duration() {
    return this.events.reduce((max, event) => Math.max(max, event.time + (event.duration || 0)), 0);
  }

  get progress() {
    return this.playing ? (performance.now() - this.playStart) / 1000 : null;
  }

  export(bpm = 120) {
    return JSON.stringify({ version: 1, bpm, events: this.events }, null, 2);
  }

  import(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.events)) throw new Error('Arquivo inválido');
    const events = data.events
      .filter((event) => Number.isFinite(event.note) && Number.isFinite(event.time))
      .map((event) => ({
        note: clamp(Math.round(event.note), 0, 127),
        time: Math.max(0, Number(event.time)),
        duration: Math.max(0.06, Number(event.duration) || 0.2),
        velocity: clamp(Number(event.velocity) || 0.85, 0.05, 1)
      }));
    this.stop();
    this.events = events;
    this.callbacks.onChange?.(this);
    return { count: events.length, bpm: data.bpm };
  }
}
