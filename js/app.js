import { AudioEngine, PRESETS } from './audio.js';
import { Keyboard } from './keyboard.js';
import { Sequencer } from './sequencer.js';
import { Visualizer } from './visualizer.js';
import { PianoRoll } from './pianoroll.js';
import { MidiInput } from './midi.js';
import { RhythmSection, RHYTHM_STYLES, PROGRESSIONS, DRUM_PADS, chordForProgression } from './rhythm.js';
import { AudioRecorder } from './recorder.js';
import { midiBlob, parseMidi } from './export.js';
import { CHORDS, NOTE_NAMES, SCALES, buildChord, chordLabel, clamp, midiToFreq, midiToName } from './notes.js';

const $ = (id) => document.getElementById(id);
const STATE_KEY = 'teclado-musical:state:v1';
const USER_PRESETS_KEY = 'teclado-musical:user-presets:v1';

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

const savedState = readJSON(STATE_KEY, {});
let keyboard;
let sequencer;
let sustainLatched = false;
let sustainHeld = false;
let chordMode = false;
let activeChords = new Map();
let lastPlayedNote = 60;
let toastTimer;
let persistTimer;
let levelStarted = false;
let levelData = null;

const engine = new AudioEngine({
  onNoteOn(note, playedMidi, source, velocity) {
    if (!['keyboard', 'pointer'].includes(source)) keyboard?.flash(note, true);
    if (sequencer?.recording && source !== 'seq') sequencer.recordNoteOn(note, velocity);
    if (source !== 'chord') updateDisplay(note, playedMidi);
    markAudioReady();
  },
  onNoteOff(note, playedMidi, source) {
    if (!['keyboard', 'pointer'].includes(source)) keyboard?.flash(note, false);
    if (sequencer?.recording && source !== 'seq') sequencer.recordNoteOff(note);
  },
  onSettingsChange(settings) {
    syncSettingsUI(settings);
    updateShiftVisuals();
    schedulePersist();
  },
  onArpChange() {
    updateToggle('arpBtn', engine.arp.active);
  },
  onArpNotesChange(notes) {
    $('arpInfo').textContent = `${notes.length} nota${notes.length === 1 ? '' : 's'} no arpejador`;
  },
  onPartChange() {
    updateRoutingUI();
  },
  onRoutingChange() {
    updateRoutingUI();
    schedulePersist();
  }
});

engine.restoreState(savedState);

const rhythm = new RhythmSection(engine, {
  onStateChange() {
    updateRhythmUI();
  },
  onSettingsChange() {
    updateRhythmUI();
    schedulePersist();
  },
  onStep(step) {
    highlightPatternStep(step);
  },
  onPad(id) {
    flashDrumPad(id);
  },
  getLiveChord() {
    const type = $('chordSelect').value;
    const root = lastPlayedNote;
    return {
      notes: buildChord(root, type),
      label: chordLabel(engine.getPlayedMidi(root), type)
    };
  }
});

keyboard = new Keyboard($('keyboard'), {
  startOctave: clamp(savedState.startOctave ?? 3, 1, 7),
  octaves: clamp(savedState.octaves ?? 4, 1, 5),
  onNoteOn: (note, options) => inputNoteOn(note, options),
  onNoteOff: (note, options) => inputNoteOff(note, options),
  onSustain: (held) => {
    sustainHeld = held;
    applySustain();
  },
  onAllNotesOff: () => {
    releaseAllChords();
    engine.allNotesOff();
  },
  onRangeChange: () => {
    updateKeyboardLabels();
    schedulePersist();
  }
});

sequencer = new Sequencer(engine, {
  onChange: () => updateTransport(),
  onNote: (note, active) => keyboard.flash(note, active)
});

const visualizer = new Visualizer($('visualizer'), () => engine.getAnalyser());
const pianoRoll = new PianoRoll($('pianoRoll'), {
  getEvents: () => sequencer.events,
  getProgress: () => sequencer.progress
});

const recorder = new AudioRecorder(engine);

