import { clamp, midiToFreq } from './notes.js';

const MODEL_DEFAULTS = {
  model: 'osc', waveform: 'sine', brightness: 0.5, damping: 0.996, distortion: 0,
  vibratoRate: 5, vibratoDepth: 0
};

const preset = (config) => ({ ...MODEL_DEFAULTS, ...config });

export const PRESETS = {
  piano: preset({
    label: 'Piano', waveform: 'triangle', voices: 2, detune: 3,
    attack: 0.004, decay: 0.38, sustain: 0.22, release: 0.55,
    cutoff: 6200, resonance: 0.7, reverb: 0.2, delayTime: 0.22, delayFeedback: 0.16, delayMix: 0.06
  }),
  electricPiano: preset({
    label: 'Piano elétrico', waveform: 'sine', voices: 2, detune: 8,
    attack: 0.006, decay: 0.7, sustain: 0.18, release: 0.9,
    cutoff: 3400, resonance: 1.2, reverb: 0.32, delayTime: 0.33, delayFeedback: 0.3, delayMix: 0.2
  }),
  organ: preset({
    label: 'Órgão', waveform: 'sine', voices: 3, detune: 0,
    attack: 0.02, decay: 0.05, sustain: 0.85, release: 0.18,
    cutoff: 4800, resonance: 0.6, reverb: 0.3, delayTime: 0.28, delayFeedback: 0.2, delayMix: 0.12
  }),
  harpsichord: preset({
    label: 'Cravo', waveform: 'square', voices: 2, detune: 4,
    attack: 0.001, decay: 0.28, sustain: 0.05, release: 0.25,
    cutoff: 5200, resonance: 1.1, reverb: 0.18, delayTime: 0.18, delayFeedback: 0.12, delayMix: 0.06
  }),
  strings: preset({
    label: 'Cordas', waveform: 'sawtooth', voices: 3, detune: 12,
    attack: 0.35, decay: 0.4, sustain: 0.7, release: 1.1,
    cutoff: 2600, resonance: 1.4, reverb: 0.45, delayTime: 0.3, delayFeedback: 0.24, delayMix: 0.14,
    vibratoRate: 5.2, vibratoDepth: 7
  }),
  violin: preset({
    label: 'Violino', waveform: 'sawtooth', voices: 2, detune: 6,
    attack: 0.12, decay: 0.2, sustain: 0.8, release: 0.5,
    cutoff: 3400, resonance: 2.4, reverb: 0.34, delayTime: 0.24, delayFeedback: 0.16, delayMix: 0.1,
    vibratoRate: 6, vibratoDepth: 12
  }),
  cello: preset({
    label: 'Violoncelo', waveform: 'sawtooth', voices: 2, detune: 5,
    attack: 0.18, decay: 0.25, sustain: 0.78, release: 0.7,
    cutoff: 2100, resonance: 2.2, reverb: 0.4, delayTime: 0.28, delayFeedback: 0.18, delayMix: 0.12,
    vibratoRate: 5, vibratoDepth: 9
  }),
  pad: preset({
    label: 'Pad', waveform: 'sawtooth', voices: 4, detune: 18,
    attack: 0.7, decay: 0.8, sustain: 0.75, release: 1.8,
    cutoff: 1800, resonance: 2.2, reverb: 0.6, delayTime: 0.42, delayFeedback: 0.35, delayMix: 0.26
  }),
  synthLead: preset({
    label: 'Synth lead', waveform: 'square', voices: 2, detune: 6,
    attack: 0.01, decay: 0.18, sustain: 0.6, release: 0.24,
    cutoff: 3800, resonance: 4.5, reverb: 0.2, delayTime: 0.25, delayFeedback: 0.32, delayMix: 0.22
  }),
  bass: preset({
    label: 'Baixo elétrico', waveform: 'sawtooth', voices: 2, detune: 2,
    attack: 0.008, decay: 0.3, sustain: 0.45, release: 0.2,
    cutoff: 850, resonance: 3, reverb: 0.08, delayTime: 0.18, delayFeedback: 0.12, delayMix: 0.04
  }),
  acousticBass: preset({
    label: 'Contrabaixo', waveform: 'triangle', voices: 2, detune: 4,
    attack: 0.02, decay: 0.5, sustain: 0.4, release: 0.4,
    cutoff: 700, resonance: 1.8, reverb: 0.24, delayTime: 0.22, delayFeedback: 0.1, delayMix: 0.06,
    vibratoRate: 4.8, vibratoDepth: 5
  }),
  bell: preset({
    label: 'Sino', waveform: 'sine', voices: 2, detune: 14,
    attack: 0.002, decay: 1.4, sustain: 0.04, release: 1.6,
    cutoff: 9000, resonance: 0.5, reverb: 0.55, delayTime: 0.36, delayFeedback: 0.28, delayMix: 0.24
  }),
  guitar: preset({
    label: 'Guitarra elétrica', model: 'pluck', brightness: 0.72, damping: 0.995, distortion: 0.38,
    voices: 1, detune: 0, attack: 0.002, decay: 1.8, sustain: 0.5, release: 0.3,
    cutoff: 3600, resonance: 1.2, reverb: 0.22, delayTime: 0.2, delayFeedback: 0.18, delayMix: 0.14
  }),
  acousticGuitar: preset({
    label: 'Violão (nylon)', model: 'pluck', brightness: 0.42, damping: 0.997, distortion: 0,
    voices: 1, detune: 0, attack: 0.002, decay: 2.2, sustain: 0.55, release: 0.4,
    cutoff: 4200, resonance: 0.9, reverb: 0.36, delayTime: 0.24, delayFeedback: 0.14, delayMix: 0.1
  }),
  harp: preset({
    label: 'Harpa', model: 'pluck', brightness: 0.62, damping: 0.998, distortion: 0,
    voices: 1, detune: 0, attack: 0.002, decay: 2.6, sustain: 0.6, release: 0.6,
    cutoff: 7000, resonance: 0.7, reverb: 0.5, delayTime: 0.3, delayFeedback: 0.16, delayMix: 0.14
  }),
  banjo: preset({
    label: 'Banjo', model: 'pluck', brightness: 0.9, damping: 0.988, distortion: 0,
    voices: 1, detune: 0, attack: 0.001, decay: 0.9, sustain: 0.35, release: 0.18,
    cutoff: 6000, resonance: 1.6, reverb: 0.16, delayTime: 0.16, delayFeedback: 0.1, delayMix: 0.06
  }),
  flute: preset({
    label: 'Flauta', waveform: 'sine', voices: 2, detune: 3,
    attack: 0.12, decay: 0.2, sustain: 0.85, release: 0.35,
    cutoff: 4200, resonance: 0.8, reverb: 0.4, delayTime: 0.28, delayFeedback: 0.16, delayMix: 0.12,
    vibratoRate: 5.5, vibratoDepth: 8
  }),
  sax: preset({
    label: 'Saxofone', waveform: 'sawtooth', voices: 2, detune: 4,
    attack: 0.08, decay: 0.15, sustain: 0.82, release: 0.3,
    cutoff: 2800, resonance: 3.2, reverb: 0.32, delayTime: 0.26, delayFeedback: 0.18, delayMix: 0.12,
    vibratoRate: 5.8, vibratoDepth: 10
  }),
  trumpet: preset({
    label: 'Trompete', waveform: 'square', voices: 2, detune: 4,
    attack: 0.04, decay: 0.12, sustain: 0.8, release: 0.25,
    cutoff: 3000, resonance: 4, reverb: 0.26, delayTime: 0.22, delayFeedback: 0.14, delayMix: 0.1,
    vibratoRate: 6.2, vibratoDepth: 6
  })
};

