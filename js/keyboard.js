import { KEY_LABELS, keyToOffset, midiToName, pitchClass, scalePitchClasses, clamp } from './notes.js';

function isFormField(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export class Keyboard {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.startOctave = options.startOctave ?? 3;
    this.octaves = options.octaves ?? 4;
    this.octaveShift = 0;
    this.extraShift = 0;
    this.keyElements = new Map();
    this.activeCounts = new Map();
    this.pointerNotes = new Map();
    this.heldKeys = new Set();
    this.routing = { mode: 'single', splitNote: 60, activePart: 'A', muted: { A: false, B: false } };
    this.bindEvents();
    this.render();
  }

  get startMidi() {
    return (this.startOctave + 1) * 12;
  }

  get endMidi() {
    return this.startMidi + this.octaves * 12 - 1;
  }

  render() {
    this.container.innerHTML = '';
    this.keyElements.clear();
    this.activeCounts.clear();
    const whiteNotes = [];
    const blackNotes = [];
    for (let midi = this.startMidi; midi <= this.endMidi; midi += 1) {
      const note = { midi, black: [1, 3, 6, 8, 10].includes(midi % 12) };
      (note.black ? blackNotes : whiteNotes).push(note);
    }
    this.container.style.setProperty('--white-count', String(whiteNotes.length));

    for (const { midi } of whiteNotes) {
      const key = this.createKey(midi, 'white');
      this.container.appendChild(key);
    }
    let whitesSeen = 0;
    for (const { midi } of blackNotes) {
      while (whitesSeen < whiteNotes.length && whiteNotes[whitesSeen].midi < midi) whitesSeen += 1;
      const key = this.createKey(midi, 'black');
      key.style.setProperty('--pos', String(whitesSeen));
      this.container.appendChild(key);
    }
    this.refreshLabels();
    this.applyRouting();
  }

  createKey(midi, color) {
    const key = document.createElement('div');
    key.className = `key ${color}`;
    key.dataset.midi = String(midi);
    key.setAttribute('role', 'button');
    key.setAttribute('aria-label', midiToName(midi));
    key.innerHTML = `<span class="key-note"></span><span class="key-shortcut"></span>`;
    this.keyElements.set(midi, key);
    return key;
  }

  refreshLabels() {
    const shift = this.octaveShift + this.extraShift;
    for (const [midi, element] of this.keyElements) {
      const played = midi + shift;
      const noteLabel = element.querySelector('.key-note');
      const shortcutLabel = element.querySelector('.key-shortcut');
      const pc = pitchClass(played);
      noteLabel.textContent = pc === 0 ? midiToName(played) : midiToName(played).replace(/\d+$/, '');
      const offset = midi - this.startMidi;
      shortcutLabel.textContent = KEY_LABELS.get(offset) || '';
      element.setAttribute('aria-label', midiToName(played));
    }
  }

  setRange(startOctave, octaves) {
    this.releaseAll();
    this.startOctave = clamp(startOctave, 1, 7);
    this.octaves = clamp(octaves, 1, 5);
    this.render();
    this.options.onRangeChange?.(this.startOctave, this.octaves);
  }

  setOctaveShift(shift) {
    this.octaveShift = shift;
    this.refreshLabels();
    this.applyHighlights();
  }

  setExtraShift(shift) {
    this.extraShift = shift;
    this.refreshLabels();
    this.applyHighlights();
  }

  bindEvents() {
    this.container.addEventListener('pointerdown', (event) => {
      const key = event.target.closest('.key');
      if (!key) return;
      event.preventDefault();
      this.container.setPointerCapture(event.pointerId);
      const midi = Number(key.dataset.midi);
      this.pointerNotes.set(event.pointerId, midi);
      this.options.onNoteOn?.(midi, { source: 'pointer' });
      this.setActive(midi, true);
      this.options.onNoteChange?.(midi);
    });

    this.container.addEventListener('pointermove', (event) => {
      if (!this.pointerNotes.has(event.pointerId)) return;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const key = element?.closest('.key');
      if (!key || !this.container.contains(key)) return;
      const midi = Number(key.dataset.midi);
      const previous = this.pointerNotes.get(event.pointerId);
      if (midi === previous) return;
      this.options.onNoteOff?.(previous, { source: 'pointer' });
      this.setActive(previous, false);
      this.pointerNotes.set(event.pointerId, midi);
      this.options.onNoteOn?.(midi, { source: 'pointer' });
      this.setActive(midi, true);
      this.options.onNoteChange?.(midi);
    });

    const endPointer = (event) => {
      const midi = this.pointerNotes.get(event.pointerId);
      if (midi === undefined) return;
      this.pointerNotes.delete(event.pointerId);
      this.options.onNoteOff?.(midi, { source: 'pointer' });
      this.setActive(midi, false);
    };
    this.container.addEventListener('pointerup', endPointer);
    this.container.addEventListener('pointercancel', endPointer);

    document.addEventListener('keydown', (event) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        this.options.onSustain?.(true);
        return;
      }
      const offset = keyToOffset(event.key);
      if (offset === undefined) return;
      event.preventDefault();
      const keyName = event.key.toLowerCase();
      if (this.heldKeys.has(keyName)) return;
      const midi = clamp(this.startMidi + offset, 0, 127);
      this.heldKeys.add(keyName);
      this.options.onNoteOn?.(midi, { source: 'keyboard' });
      this.setActive(midi, true);
      this.options.onNoteChange?.(midi);
    });

    document.addEventListener('keyup', (event) => {
      if (event.code === 'Space') {
        this.options.onSustain?.(false);
        return;
      }
      const keyName = event.key.toLowerCase();
      const offset = keyToOffset(keyName);
      if (offset === undefined || !this.heldKeys.has(keyName)) return;
      event.preventDefault();
      this.heldKeys.delete(keyName);
      const midi = clamp(this.startMidi + offset, 0, 127);
      this.options.onNoteOff?.(midi, { source: 'keyboard' });
      this.setActive(midi, false);
    });

    window.addEventListener('blur', () => this.releaseAll());
  }

  setActive(midi, active) {
    const key = this.keyElements.get(midi);
    if (!key) return;
    const count = this.activeCounts.get(midi) || 0;
    const next = Math.max(0, active ? count + 1 : count - 1);
    if (next === 0) {
      this.activeCounts.delete(midi);
      key.classList.remove('active');
    } else {
      this.activeCounts.set(midi, next);
      key.classList.add('active');
    }
  }

  flash(midi, active) {
    this.setActive(midi, active);
    if (active) this.options.onNoteChange?.(midi);
  }

  releaseAll() {
    this.options.onAllNotesOff?.();
    for (const midi of [...this.activeCounts.keys()]) {
      this.setActive(midi, false);
    }
    this.pointerNotes.clear();
    this.heldKeys.clear();
  }

  setScale(scaleName, rootMidi) {
    this.scaleName = scaleName;
    this.rootMidi = rootMidi;
    this.applyHighlights();
  }

  setChordNotes(notes) {
    this.chordNotes = notes || [];
    this.applyHighlights();
  }

  applyHighlights() {
    const shift = this.octaveShift + this.extraShift;
    const pitchClasses = scalePitchClasses(this.rootMidi ?? 60, this.scaleName || 'none');
    for (const [midi, element] of this.keyElements) {
      const played = midi + shift;
      const pc = pitchClass(played);
      element.classList.toggle('in-scale', pitchClasses.has(pc));
      element.classList.toggle('scale-root', (this.rootMidi ?? 60) % 12 === pc && pitchClasses.size > 0);
      element.classList.toggle('chord-note', (this.chordNotes || []).includes(played));
    }
  }

  setRouting(routing = {}) {
    this.routing = {
      mode: routing.mode || 'single',
      splitNote: routing.splitNote ?? 60,
      activePart: routing.activePart || 'A',
      muted: routing.muted || { A: false, B: false }
    };
    this.applyRouting();
  }

  applyRouting() {
    const { mode, splitNote, activePart, muted } = this.routing;
    for (const [midi, element] of this.keyElements) {
      const low = midi <= splitNote;
      const showA = (mode === 'layer' || (mode === 'split' && low) || (mode === 'single' && activePart === 'A')) && !muted.A;
      const showB = (mode === 'layer' || (mode === 'split' && !low) || (mode === 'single' && activePart === 'B')) && !muted.B;
      element.classList.toggle('part-a', showA);
      element.classList.toggle('part-b', showB);
      element.dataset.part = showA && showB ? 'both' : showA ? 'A' : showB ? 'B' : 'none';
    }
  }
}