const midi = new MidiInput({
  onNoteOn: (note, options) => inputNoteOn(note, options),
  onNoteOff: (note, options) => inputNoteOff(note, options),
  onSustain: (active) => {
    sustainHeld = active;
    applySustain();
  },
  onPitchBend: (value) => engine.updateSetting('tuning', Math.round(440 * Math.pow(2, value / 12))),
  onDevicesChange: (devices, selectedId) => {
    const select = $('midiDevices');
    select.innerHTML = '';
    if (!devices.length) {
      const option = document.createElement('option');
      option.textContent = 'Nenhum dispositivo';
      select.appendChild(option);
    }
    for (const device of devices) {
      const option = document.createElement('option');
      option.value = device.id;
      option.textContent = device.name;
      option.selected = device.id === selectedId;
      select.appendChild(option);
    }
    $('midiStatus').textContent = devices.length
      ? `${devices.length} dispositivo${devices.length > 1 ? 's' : ''} encontrado${devices.length > 1 ? 's' : ''}.`
      : 'Nenhum dispositivo conectado.';
  },
  onUnsupported: () => {
    $('midiStatus').textContent = 'Web MIDI não disponível neste navegador.';
    $('midiEnable').disabled = true;
  },
  onError: () => {
    $('midiStatus').textContent = 'Acesso MIDI negado.';
    toast('Permissão MIDI negada');
  }
});

