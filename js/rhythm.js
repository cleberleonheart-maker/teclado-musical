import { buildChord, chordLabel, clamp, NOTE_NAMES } from './notes.js';

const STEPS = 16;

export const DRUM_PADS = [
  { id: 'kick', label: 'Bumbo', key: '1' },
  { id: 'snare', label: 'Caixa', key: '2' },
  { id: 'hat', label: 'Hi-hat', key: '3' },
  { id: 'openhat', label: 'Hi-hat aberto', key: '4' },
  { id: 'clap', label: 'Palmas', key: '5' },
  { id: 'crash', label: 'Crash', key: '6' }
];

const AUTO_DRUMS = ['kick', 'snare', 'hat', 'openhat', 'clap'];

export const RHYTHM_STYLES = {
  rock: {
    label: 'Rock',
    kick: [1, 0, 0, 0, 0, 0, 0.8, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0.7, 0, 0.5, 0, 0.7, 0, 0.5, 0, 0.7, 0, 0.5, 0, 0.7, 0, 0.5, 0],
    openhat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    crash: [0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [1, 0, 0, 0.6, 0, 0, 1, 0, 0.6, 0, 0, 0, 1, 0, 0.6, 0]
  },
  gospel: {
    label: 'Gospel',
    kick: [1, 0, 0, 0.6, 0, 0, 1, 0, 1, 0, 0, 0.6, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 0.9, 0, 0, 0.5, 0, 0, 0, 0, 1, 0, 0, 0.5],
    hat: [0.7, 0, 0.6, 0, 0.7, 0, 0.6, 0, 0.7, 0, 0.6, 0, 0.7, 0, 0.6, 0],
    openhat: [0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0, 0.7],
    clap: [0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0],
    crash: [0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [1, 0, 0.6, 0, 0, 1.7, 0, 0.6, 1, 0, 0, 0.6, 0, 1.7, 0, 0.6]
  },
  pop: {
    label: 'Pop',
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0],
    openhat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0],
    clap: [0, 0, 0, 0, 0.4, 0, 0, 0, 0, 0, 0, 0, 0.4, 0, 0, 0],
    crash: [0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [1, 0, 0, 0, 0.6, 0, 0, 0, 1, 0, 0, 0, 0.6, 0, 0, 0]
  },
  metal: {
    label: 'Metal',
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0],
    openhat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    crash: [0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
  },
  funk: {
    label: 'Funk',
    kick: [1, 0, 0, 0.6, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0.9, 0.5, 0, 0, 0, 0],
    hat: [0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4],
    openhat: [0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0.6, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0],
    crash: [0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [1, 0, 0, 0.6, 0, 1.7, 0, 0, 0.6, 0, 1.7, 0, 0, 0, 0.6, 0]
  },
  ballad: {
    label: 'Balada',
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0],
    hat: [0.4, 0, 0.3, 0, 0.4, 0, 0.3, 0, 0.4, 0, 0.3, 0, 0.4, 0, 0.3, 0],
    openhat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    crash: [0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
  },
  reggae: {
    label: 'Reggae',
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5],
    openhat: [0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    crash: [0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [0, 1.7, 0, 1.7, 0, 1.7, 0, 1.7, 0, 1.7, 0, 1.7, 0, 1.7, 0, 1.7]
  },
  sertanejo: {
    label: 'Sertanejo',
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0.6, 0, 0.4, 0, 0.6, 0, 0.4, 0, 0.6, 0, 0.4, 0, 0.6, 0, 0.4, 0],
    openhat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0],
    clap: [0, 0, 0, 0, 0.3, 0, 0, 0, 0, 0, 0, 0, 0.3, 0, 0, 0],
    crash: [0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [1, 0, 0, 0.6, 0, 0, 1, 0, 1, 0, 0, 0.6, 0, 0, 1, 0]
  },
  pagode: {
    label: 'Pagode',
    kick: [1, 0, 0, 0.5, 0, 0, 1, 0, 1, 0, 0, 0.5, 0, 0, 1, 0],
    snare: [0, 0, 0.5, 0, 0.7, 0, 0, 0.4, 0, 0, 0.5, 0, 0.8, 0, 0, 0.4],
    hat: [0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4],
    openhat: [0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0.5],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0, 0, 0],
    crash: [0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [1, 0, 0.6, 0, 0, 1.7, 0, 0.6, 1, 0, 0.6, 0, 0, 1.7, 0, 0.6]
  },
  blues: {
    label: 'Blues',
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0.8, 0],
    snare: [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0],
    hat: [0.6, 0, 0.4, 0, 0.6, 0, 0.4, 0, 0.6, 0, 0.4, 0, 0.6, 0, 0.4, 0],
    openhat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    crash: [0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [1, 0, 0, 0.6, 0, 0, 0.6, 0, 1, 0, 0, 0.6, 0, 0, 0.6, 0]
  },
  jazz: {
    label: 'Jazz',
    kick: [0.8, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0],
    hat: [0.5, 0, 0.3, 0, 0.5, 0, 0.3, 0, 0.5, 0, 0.3, 0, 0.5, 0, 0.3, 0],
    openhat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    crash: [0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [1, 0, 0, 0, 0, 0, 1.6, 0, 0.6, 0, 0, 0, 0, 0, 1.6, 0]
  },
  techno: {
    label: 'Techno',
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5],
    openhat: [0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0.5],
    clap: [0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0],
    crash: [0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    strum: [1, 0, 0.6, 0, 1, 0, 0.6, 0, 1, 0, 0.6, 0, 1, 0, 0.6, 0]
  }
};

export const PROGRESSIONS = {
  pop: {
    label: 'I – V – vi – IV',
    degrees: [['I', 'major'], ['V', 'major'], ['vi', 'minor'], ['IV', 'major']]
  },
  gospel: {
    label: 'Gospel · I V vi III IV',
    degrees: [['I', 'major'], ['V', 'major'], ['vi', 'minor'], ['III', 'major'], ['IV', 'major'], ['I', 'major'], ['IV', 'major'], ['V', 'dom7']]
  },
  worship: {
    label: 'Louvor · I V vi IV',
    degrees: [['I', 'maj7'], ['V', 'major'], ['vi', 'min7'], ['IV', 'maj7']]
  },
  classic: {
    label: 'I – IV – V – I',
    degrees: [['I', 'major'], ['IV', 'major'], ['V', 'major'], ['I', 'major']]
  },
  minor: {
    label: 'vi – IV – I – V',
    degrees: [['vi', 'minor'], ['IV', 'major'], ['I', 'major'], ['V', 'major']]
  }
};

const DEGREE_SEMITONES = {
  I: 0, i: 0, ii: 2, III: 4, iii: 4, IV: 5, iv: 5, V: 7, v: 7, vi: 9, VI: 9, vii: 11, viiDim: 11
};

const RHYTHM_DEFAULTS = {
  style: 'rock',
  progression: 'pop',
  key: 0,
  swing: 0,
  drumVolume: 0.75,
  guitarVolume: 0.8,
  chordSource: 'progression',
  autoFill: true
};

export function chordForProgression(progressionKey, keyPc, chordIndex = 0) {
  const progression = PROGRESSIONS[progressionKey] || PROGRESSIONS.pop;
  const [degree, quality] = progression.degrees[((chordIndex % progression.degrees.length) + progression.degrees.length) % progression.degrees.length];
  const rootPc = (keyPc + (DEGREE_SEMITONES[degree] ?? 0) + 12) % 12;
  const root = 48 + rootPc;
  return { notes: buildChord(root, quality), label: chordLabel(root, quality) };
}

export class RhythmSection {
  constructor(engine, callbacks = {}) {
    this.engine = engine;
    this.callbacks = callbacks;
    this.settings = { ...RHYTHM_DEFAULTS };
    this.ready = false;
    this.playing = false;
    this.step = 0;
    this.chordIndex = -1;
    this.bar = 0;
    this.nextTime = 0;
    this.timer = null;
    this.strumChannel = 0;
    this.strumTimers = new Set();
    this.activeStrums = new Map();
  }

  async ensure() {
    if (this.ready) return;
    await this.engine.ensure();
    this.ctx = this.engine.ctx;
    this.drumGain = this.ctx.createGain();
    this.drumGain.connect(this.engine.comp);
    this.guitarGain = this.ctx.createGain();
    this.guitarGain.connect(this.engine.partNodes.B.input);
    this.noiseBuffer = this.createNoiseBuffer();
    this.ready = true;
    this.applyVolumes();
  }

  createNoiseBuffer() {
    const length = Math.floor(this.ctx.sampleRate * 2);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  applyVolumes() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    this.drumGain.gain.setTargetAtTime(clamp(this.settings.drumVolume, 0, 1), now, 0.01);
    this.guitarGain.gain.setTargetAtTime(clamp(this.settings.guitarVolume, 0, 1) * 0.7, now, 0.01);
  }

  restore(settings = null) {
    const next = { ...RHYTHM_DEFAULTS, ...(settings || {}) };
    next.style = RHYTHM_STYLES[next.style] ? next.style : RHYTHM_DEFAULTS.style;
    next.progression = PROGRESSIONS[next.progression] ? next.progression : RHYTHM_DEFAULTS.progression;
    next.key = clamp(Math.round(Number(next.key) || 0), 0, 11);
    next.swing = clamp(Number(next.swing) || 0, 0, 0.7);
    next.drumVolume = clamp(Number(next.drumVolume ?? RHYTHM_DEFAULTS.drumVolume), 0, 1);
    next.guitarVolume = clamp(Number(next.guitarVolume ?? RHYTHM_DEFAULTS.guitarVolume), 0, 1);
    next.chordSource = next.chordSource === 'played' ? 'played' : 'progression';
    next.autoFill = next.autoFill !== false;
    this.settings = next;
    this.applyVolumes();
    this.callbacks.onSettingsChange?.(this.settings);
  }

  setSetting(key, value) {
    if (!(key in RHYTHM_DEFAULTS)) return;
    this.settings[key] = value;
    this.restore(this.settings);
  }

  async triggerDrum(id, velocity = 1) {
    await this.ensure();
    this.playDrum(id, this.ctx.currentTime, velocity);
    this.callbacks.onPad?.(id);
  }

  playTone(when, endFrequency, duration, peak, type = 'sine') {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startFrequency = type === 'kick' ? 150 : type === 'tom' ? 200 : 180;
    osc.type = type === 'kick' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(startFrequency, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), when + Math.min(0.18, duration));
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak, when + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(this.drumGain);
    osc.start(when);
    osc.stop(when + duration + 0.04);
    osc.onended = () => gain.disconnect();
  }

  playNoise(when, duration, filterType, frequency, peak, q = 0.8) {
    const ctx = this.ctx;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak, when + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumGain);
    source.start(when, Math.random() * 1.5);
    source.stop(when + duration + 0.04);
    source.onended = () => gain.disconnect();
  }

  playDrum(id, when = this.ctx?.currentTime, velocity = 1) {
    if (!this.ready || !id) return;
    const time = Math.max(this.ctx.currentTime, when ?? this.ctx.currentTime);
    const vel = clamp(velocity, 0, 1);
    if (vel <= 0) return;
    if (id === 'kick') {
      this.playTone(time, 48, 0.38, 0.9 * vel, 'kick');
    } else if (id === 'snare') {
      this.playNoise(time, 0.18, 'highpass', 1400, 0.35 * vel);
      this.playTone(time, 120, 0.12, 0.18 * vel, 'snare');
    } else if (id === 'hat') {
      this.playNoise(time, 0.06, 'highpass', 7500, 0.2 * vel, 0.6);
    } else if (id === 'openhat') {
      this.playNoise(time, 0.38, 'highpass', 6500, 0.17 * vel, 0.6);
    } else if (id === 'clap') {
      [0.22, 0.16, 0.12].forEach((peak, index) => {
        this.playNoise(time + index * 0.013, 0.09, 'bandpass', 1500, peak * vel, 1.2);
      });
    } else if (id === 'crash') {
      this.playNoise(time, 1.2, 'highpass', 4200, 0.24 * vel, 0.5);
    } else if (id === 'tom') {
      this.playTone(time, 95, 0.28, 0.55 * vel, 'tom');
    }
  }

  queueFill(start = null) {
    if (!this.ready) return;
    const stepDuration = 60 / clamp(this.engine.settings.bpm, 60, 200) / 4;
    const when = start ?? Math.max(this.ctx.currentTime + 0.05, this.nextTime);
    for (let index = 0; index < 8; index += 1) {
      const drum = index < 4 ? 'snare' : 'tom';
      this.playDrum(drum, when + index * 2 * stepDuration, 0.5 + index * 0.055);
    }
    this.playDrum('crash', when, 0.7);
    this.callbacks.onFill?.();
  }

  async triggerFill() {
    await this.ensure();
    this.queueFill();
  }

  currentChord() {
    if (this.settings.chordSource === 'played') {
      const live = this.callbacks.getLiveChord?.();
      if (live?.notes?.length) return live;
    }
    return chordForProgression(this.settings.progression, this.settings.key, Math.max(0, this.chordIndex));
  }

  async strumChord(notes, value) {
    if (!this.ready || !notes.length) return;
    const up = value > 1;
    const velocity = clamp(up ? value - 1 : value, 0.12, 1);
    const ordered = up ? [...notes].reverse() : notes;
    const now = this.ctx.currentTime;
    for (let index = 0; index < ordered.length; index += 1) {
      const note = ordered[index];
      const channel = this.strumChannel;
      this.strumChannel = (this.strumChannel + 1) % 997;
      const key = this.engine.voiceKey(note, 'rhythm', channel, 'B');
      this.activeStrums.set(key, note);
      const timer = setTimeout(() => {
        this.strumTimers.delete(timer);
        this.engine.releaseVoice(key);
        this.activeStrums.delete(key);
      }, Math.max(80, (now + index * 0.018 + 0.55 - this.ctx.currentTime) * 1000));
      this.strumTimers.add(timer);
      await this.engine.triggerVoice(note, 'B', { source: 'rhythm', channel, velocity: velocity * 0.9 });
    }
  }

  scheduleStep(step, time) {
    const style = RHYTHM_STYLES[this.settings.style] || RHYTHM_STYLES.rock;
    const stepDuration = 60 / clamp(this.engine.settings.bpm, 60, 200) / 4;
    const hitTime = time + (step % 2 === 1 ? stepDuration * this.settings.swing * 0.45 : 0);
    if (step === 0) {
      const length = (PROGRESSIONS[this.settings.progression] || PROGRESSIONS.pop).degrees.length;
      this.chordIndex = (this.chordIndex + 1) % length;
    }
    for (const id of AUTO_DRUMS) {
      const velocity = style[id]?.[step] || 0;
      if (velocity > 0) this.playDrum(id, hitTime, velocity);
    }
    if (step === 0 && this.bar % 4 === 0 && style.crash?.[0] > 0) {
      this.playDrum('crash', time, style.crash[0]);
    }
    if (step === 0 && this.bar > 0 && this.bar % 4 === 0 && this.settings.autoFill) {
      this.queueFill(time);
    }
    const strum = style.strum?.[step] || 0;
    if (strum > 0) {
      const chord = this.currentChord();
      const delay = Math.max(0, (hitTime - this.ctx.currentTime) * 1000);
      const timer = setTimeout(() => {
        this.strumTimers.delete(timer);
        this.strumChord(chord.notes, strum);
      }, delay);
      this.strumTimers.add(timer);
    }
    this.callbacks.onStep?.(step, this.chordIndex, chordLabelSafe(this.currentChord()));
  }

  advance() {
    const stepDuration = 60 / clamp(this.engine.settings.bpm, 60, 200) / 4;
    this.nextTime += stepDuration;
    this.step += 1;
    if (this.step >= STEPS) {
      this.step = 0;
      this.bar += 1;
    }
  }

  scheduler() {
    if (!this.playing) return;
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      this.scheduleStep(this.step, this.nextTime);
      this.advance();
    }
  }

  async start() {
    await this.ensure();
    this.stop(false);
    this.step = 0;
    this.chordIndex = -1;
    this.bar = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.playing = true;
    this.timer = setInterval(() => this.scheduler(), 25);
    this.scheduler();
    this.callbacks.onStateChange?.(true);
  }

  stop(notify = true) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const timer of this.strumTimers) clearTimeout(timer);
    this.strumTimers.clear();
    for (const key of this.activeStrums.keys()) this.engine.releaseVoice(key);
    this.activeStrums.clear();
    this.playing = false;
    if (notify) this.callbacks.onStateChange?.(false);
  }
}

function chordLabelSafe(chord) {
  return chord?.label || '';
}