const GLOBAL_KEYS = ['volume', 'tuning', 'transpose', 'octaveShift', 'bpm', 'arpRate', 'arpPattern', 'arpLatch'];
const GLOBAL_DEFAULTS = {
  volume: 0.78, tuning: 440, transpose: 0, octaveShift: 0,
  bpm: 120, arpRate: 16, arpPattern: 'up', arpLatch: false
};
const PARTS = ['A', 'B'];
const INSTRUMENT_KEYS = Object.keys(PRESETS.piano).filter((key) => key !== 'label').concat('presetName');

function instrumentSettings(name) {
  const source = PRESETS[name] || PRESETS.piano;
  const result = { presetName: PRESETS[name] ? name : 'piano' };
  for (const key of INSTRUMENT_KEYS) {
    if (key !== 'presetName') result[key] = source[key];
  }
  return result;
}

export function targetPartsFor(mode, note, splitNote, activePart) {
  if (mode === 'split') return [note <= splitNote ? 'A' : 'B'];
  if (mode === 'layer') return [...PARTS];
  return [activePart === 'B' ? 'B' : 'A'];
}

export class AudioEngine {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.ctx = null;
    this.parts = {
      A: instrumentSettings('piano'),
      B: instrumentSettings('guitar')
    };
    this.settings = { ...GLOBAL_DEFAULTS, ...this.parts.A };
    this.mode = 'single';
    this.activePart = 'A';
    this.splitNote = 60;
    this.muted = { A: false, B: false };
    this.voices = new Map();
    this.sustainedVoices = new Map();
    this.noteRefs = new Map();
    this.pendingOn = new Set();
    this.pendingOff = new Set();
    this.sustain = false;
    this.pluckCache = new Map();
    this.arp = { active: false, notes: [], index: 0, timer: null };
    this.metronome = { active: false, timer: null, beat: 0, tick: null };
  }

  async ensure() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) throw new Error('Web Audio API não disponível neste navegador.');
      this.ctx = new Ctor();
      this.buildGraph();
      this.applySettings();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  buildGraph() {
    const ctx = this.ctx;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -12;
    this.comp.knee.value = 18;
    this.comp.ratio.value = 5;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.18;
    this.outputGain = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.78;
    this.impulse = this.createImpulse(2.6, 2.4);
    this.partNodes = { A: this.createPartChain(), B: this.createPartChain() };
    this.comp.connect(this.outputGain);
    this.outputGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);
  }

  createPartChain() {
    const ctx = this.ctx;
    const chain = {
      input: ctx.createGain(),
      filter: ctx.createBiquadFilter(),
      dry: ctx.createGain(),
      convolver: ctx.createConvolver(),
      reverbGain: ctx.createGain(),
      delay: ctx.createDelay(2),
      feedback: ctx.createGain(),
      delayGain: ctx.createGain(),
      master: ctx.createGain()
    };
    chain.filter.type = 'lowpass';
    chain.convolver.buffer = this.impulse;
    chain.input.connect(chain.filter);
    chain.filter.connect(chain.dry);
    chain.dry.connect(chain.master);
    chain.filter.connect(chain.convolver);
    chain.convolver.connect(chain.reverbGain);
    chain.reverbGain.connect(chain.master);
    chain.filter.connect(chain.delay);
    chain.delay.connect(chain.feedback);
    chain.feedback.connect(chain.delay);
    chain.delay.connect(chain.delayGain);
    chain.delayGain.connect(chain.master);
    chain.master.connect(this.comp);
    return chain;
  }

  createImpulse(duration, decay) {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const envelope = Math.pow(1 - i / length, decay);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }
    }
    return buffer;
  }

  settingsFor(part) {
    if (part === this.activePart) return this.settings;
    const globals = {};
    for (const key of GLOBAL_KEYS) globals[key] = this.settings[key];
    return { ...this.parts[part], ...globals };
  }

  saveActivePart() {
    for (const key of INSTRUMENT_KEYS) {
      if (key in this.settings) this.parts[this.activePart][key] = this.settings[key];
    }
  }

  applyPartSettings(part, settings) {
    if (!this.ctx) return;
    const chain = this.partNodes[part];
    const t = this.ctx.currentTime;
    chain.filter.frequency.setTargetAtTime(clamp(settings.cutoff, 80, 16000), t, 0.02);
    chain.filter.Q.setTargetAtTime(clamp(settings.resonance, 0.1, 20), t, 0.02);
    chain.reverbGain.gain.setTargetAtTime(clamp(settings.reverb, 0, 1), t, 0.02);
    chain.delay.delayTime.setTargetAtTime(clamp(settings.delayTime, 0.01, 1.5), t, 0.02);
    chain.feedback.gain.setTargetAtTime(clamp(settings.delayFeedback, 0, 0.85), t, 0.02);
    chain.delayGain.gain.setTargetAtTime(clamp(settings.delayMix, 0, 1), t, 0.02);
    chain.master.gain.setTargetAtTime(this.muted[part] ? 0 : 0.9, t, 0.02);
  }

  applySettings() {
    if (!this.ctx) return;
    this.outputGain.gain.setTargetAtTime(clamp(this.settings.volume, 0, 1), this.ctx.currentTime, 0.02);
    for (const part of PARTS) this.applyPartSettings(part, this.settingsFor(part));
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    if (INSTRUMENT_KEYS.includes(key)) this.parts[this.activePart][key] = value;
    if (['cutoff', 'resonance', 'volume', 'reverb', 'delayTime', 'delayFeedback', 'delayMix'].includes(key)) {
      this.applySettings();
    }
    if (this.arp.active && ['bpm', 'arpRate'].includes(key)) this.restartArpTimer();
    if (this.metronome.active && key === 'bpm') this.restartMetronomeTimer();
    this.callbacks.onSettingsChange?.(this.settings);
  }

  setPreset(name) {
    const presetSettings = instrumentSettings(name);
    for (const key of INSTRUMENT_KEYS) {
      this.settings[key] = presetSettings[key];
      this.parts[this.activePart][key] = presetSettings[key];
    }
    this.applySettings();
    this.callbacks.onSettingsChange?.(this.settings);
    return true;
  }

  setPartPreset(part, name) {
    if (!PARTS.includes(part)) return false;
    const presetSettings = instrumentSettings(name);
    for (const key of INSTRUMENT_KEYS) this.parts[part][key] = presetSettings[key];
    if (part === this.activePart) {
      for (const key of INSTRUMENT_KEYS) this.settings[key] = presetSettings[key];
      this.applySettings();
      this.callbacks.onSettingsChange?.(this.settings);
    }
    this.callbacks.onPartChange?.(this.activePart, this.settings);
    return true;
  }

  setActivePart(part) {
    if (!PARTS.includes(part) || part === this.activePart) return;
    this.saveActivePart();
    this.activePart = part;
    this.settings = { ...this.settings, ...this.parts[part] };
    this.applySettings();
    this.callbacks.onPartChange?.(part, this.settings);
    this.callbacks.onSettingsChange?.(this.settings);
  }

  setMode(mode) {
    if (!['single', 'split', 'layer'].includes(mode)) return;
    this.mode = mode;
    this.callbacks.onRoutingChange?.(this.routingState());
  }

  setSplitNote(note) {
    this.splitNote = clamp(Math.round(note), 24, 96);
    this.callbacks.onRoutingChange?.(this.routingState());
  }

  setMuted(part, muted) {
    if (!PARTS.includes(part)) return;
    this.muted[part] = Boolean(muted);
    if (this.muted[part]) this.allNotesOff(part);
    this.applySettings();
    this.callbacks.onRoutingChange?.(this.routingState());
  }

  routingState() {
    return {
      mode: this.mode, activePart: this.activePart,
      splitNote: this.splitNote, muted: { ...this.muted },
      names: { A: this.parts.A.presetName, B: this.parts.B.presetName }
    };
  }

  restoreState(state = {}) {
    if (!state.parts && state.settings) {
      for (const key of INSTRUMENT_KEYS) {
        if (key in state.settings) this.parts.A[key] = state.settings[key];
      }
    }
    if (state.parts) {
      for (const part of PARTS) {
        if (!state.parts[part]) continue;
        for (const key of INSTRUMENT_KEYS) {
          if (key in state.parts[part]) this.parts[part][key] = state.parts[part][key];
        }
      }
    }
    for (const key of GLOBAL_KEYS) {
      if (state.settings && key in state.settings) this.settings[key] = state.settings[key];
    }
    this.settings = { ...this.settings, ...this.parts[this.activePart] };
    if (['single', 'split', 'layer'].includes(state.mode)) this.mode = state.mode;
    if (PARTS.includes(state.activePart)) this.activePart = state.activePart;
    if (Number.isFinite(state.splitNote)) this.splitNote = clamp(Math.round(state.splitNote), 24, 96);
    if (state.muted) this.muted = { A: Boolean(state.muted.A), B: Boolean(state.muted.B) };
    this.settings = { ...this.settings, ...this.parts[this.activePart] };
    this.applySettings();
  }

  getPlayedMidi(note, part = this.activePart) {
    const settings = this.settingsFor(part);
    return clamp(note + settings.transpose + settings.octaveShift * 12, 0, 127);
  }

  voiceKey(note, source, channel, part) {
    return `${source}:${channel}:${note}:${part}`;
  }

  noteRefKey(note, source, channel) {
    return `${source}:${channel}:${note}`;
  }

  targetParts(note) {
    const played = this.getPlayedMidi(note);
    return targetPartsFor(this.mode, played, this.splitNote, this.activePart).filter((part) => !this.muted[part]);
  }

  async noteOn(note, options = {}) {
    const { velocity = 0.85, source = 'key', channel = 0, skipArp = false } = options;
    const parts = this.targetParts(note);
    if (!parts.length) return false;
    const keys = parts.map((part) => this.voiceKey(note, source, channel, part));
    if (keys.some((key) => this.voices.has(key) || this.pendingOn.has(key))) return false;

    if (this.arp.active && !skipArp && source !== 'arp' && source !== 'seq' && source !== 'chord') {
      if (!this.arp.notes.includes(note)) this.arp.notes.push(note);
      this.arp.notes.sort((a, b) => a - b);
      this.callbacks.onArpNotesChange?.(this.arp.notes);
      return true;
    }

    for (const key of keys) this.pendingOn.add(key);
    const refKey = this.noteRefKey(note, source, channel);
    this.noteRefs.set(refKey, (this.noteRefs.get(refKey) || 0) + parts.length);
    let firstMidi = null;
    for (const part of parts) {
      const midi = await this.triggerVoice(note, part, { velocity, source, channel });
      if (firstMidi === null) firstMidi = midi;
    }
    for (const key of keys) this.pendingOn.delete(key);
    this.callbacks.onNoteOn?.(note, firstMidi ?? this.getPlayedMidi(note), source, velocity);
    for (const key of keys) {
      if (this.pendingOff.has(key)) {
        this.pendingOff.delete(key);
        this.releaseVoice(key);
      }
    }
    return true;
  }

  async triggerVoice(note, part, options) {
    await this.ensure();
    const s = this.settingsFor(part);
    const midi = this.getPlayedMidi(note, part);
    const freq = midiToFreq(midi, s.tuning);
    const now = this.ctx.currentTime;
    const { source, channel, velocity } = options;
    const key = this.voiceKey(note, source, channel, part);
    const peak = clamp(velocity, 0.05, 1) * 0.2 / Math.max(1, s.model === 'pluck' ? 1 : s.voices);
    const gain = this.ctx.createGain();
    const attack = Math.max(0.002, s.attack);
    const hold = s.model === 'pluck' ? 0.55 : s.sustain;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, peak * hold), now + attack + Math.max(0.01, s.decay));
    gain.connect(this.partNodes[part].input);

    const sources = [];
    if (s.model === 'pluck') {
      const buffer = this.getPluckBuffer(s, freq);
      const string = this.ctx.createBufferSource();
      string.buffer = buffer;
      let tail = string;
      if (s.distortion > 0) {
        const shaper = this.ctx.createWaveShaper();
        shaper.curve = this.distortionCurve(s.distortion);
        shaper.oversample = '2x';
        tail.connect(shaper);
        tail = shaper;
      }
      tail.connect(gain);
      string.start(now);
      sources.push(string);
    } else {
      for (let i = 0; i < s.voices; i += 1) {
        const osc = this.ctx.createOscillator();
        osc.type = s.waveform;
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((i - (s.voices - 1) / 2) * s.detune, now);
        if (s.vibratoDepth > 0) {
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          lfo.frequency.value = s.vibratoRate;
          lfoGain.gain.value = s.vibratoDepth;
          lfo.connect(lfoGain);
          lfoGain.connect(osc.detune);
          lfo.start(now);
          sources.push(lfo);
        }
        const oscGain = this.ctx.createGain();
        oscGain.gain.value = i === 0 ? 1 : 0.72;
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start(now);
        sources.push(osc);
      }
    }

    const release = Math.max(0.02, s.release);
    const voice = {
      key, note, midi, source, channel, part, gain, sources, release,
      startedAt: now, released: false
    };
    this.voices.set(key, voice);
    return midi;
  }

  getPluckBuffer(settings, freq) {
    const cacheKey = `${settings.presetName}:${Math.round(freq * 4)}:${settings.brightness}:${settings.damping}:${settings.release}`;
    if (this.pluckCache.has(cacheKey)) return this.pluckCache.get(cacheKey);
    const sr = this.ctx.sampleRate;
    const delay = Math.max(2, sr / freq);
    const period = Math.max(2, Math.floor(delay));
    const fraction = delay - period;
    const duration = 2.5 + settings.release;
    const length = Math.floor(sr * duration);
    const buffer = this.ctx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);
    const ring = new Float32Array(period);
    const brightness = clamp(settings.brightness, 0.05, 1);
    let previous = 0;
    for (let i = 0; i < period; i += 1) {
      const noise = Math.random() * 2 - 1;
      previous = previous * (1 - brightness) + noise * brightness;
      ring[i] = previous;
    }
    const damping = clamp(settings.damping, 0.95, 0.9995);
    const decayTime = 0.9 + settings.release * 1.6;
    let index = 0;
    let peak = 0;
    for (let i = 0; i < length; i += 1) {
      const current = ring[index];
      const older = ring[(index - 1 + period) % period];
      const next = ring[(index + 1) % period];
      const sample = current * (1 - fraction) + older * fraction;
      ring[index] = (sample + next) * 0.5 * damping;
      const value = sample * Math.exp(-i / (sr * decayTime));
      data[i] = value;
      peak = Math.max(peak, Math.abs(value));
      index = (index + 1) % period;
    }
    if (peak > 0) {
      const scale = 0.85 / peak;
      for (let i = 0; i < length; i += 1) data[i] *= scale;
    }
    if (this.pluckCache.size >= 48) {
      const oldest = this.pluckCache.keys().next().value;
      this.pluckCache.delete(oldest);
    }
    this.pluckCache.set(cacheKey, buffer);
    return buffer;
  }

  distortionCurve(amount) {
    const drive = 1 + clamp(amount, 0, 1) * 16;
    const normalization = Math.tanh(drive);
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i += 1) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * drive) / normalization;
    }
    return curve;
  }

  noteOff(note, options = {}) {
    const { source = 'key', channel = 0 } = options;
    if (this.arp.active && source !== 'arp' && source !== 'seq' && source !== 'chord') {
      if (!this.arp.notes.includes(note)) return;
      if (!this.settings.arpLatch) {
        this.arp.notes = this.arp.notes.filter((item) => item !== note);
        this.callbacks.onArpNotesChange?.(this.arp.notes);
      }
      return;
    }
    let found = false;
    for (const part of PARTS) {
      const key = this.voiceKey(note, source, channel, part);
      const voice = this.voices.get(key);
      if (voice) {
        found = true;
        if (this.sustain) {
          const previous = this.sustainedVoices.get(key);
          if (previous) this.releaseVoice(key, previous);
          this.sustainedVoices.set(key, voice);
          this.voices.delete(key);
        } else {
          this.releaseVoice(key);
        }
      } else if (this.pendingOn.has(key)) {
        found = true;
        this.pendingOff.add(key);
      }
    }
    if (!found) return;
  }

  releaseVoice(key, heldVoice = null) {
    const voice = heldVoice || this.voices.get(key);
    if (!voice || voice.released) return;
    voice.released = true;
    const now = this.ctx.currentTime;
    const param = voice.gain.gain;
    if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(now);
    } else {
      const current = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
    }
    param.linearRampToValueAtTime(0.0001, now + voice.release);
    for (const source of voice.sources) {
      try {
        source.stop(now + voice.release + 0.05);
      } catch {
        source.stop();
      }
    }
    voice.sources[0].onended = () => voice.gain.disconnect();
    if (this.voices.get(key) === voice) this.voices.delete(key);
    if (this.sustainedVoices.get(key) === voice) this.sustainedVoices.delete(key);
    const refKey = this.noteRefKey(voice.note, voice.source, voice.channel);
    const refs = this.noteRefs.get(refKey);
    if (refs === undefined) return;
    const remaining = refs - 1;
    if (remaining <= 0) {
      this.noteRefs.delete(refKey);
      this.callbacks.onNoteOff?.(voice.note, voice.midi, voice.source);
    } else {
      this.noteRefs.set(refKey, remaining);
    }
  }

  setSustain(active) {
    this.sustain = active;
    if (!active) {
      for (const [key, voice] of [...this.sustainedVoices]) this.releaseVoice(key, voice);
    }
    this.callbacks.onSustainChange?.(active);
  }

  allNotesOff(part = null) {
    for (const [key, voice] of [...this.voices]) {
      if (!part || voice.part === part) this.releaseVoice(key);
    }
    for (const [key, voice] of [...this.sustainedVoices]) {
      if (!part || voice.part === part) this.releaseVoice(key, voice);
    }
    if (!part) {
      this.pendingOn.clear();
      this.pendingOff.clear();
      this.noteRefs.clear();
    }
  }

  getAnalyser() {
    return this.analyser || null;
  }

  async playClick(accent = false) {
    await this.ensure();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = accent ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(accent ? 0.16 : 0.1, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.comp);
    osc.start(now);
    osc.stop(now + 0.09);
    osc.onended = () => gain.disconnect();
  }

  async startMetronome(onBeat) {
    await this.ensure();
    this.stopMetronome();
    this.metronome.active = true;
    this.metronome.beat = 0;
    const tick = async () => {
      if (!this.metronome.active) return;
      const accent = this.metronome.beat % 4 === 0;
      this.metronome.beat += 1;
      await this.playClick(accent);
      onBeat?.(accent, this.metronome.beat);
    };
    this.metronome.tick = tick;
    await tick();
    this.metronome.timer = setInterval(tick, (60 / this.settings.bpm) * 1000);
  }

  restartMetronomeTimer() {
    if (!this.metronome.active || !this.metronome.tick) return;
    if (this.metronome.timer) clearInterval(this.metronome.timer);
    this.metronome.timer = setInterval(this.metronome.tick, (60 / this.settings.bpm) * 1000);
  }

  stopMetronome() {
    if (this.metronome.timer) clearInterval(this.metronome.timer);
    this.metronome.timer = null;
    this.metronome.tick = null;
    this.metronome.active = false;
    this.metronome.beat = 0;
  }

  restartArpTimer() {
    if (!this.arp.active) return;
    if (this.arp.timer) clearInterval(this.arp.timer);
    this.arp.timer = setInterval(() => this.arpStep(), this.arpStepMs());
  }

  arpStepMs() {
    return (60 / this.settings.bpm) * (4 / this.settings.arpRate) * 1000;
  }

  async startArp() {
    await this.ensure();
    this.arp.active = true;
    this.arp.index = 0;
    this.restartArpTimer();
    this.callbacks.onArpChange?.(true);
  }

  stopArp(clearNotes = true) {
    if (this.arp.timer) clearInterval(this.arp.timer);
    this.arp.timer = null;
    this.arp.active = false;
    if (clearNotes) {
      this.arp.notes = [];
      this.callbacks.onArpNotesChange?.(this.arp.notes);
    }
    this.callbacks.onArpChange?.(false);
  }

  async arpStep() {
    const notes = this.arp.notes;
    if (!notes.length) return;
    const pattern = this.settings.arpPattern;
    let order = [...notes];
    if (pattern === 'down') order.reverse();
    if (pattern === 'updown') order = [...notes, ...[...notes].slice(1, -1).reverse()];
    if (pattern === 'random') order.sort(() => Math.random() - 0.5);
    const note = order[this.arp.index % order.length];
    this.arp.index += 1;
    const duration = Math.max(0.04, this.arpStepMs() / 1000 * 0.85);
    await this.noteOn(note, { velocity: 0.8, source: 'arp', skipArp: true });
    setTimeout(() => this.noteOff(note, { source: 'arp' }), duration * 1000);
  }

  clearArpNotes() {
    this.arp.notes = [];
    this.callbacks.onArpNotesChange?.(this.arp.notes);
  }

  dispose() {
    this.stopMetronome();
    this.stopArp();
    this.allNotesOff();
    this.ctx?.close();
  }
}