function toast(message) {
  const element = $('toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 2400);
}

function markAudioReady() {
  const badge = $('audioStatus');
  if (badge.classList.contains('ready')) return;
  badge.textContent = 'Áudio ativo';
  badge.classList.add('ready');
  startLevelMeter();
}

const THEMES = ['default', 'violet', 'green'];

function applyTheme(name, persist = true) {
  const theme = THEMES.includes(name) ? name : 'default';
  document.body.dataset.theme = theme;
  if ($('themeSelect')) $('themeSelect').value = theme;
  if (persist) schedulePersist();
}

function startLevelMeter() {
  if (levelStarted) return;
  const analyser = engine.getAnalyser();
  const fill = $('levelFill');
  if (!analyser || !fill) return;
  levelStarted = true;
  levelData = new Uint8Array(analyser.fftSize);
  const tick = () => {
    analyser.getByteTimeDomainData(levelData);
    let sum = 0;
    for (const value of levelData) {
      const centered = (value - 128) / 128;
      sum += centered * centered;
    }
    const level = Math.sqrt(sum / levelData.length);
    fill.style.width = `${Math.min(100, level * 280).toFixed(1)}%`;
    requestAnimationFrame(tick);
  };
  tick();
}

function updateDisplay(note, playedMidi, label) {
  if (Number.isFinite(note)) lastPlayedNote = note;
  const played = playedMidi ?? engine.getPlayedMidi(note);
  $('noteDisplay').textContent = label || midiToName(played) || '—';
  $('freqDisplay').textContent = `${midiToFreq(played, engine.settings.tuning).toFixed(1)} Hz · MIDI ${played}`;
}

function updateToggle(id, active) {
  const element = $(id);
  element.classList.toggle('active', active);
  element.setAttribute('aria-pressed', String(active));
}

function applySustain() {
  const active = sustainHeld || sustainLatched;
  engine.setSustain(active);
  updateToggle('sustainBtn', active);
}

function releaseAllChords() {
  for (const release of activeChords.values()) release();
  activeChords.clear();
}

function inputNoteOn(note, options = {}) {
  markAudioReady();
  const velocity = options.velocity ?? 0.85;
  const key = `${options.source || 'key'}:${options.channel || 0}:${note}`;

  if (chordMode && options.source !== 'seq' && options.source !== 'arp') {
    const playedRoot = engine.getPlayedMidi(note);
    const chordType = $('chordSelect').value;
    const notes = buildChord(note, chordType);
    const release = () => {
      for (const item of notes) {
        engine.noteOff(item, { source: 'chord', channel: options.channel || 0 });
      }
      activeChords.delete(key);
      keyboard.setChordNotes([]);
      if (options.source === 'midi') keyboard.flash(note, false);
    };
    activeChords.set(key, release);
    for (const item of notes) {
      engine.noteOn(item, { velocity, source: 'chord', channel: options.channel || 0, skipArp: true });
    }
    const shift = playedRoot - note;
    keyboard.setChordNotes(notes.map((item) => item + shift));
    if (options.source === 'midi') keyboard.flash(note, true);
    updateDisplay(note, playedRoot, chordLabel(playedRoot, chordType));
    return;
  }

  engine.noteOn(note, { ...options, velocity });
  if (options.source === 'midi') keyboard.flash(note, true);
  updateDisplay(note, engine.getPlayedMidi(note));
}

function inputNoteOff(note, options = {}) {
  const key = `${options.source || 'key'}:${options.channel || 0}:${note}`;
  if (chordMode && activeChords.has(key)) {
    activeChords.get(key)();
    return;
  }
  engine.noteOff(note, options);
  if (options.source === 'midi') keyboard.flash(note, false);
}

function formatSetting(key, value) {
  if (['volume', 'sustain', 'reverb', 'delayMix', 'delayFeedback', 'brightness', 'distortion'].includes(key)) return `${Math.round(value * 100)}%`;
  if (key === 'damping') return Number(value).toFixed(4);
  if (key === 'vibratoRate') return `${Number(value).toFixed(1)} Hz`;
  if (key === 'vibratoDepth') return `${value} cents`;
  if (['attack', 'decay', 'release', 'delayTime'].includes(key)) return `${Math.round(value * 1000)} ms`;
  if (key === 'cutoff') return value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${value} Hz`;
  if (key === 'detune') return `${value} cents`;
  if (key === 'tuning') return `${value} Hz`;
  if (key === 'bpm') return `${value} BPM`;
  if (key === 'transpose' || key === 'octaveShift') return `${value > 0 ? '+' : ''}${value}`;
  if (key === 'voices') return String(value);
  return String(value);
}

function syncSettingsUI(settings = engine.settings) {
  for (const element of document.querySelectorAll('[data-setting]')) {
    const key = element.dataset.setting;
    if (key in settings && element.value !== String(settings[key])) element.value = String(settings[key]);
  }
  for (const output of document.querySelectorAll('[data-output]')) {
    const key = output.dataset.output;
    if (key in settings) output.textContent = formatSetting(key, settings[key]);
  }
  for (const button of document.querySelectorAll('.preset-btn')) {
    button.classList.toggle('active', button.dataset.preset === settings.presetName);
  }
  $('arpLatch').checked = Boolean(settings.arpLatch);
  updatePartNames();
}

function updatePartNames() {
  const state = engine.routingState();
  $('partAName').textContent = PRESETS[state.names.A]?.label || state.names.A;
  $('partBName').textContent = PRESETS[state.names.B]?.label || state.names.B;
}

const ROUTING_HINTS = {
  single: 'Escolha um instrumento para a parte ativa.',
  split: 'A toca as notas baixas e B as agudas; ajuste a divisão abaixo.',
  layer: 'As duas partes tocam juntas, com efeitos independentes.'
};

function refreshKeyboardRouting() {
  const state = engine.routingState();
  const shift = engine.settings.transpose + engine.settings.octaveShift * 12;
  keyboard.setRouting({ ...state, splitNote: state.splitNote - shift });
}

function updateRoutingUI() {
  const state = engine.routingState();
  for (const button of document.querySelectorAll('.mode-btn')) {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const button of document.querySelectorAll('.part-tab')) {
    const active = button.dataset.part === state.activePart;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  $('muteA').checked = state.muted.A;
  $('muteB').checked = state.muted.B;
  $('splitNote').value = String(state.splitNote);
  $('splitNoteLabel').textContent = midiToName(state.splitNote);
  $('splitControl').hidden = state.mode !== 'split';
  $('routingHint').textContent = ROUTING_HINTS[state.mode];
  updatePartNames();
  refreshKeyboardRouting();
}

function refreshScale() {
  const rootPc = Number($('scaleRoot').value) || 0;
  const rootMidi = 60 + rootPc + engine.settings.transpose + engine.settings.octaveShift * 12;
  keyboard.setScale($('scaleSelect').value, rootMidi);
}

function updateShiftVisuals() {
  keyboard.setOctaveShift(engine.settings.octaveShift);
  keyboard.setExtraShift(engine.settings.transpose);
  refreshKeyboardRouting();
  refreshScale();
  $('transposeLabel').textContent = engine.settings.transpose > 0
    ? `+${engine.settings.transpose}`
    : String(engine.settings.transpose);
}

function updateKeyboardLabels() {
  keyboard.refreshLabels();
  $('octaveLabel').textContent = String(keyboard.startOctave);
  $('rangeLabel').textContent = String(keyboard.octaves);
  refreshScale();
}

function updateTransport() {
  updateToggle('recBtn', sequencer.recording);
  updateToggle('playBtn', sequencer.playing);
  $('loopBtn').classList.toggle('active', sequencer.loop);
  $('loopBtn').textContent = `Loop: ${sequencer.loop ? 'on' : 'off'}`;
  const states = [sequencer.recording && 'gravando', sequencer.playing && 'tocando'].filter(Boolean);
  $('seqInfo').textContent = `${sequencer.events.length} evento${sequencer.events.length === 1 ? '' : 's'} · ${sequencer.duration.toFixed(1)} s${states.length ? ` · ${states.join(', ')}` : ''}`;
}

const PATTERN_ROWS = [
  ['Bumbo', 'kick', '#38bdf8'],
  ['Caixa', 'snare', '#f472b6'],
  ['Hi-hat', 'hat', '#fbbf24'],
  ['Aberto', 'openhat', '#34d399'],
  ['Palmas', 'clap', '#fb7185'],
  ['Guitarra', 'strum', '#a78bfa']
];

function rhythmPercent(key, value) {
  const output = document.querySelector(`[data-rhythm-output="${key}"]`);
  if (output) output.textContent = `${Math.round(value * 100)}%`;
}

function renderPattern() {
  const grid = $('patternGrid');
  if (!grid) return;
  const style = RHYTHM_STYLES[rhythm.settings.style] || RHYTHM_STYLES.rock;
  grid.innerHTML = '';
  for (const [label, row, color] of PATTERN_ROWS) {
    const line = document.createElement('div');
    line.className = 'pattern-row';
    const name = document.createElement('span');
    name.className = 'pattern-label';
    name.textContent = label;
    const steps = document.createElement('div');
    steps.className = 'pattern-steps';
    for (let index = 0; index < 16; index += 1) {
      const cell = document.createElement('i');
      cell.className = `pattern-step${style[row]?.[index] > 0 ? ' on' : ''}`;
      cell.dataset.step = String(index);
      cell.style.setProperty('--step-color', color);
      steps.appendChild(cell);
    }
    line.append(name, steps);
    grid.appendChild(line);
  }
}

function highlightPatternStep(step) {
  const grid = $('patternGrid');
  if (!grid) return;
  for (const cell of grid.querySelectorAll('.current')) cell.classList.remove('current');
  for (const cell of grid.querySelectorAll(`[data-step="${step}"]`)) cell.classList.add('current');
}

function flashDrumPad(id) {
  const pad = document.querySelector(`[data-drum="${id}"]`);
  if (!pad) return;
  pad.classList.add('hit');
  setTimeout(() => pad.classList.remove('hit'), 130);
}

function updateRhythmUI() {
  if (!$('rhythmStyle')) return;
  const settings = rhythm.settings;
  $('rhythmStyle').value = settings.style;
  $('rhythmProgression').value = settings.progression;
  $('rhythmKey').value = String(settings.key);
  $('rhythmChordSource').value = settings.chordSource;
  $('autoFill').checked = settings.autoFill;
  $('drumVolume').value = String(settings.drumVolume);
  $('guitarVolume').value = String(settings.guitarVolume);
  $('swing').value = String(settings.swing);
  rhythmPercent('drumVolume', settings.drumVolume);
  rhythmPercent('guitarVolume', settings.guitarVolume);
  rhythmPercent('swing', settings.swing / 0.7);
  $('rhythmToggle').textContent = rhythm.playing ? 'Parar banda' : 'Iniciar banda';
  $('rhythmToggle').classList.toggle('active', rhythm.playing);
  $('rhythmBadge').textContent = rhythm.playing ? 'Tocando' : 'Parada';
  $('rhythmBadge').classList.toggle('live', rhythm.playing);
  $('bandStatus').textContent = rhythm.playing ? 'Banda on' : 'Banda off';
  $('bandStatus').classList.toggle('live', rhythm.playing);
  const chord = settings.chordSource === 'played'
    ? { label: `${CHORDS[$('chordSelect').value].label} em ${midiToName(lastPlayedNote)}` }
    : chordForProgression(settings.progression, settings.key, Math.max(0, rhythm.chordIndex));
  const harmony = settings.chordSource === 'played'
    ? `acorde tocado · ${chord.label}`
    : `${PROGRESSIONS[settings.progression].label} · tom ${NOTE_NAMES[settings.key]} · acorde ${chord.label}`;
  $('rhythmInfo').textContent = `${RHYTHM_STYLES[settings.style].label} · ${harmony}`;
  renderPattern();
}

function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      settings: engine.settings,
      parts: engine.parts,
      mode: engine.mode,
      activePart: engine.activePart,
      splitNote: engine.splitNote,
      muted: engine.muted,
      rhythm: { ...rhythm.settings },
      theme: document.body.dataset.theme || 'default',
      startOctave: keyboard.startOctave,
      octaves: keyboard.octaves,
      scale: $('scaleSelect').value,
      scaleRoot: $('scaleRoot').value,
      chord: $('chordSelect').value
    }));
  }, 300);
}

function getSavedPresets() {
  const presets = readJSON(USER_PRESETS_KEY, []);
  return Array.isArray(presets) ? presets : [];
}

function renderUserPresets() {
  const select = $('userPresetSelect');
  const presets = getSavedPresets();
  select.innerHTML = '';
  if (!presets.length) {
    const option = document.createElement('option');
    option.textContent = 'Nenhum preset salvo';
    select.appendChild(option);
    return;
  }
  for (const preset of presets) {
    const option = document.createElement('option');
    option.value = preset.name;
    option.textContent = preset.name;
    select.appendChild(option);
  }
}

function populateSelects() {
  for (const [key, scale] of Object.entries(SCALES)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = scale.label;
    $('scaleSelect').appendChild(option);
  }
  NOTE_NAMES.forEach((name, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = name;
    $('scaleRoot').appendChild(option);
  });
  for (const [key, chord] of Object.entries(CHORDS)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = chord.label;
    $('chordSelect').appendChild(option);
  }
  for (const [key, preset] of Object.entries(PRESETS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-btn';
    button.dataset.preset = key;
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      engine.setPreset(key);
      updateRoutingUI();
      toast(`${preset.label} na parte ${engine.activePart}`);
    });
    $('presetGrid').appendChild(button);
  }
  for (const [key, style] of Object.entries(RHYTHM_STYLES)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = style.label;
    $('rhythmStyle').appendChild(option);
  }
  for (const [key, progression] of Object.entries(PROGRESSIONS)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = progression.label;
    $('rhythmProgression').appendChild(option);
  }
  NOTE_NAMES.forEach((name, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `Tom ${name}`;
    $('rhythmKey').appendChild(option);
  });
  for (const pad of DRUM_PADS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'drum-pad';
    button.dataset.drum = pad.id;
    button.setAttribute('aria-label', `${pad.label}, tecla Shift ${pad.key}`);
    button.innerHTML = `<b>${pad.key}</b>${pad.label}`;
    $('drumPads').appendChild(button);
  }
}

function bindSettings() {
  for (const element of document.querySelectorAll('[data-setting]')) {
    const key = element.dataset.setting;
    const handler = () => {
      const value = element.type === 'range' || element.type === 'number' ? Number(element.value) : element.value;
      engine.updateSetting(key, value);
    };
    element.addEventListener(element.type === 'range' ? 'input' : 'change', handler);
  }
}

function bindRouting() {
  for (const button of document.querySelectorAll('.mode-btn')) {
    button.addEventListener('click', () => {
      engine.setMode(button.dataset.mode);
    });
  }
  for (const button of document.querySelectorAll('.part-tab')) {
    button.addEventListener('click', () => engine.setActivePart(button.dataset.part));
  }
  $('muteA').addEventListener('change', (event) => engine.setMuted('A', event.target.checked));
  $('muteB').addEventListener('change', (event) => engine.setMuted('B', event.target.checked));
  $('splitNote').addEventListener('input', (event) => engine.setSplitNote(Number(event.target.value)));
  $('setSplitFromLast').addEventListener('click', () => {
    engine.setSplitNote(lastPlayedNote);
    toast(`Divisão em ${midiToName(lastPlayedNote)}`);
  });
}

function applyStyleDefaults() {
  const suggested = { blues: 0.25, jazz: 0.3, reggae: 0.12 }[rhythm.settings.style];
  if (suggested !== undefined && rhythm.settings.swing === 0) rhythm.setSetting('swing', suggested);
}

function ensureBandGuitar(notify = false) {
  const wanted = rhythm.settings.style === 'ballad' ? 'acousticGuitar' : 'guitar';
  if (engine.parts.B.presetName === wanted) return;
  engine.setPartPreset('B', wanted);
  updateRoutingUI();
  if (notify) toast(`Guitarra da banda: ${PRESETS[wanted].label}`);
}

function bindRhythm() {
  for (const element of document.querySelectorAll('[data-rhythm-setting]')) {
    const key = element.dataset.rhythmSetting;
    const handler = () => {
      const value = element.type === 'range'
        ? Number(element.value)
        : element.type === 'checkbox' ? element.checked : element.value;
      rhythm.setSetting(key, value);
    };
    element.addEventListener(element.type === 'range' ? 'input' : 'change', handler);
  }
  $('rhythmToggle').addEventListener('click', async () => {
    if (rhythm.playing) {
      rhythm.stop();
      toast('Banda parada');
    } else {
      applyStyleDefaults();
      ensureBandGuitar(true);
      await rhythm.start();
      updateRhythmUI();
      toast(`${RHYTHM_STYLES[rhythm.settings.style].label} iniciado`);
    }
  });
  $('rhythmStyle').addEventListener('change', () => {
    applyStyleDefaults();
    ensureBandGuitar(true);
  });
  $('rhythmFill').addEventListener('click', async () => {
    await rhythm.triggerFill();
    toast('Fill de bateria');
  });
  for (const pad of document.querySelectorAll('[data-drum]')) {
    pad.addEventListener('click', () => rhythm.triggerDrum(pad.dataset.drum));
  }
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey) return;
    if (event.altKey && !event.shiftKey) {
      if (event.code === 'KeyR') {
        event.preventDefault();
        $('rhythmToggle').click();
        return;
      }
      if (event.code === 'KeyF') {
        event.preventDefault();
        $('rhythmFill').click();
        return;
      }
    }
    if (event.shiftKey !== true || event.altKey) return;
    const tag = event.target?.tagName || '';
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
    const index = Number(event.code?.replace('Digit', '')) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= DRUM_PADS.length) return;
    event.preventDefault();
    rhythm.triggerDrum(DRUM_PADS[index].id);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function currentConfig() {
  return {
    version: 1,
    settings: { ...engine.settings },
    parts: { A: { ...engine.parts.A }, B: { ...engine.parts.B } },
    mode: engine.mode,
    activePart: engine.activePart,
    splitNote: engine.splitNote,
    muted: { ...engine.muted },
    rhythm: { ...rhythm.settings },
    theme: document.body.dataset.theme || 'default',
    scale: $('scaleSelect').value,
    scaleRoot: $('scaleRoot').value,
    chord: $('chordSelect').value,
    userPresets: getSavedPresets()
  };
}

function applyConfig(data) {
  if (!data || typeof data !== 'object') throw new Error('Configuração inválida');
  engine.saveActivePart();
  engine.restoreState(data);
  rhythm.restore(data.rhythm);
  applyTheme(data.theme, false);
  $('scaleSelect').value = SCALES[data.scale] ? data.scale : 'none';
  $('scaleRoot').value = String(clamp(Number(data.scaleRoot ?? 0), 0, 11));
  $('chordSelect').value = CHORDS[data.chord] ? data.chord : 'major';
  if (Array.isArray(data.userPresets)) localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(data.userPresets));
  syncSettingsUI();
  updateShiftVisuals();
  updateRoutingUI();
  updateRhythmUI();
  renderUserPresets();
  refreshScale();
  schedulePersist();
}

function bindExportTools() {
  $('exportMidi').addEventListener('click', () => {
    if (!sequencer.events.length) {
      toast('Grave ou importe uma sequência primeiro');
      return;
    }
    downloadBlob(midiBlob(sequencer.events, engine.settings.bpm), 'sequencia-teclado.mid');
    toast('MIDI exportado');
  });

  $('importMidi').addEventListener('click', () => $('midiFile').click());
  $('midiFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const midiData = parseMidi(await file.arrayBuffer());
      if (!midiData.events.length) throw new Error('Sem notas');
      sequencer.import(JSON.stringify({ bpm: midiData.bpm, events: midiData.events }));
      engine.updateSetting('bpm', midiData.bpm);
      updateTransport();
      toast(`${midiData.events.length} notas importadas do MIDI`);
    } catch {
      toast('Não foi possível importar o MIDI');
    }
    event.target.value = '';
  });

  $('wavRecBtn').addEventListener('click', async () => {
    const button = $('wavRecBtn');
    if (recorder.recording) {
      button.disabled = true;
      button.textContent = 'Finalizando...';
      try {
        const result = await recorder.stop();
        if (result) {
          downloadBlob(result.blob, `teclado-musical.${result.extension}`);
          toast(`Áudio salvo em ${result.extension.toUpperCase()}`);
        }
      } catch {
        toast('Não foi possível finalizar a gravação');
      }
      button.textContent = 'Gravar áudio';
      button.classList.remove('active');
      button.disabled = false;
      return;
    }
    try {
      await recorder.start();
    } catch {
      toast('Gravação de áudio não disponível neste navegador');
      return;
    }
    markAudioReady();
    button.textContent = 'Parar gravação';
    button.classList.add('active');
    toast('Gravando áudio...');
  });

  $('exportConfig').addEventListener('click', () => {
    downloadBlob(new Blob([JSON.stringify(currentConfig(), null, 2)], { type: 'application/json' }), 'config-teclado.json');
    toast('Configuração exportada');
  });
  $('importConfig').addEventListener('click', () => $('configFile').click());
  $('configFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      applyConfig(JSON.parse(await file.text()));
      toast('Configuração importada');
    } catch {
      toast('Não foi possível importar a configuração');
    }
    event.target.value = '';
  });
}

function bindTransport() {
  $('recBtn').addEventListener('click', () => {
    if (sequencer.recording) {
      sequencer.stopRecording();
      toast('Gravação finalizada');
    } else {
      sequencer.startRecording(true);
      toast('Gravando... toque algumas notas');
    }
  });
  $('playBtn').addEventListener('click', () => {
    if (!sequencer.playing && !sequencer.events.length) {
      toast('Grave ou importe uma sequência primeiro');
      return;
    }
    sequencer.togglePlay();
  });
  $('stopBtn').addEventListener('click', () => sequencer.stop());
  $('loopBtn').addEventListener('click', () => sequencer.setLoop(!sequencer.loop));
  $('quantizeBtn').addEventListener('click', () => {
    sequencer.quantize(engine.settings.bpm, Number(engine.settings.arpRate));
    toast(`Quantizado em 1/${engine.settings.arpRate}`);
  });
  $('undoBtn').addEventListener('click', () => sequencer.removeLast());
  $('clearBtn').addEventListener('click', () => sequencer.clear());

  $('exportSeq').addEventListener('click', () => {
    if (!sequencer.events.length) {
      toast('Nada para exportar');
      return;
    }
    const data = {
      version: 2,
      bpm: engine.settings.bpm,
      events: sequencer.events,
      rhythm: { ...rhythm.settings },
      theme: document.body.dataset.theme || 'default',
      parts: { A: { ...engine.parts.A }, B: { ...engine.parts.B } }
    };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'sequencia-teclado.json');
    toast('Sequência exportada');
  });

  $('importSeq').addEventListener('click', () => $('seqFile').click());
  $('seqFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const result = sequencer.import(JSON.stringify(data));
      if (Number.isFinite(Number(result.bpm))) {
        engine.updateSetting('bpm', clamp(Math.round(Number(result.bpm)), 60, 200));
      }
      if (data.rhythm) {
        rhythm.restore(data.rhythm);
        ensureBandGuitar();
      }
      if (data.theme) applyTheme(data.theme, false);
      if (data.parts) {
        engine.saveActivePart();
        engine.parts.A = { ...engine.parts.A, ...data.parts.A };
        engine.parts.B = { ...engine.parts.B, ...data.parts.B };
        engine.settings = { ...engine.settings, ...engine.parts[engine.activePart] };
        engine.applySettings();
        syncSettingsUI();
        updateRoutingUI();
      }
      updateRhythmUI();
      schedulePersist();
      toast(`${result.count} notas importadas`);
    } catch {
      toast('Não foi possível importar o arquivo');
    }
    event.target.value = '';
  });
}

function bindToggles() {
  $('sustainBtn').addEventListener('click', () => {
    sustainLatched = !sustainLatched;
    applySustain();
  });
  $('chordBtn').addEventListener('click', () => {
    chordMode = !chordMode;
    releaseAllChords();
    updateToggle('chordBtn', chordMode);
    $('chordInfo').textContent = chordMode
      ? `Ativo: toque uma nota para ${CHORDS[$('chordSelect').value].label.toLowerCase()}.`
      : 'Ative "Acordes" e toque uma nota.';
  });
  $('metroBtn').addEventListener('click', async () => {
    if (engine.metronome.active) {
      engine.stopMetronome();
    } else {
      await engine.startMetronome(() => {
        const chip = $('metroBtn');
        chip.classList.add('beat');
        setTimeout(() => chip.classList.remove('beat'), 90);
      });
    }
    updateToggle('metroBtn', engine.metronome.active);
  });
  $('arpBtn').addEventListener('click', async () => {
    if (engine.arp.active) engine.stopArp(false);
    else await engine.startArp();
    updateToggle('arpBtn', engine.arp.active);
  });
  $('arpLatch').addEventListener('change', (event) => engine.updateSetting('arpLatch', event.target.checked));
  $('arpClear').addEventListener('click', () => engine.clearArpNotes());
}

function bindKeyboardToolbar() {
  $('octaveDown').addEventListener('click', () => keyboard.setRange(keyboard.startOctave - 1, keyboard.octaves));
  $('octaveUp').addEventListener('click', () => keyboard.setRange(keyboard.startOctave + 1, keyboard.octaves));
  $('rangeDown').addEventListener('click', () => keyboard.setRange(keyboard.startOctave, keyboard.octaves - 1));
  $('rangeUp').addEventListener('click', () => keyboard.setRange(keyboard.startOctave, keyboard.octaves + 1));
  const transpose = (delta) => engine.updateSetting('transpose', clamp(engine.settings.transpose + delta, -12, 12));
  $('transposeDown').addEventListener('click', () => transpose(-1));
  $('transposeUp').addEventListener('click', () => transpose(1));
}

function bindPresets() {
  $('savePreset').addEventListener('click', () => {
    const presets = getSavedPresets();
    const name = $('presetName').value.trim() || `Preset ${presets.length + 1}`;
    const entry = {
      name,
      settings: { ...engine.settings },
      parts: { A: { ...engine.parts.A }, B: { ...engine.parts.B } },
      mode: engine.mode,
      activePart: engine.activePart,
      splitNote: engine.splitNote,
      muted: { ...engine.muted },
      rhythm: { ...rhythm.settings }
    };
    const index = presets.findIndex((preset) => preset.name === name);
    if (index >= 0) presets[index] = entry;
    else presets.push(entry);
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
    renderUserPresets();
    $('userPresetSelect').value = name;
    $('presetName').value = '';
    toast(`Preset "${name}" salvo`);
  });
  $('loadPreset').addEventListener('click', () => {
    const preset = getSavedPresets().find((item) => item.name === $('userPresetSelect').value);
    if (!preset) return;
    engine.saveActivePart();
    engine.restoreState(preset);
    rhythm.restore(preset.rhythm);
    syncSettingsUI();
    updateShiftVisuals();
    updateRoutingUI();
    updateRhythmUI();
    schedulePersist();
    toast(`Preset "${preset.name}" carregado`);
  });
  $('deletePreset').addEventListener('click', () => {
    const presets = getSavedPresets().filter((item) => item.name !== $('userPresetSelect').value);
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
    renderUserPresets();
    toast('Preset excluído');
  });
  $('resetSettings').addEventListener('click', () => {
    engine.restoreState({
      settings: { transpose: 0, octaveShift: 0, bpm: 120, tuning: 440, volume: 0.78 },
      parts: { A: { presetName: 'piano', ...PRESETS.piano }, B: { presetName: 'guitar', ...PRESETS.guitar } },
      mode: 'single', activePart: 'A', splitNote: 60, muted: { A: false, B: false }
    });
    rhythm.restore(null);
    syncSettingsUI();
    updateShiftVisuals();
    updateRoutingUI();
    updateRhythmUI();
    schedulePersist();
    toast('Configuração restaurada');
  });
}

function bindMisc() {
  $('scaleSelect').value = savedState.scale && SCALES[savedState.scale] ? savedState.scale : 'none';
  $('scaleRoot').value = String(clamp(Number(savedState.scaleRoot ?? 0), 0, 11));
  $('chordSelect').value = savedState.chord && CHORDS[savedState.chord] ? savedState.chord : 'major';
  $('scaleSelect').addEventListener('change', () => {
    refreshScale();
    schedulePersist();
  });
  $('scaleRoot').addEventListener('change', () => {
    refreshScale();
    schedulePersist();
  });
  $('chordSelect').addEventListener('change', () => {
    keyboard.setChordNotes([]);
    schedulePersist();
  });
  $('vizMode').addEventListener('change', (event) => visualizer.setMode(event.target.value));
  $('themeSelect').addEventListener('change', (event) => applyTheme(event.target.value));
  $('midiEnable').addEventListener('click', async () => {
    const ok = await midi.init();
    if (ok) toast('MIDI ativado');
  });
  $('midiDevices').addEventListener('change', (event) => midi.select(event.target.value));
  $('helpBtn').addEventListener('click', () => $('helpDialog').showModal());
  $('closeHelp').addEventListener('click', () => $('helpDialog').close());
  $('helpDialog').addEventListener('click', (event) => {
    if (event.target === $('helpDialog')) $('helpDialog').close();
  });
  $('fullscreenBtn').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast('Tela cheia não disponível');
    }
  });
  document.addEventListener('fullscreenchange', () => {
    $('fullscreenBtn').textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia';
  });
}

populateSelects();
renderUserPresets();
applyTheme(savedState.theme, false);
rhythm.restore(savedState.rhythm);
bindSettings();
bindRouting();
bindRhythm();
bindExportTools();
bindTransport();
bindToggles();
bindKeyboardToolbar();
bindPresets();
bindMisc();
syncSettingsUI();
updateShiftVisuals();
updateKeyboardLabels();
updateRoutingUI();
updateRhythmUI();
updateTransport();
applySustain();
visualizer.start();
