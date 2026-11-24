export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_PT = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];
export const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export const SCALES = {
  none: { label: 'Desativada', intervals: [] },
  major: { label: 'Maior', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Menor natural', intervals: [0, 2, 3, 5, 7, 8, 10] },
  harmonicMinor: { label: 'Menor harmônica', intervals: [0, 2, 3, 5, 7, 8, 11] },
  melodicMinor: { label: 'Menor melódica', intervals: [0, 2, 3, 5, 7, 9, 11] },
  pentatonicMajor: { label: 'Pentatônica maior', intervals: [0, 2, 4, 7, 9] },
  pentatonicMinor: { label: 'Pentatônica menor', intervals: [0, 3, 5, 7, 10] },
  blues: { label: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  dorian: { label: 'Dórica', intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { label: 'Frígia', intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { label: 'Lídia', intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { label: 'Mixolídia', intervals: [0, 2, 4, 5, 7, 9, 10] },
  wholeTone: { label: 'Tons inteiros', intervals: [0, 2, 4, 6, 8, 10] },
  chromatic: { label: 'Cromática', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
};

export const CHORDS = {
  major: { label: 'Maior', suffix: '', intervals: [0, 4, 7] },
  minor: { label: 'Menor', suffix: 'm', intervals: [0, 3, 7] },
  maj7: { label: 'Maior 7', suffix: 'maj7', intervals: [0, 4, 7, 11] },
  min7: { label: 'Menor 7', suffix: 'm7', intervals: [0, 3, 7, 10] },
  dom7: { label: 'Dominante 7', suffix: '7', intervals: [0, 4, 7, 10] },
  dim: { label: 'Diminuto', suffix: 'dim', intervals: [0, 3, 6] },
  aug: { label: 'Aumentado', suffix: 'aug', intervals: [0, 4, 8] },
  sus2: { label: 'Sus 2', suffix: 'sus2', intervals: [0, 2, 7] },
  sus4: { label: 'Sus 4', suffix: 'sus4', intervals: [0, 5, 7] },
  add9: { label: 'Add 9', suffix: 'add9', intervals: [0, 4, 7, 14] },
  power: { label: 'Power', suffix: '5', intervals: [0, 7, 12] }
};

export const KEY_MAP = Object.freeze({
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11,
  ',': 12, q: 12, 2: 13, w: 14, 3: 15, e: 16, r: 17, 5: 18, t: 19, 6: 20, y: 21, 7: 22, u: 23, i: 24
});

export const KEY_LABELS = new Map();
for (const [key, offset] of Object.entries(KEY_MAP)) {
  if (!KEY_LABELS.has(offset)) KEY_LABELS.set(offset, key === ',' ? ',' : key.toUpperCase());
}

export function pitchClass(midi) {
  return ((midi % 12) + 12) % 12;
}

export function isBlack(midi) {
  return BLACK_PITCH_CLASSES.has(pitchClass(midi));
}

export function midiToName(midi, portuguese = false) {
  const pc = pitchClass(midi);
  const octave = Math.floor(midi / 12) - 1;
  return `${(portuguese ? NOTE_NAMES_PT : NOTE_NAMES)[pc]}${octave}`;
}

export function midiToFreq(midi, tuning = 440) {
  return tuning * Math.pow(2, (midi - 69) / 12);
}

export function keyToOffset(key) {
  if (typeof key !== 'string') return undefined;
  return KEY_MAP[key.toLowerCase()];
}

export function buildChord(rootMidi, chordName) {
  const chord = CHORDS[chordName] || CHORDS.major;
  return chord.intervals.map((interval) => rootMidi + interval).filter((midi) => midi >= 0 && midi <= 127);
}

export function chordLabel(rootMidi, chordName) {
  const chord = CHORDS[chordName] || CHORDS.major;
  return `${midiToName(rootMidi)}${chord.suffix}`;
}

export function scalePitchClasses(rootMidi, scaleName) {
  const scale = SCALES[scaleName] || SCALES.none;
  const root = pitchClass(rootMidi);
  return new Set(scale.intervals.map((interval) => pitchClass(root + interval)));
}

export function quantizeTime(seconds, bpm, division = 4) {
  const step = 60 / Math.max(20, bpm) / division;
  return Math.round(seconds / step) * step;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
