export const STEP_COUNT = 16
export const PATTERN_IDS = ['A', 'B', 'C', 'D'] as const

export type PatternId = (typeof PATTERN_IDS)[number]
export type Waveform = 'sine' | 'triangle' | 'square' | 'sawtooth'
export type ScaleMode = 'minor' | 'major'
export type SoundWorld = 'witch-house' | 'darksynth' | 'darkwave' | 'glitch'
export type VoiceId = 'chords' | 'bass' | 'pulse' | 'texture'
export type NoteLane = 'notes' | 'bass'
export type StepLane = NoteLane | 'drum' | 'texture'
export type AutomationTarget = 'mask' | 'memory' | 'veil' | 'fracture' | 'ghost' | 'overclock'
export type ApplyQuantization = 'step' | 'beat' | 'bar'

export interface Step {
  notes: string[]
  bass: string | null
  drum: boolean
  texture: boolean
  velocity: number
  chordLength: number
  bassLength: number
}

export interface VoiceSettings {
  core: Waveform
  cutoff: number
  attack: number
  decay: number
  sustain: number
  release: number
  volume: number
  mute: boolean
  solo: boolean
}

export interface SoundSettings {
  memory: number
  environment: number
  veil: number
  fracture: number
  ghost: number
  humanize: number
  overclock: number
}

export type AutomationLanes = Record<AutomationTarget, Array<number | null>>

export interface Pattern {
  id: PatternId
  name: string
  steps: Step[]
  automation: AutomationLanes
}

export interface Composition {
  id: string
  name: string
  world: SoundWorld
  bpm: number
  masterVolume: number
  seed: number
  scaleLock: boolean
  scaleRoot: string
  scaleMode: ScaleMode
  sound: SoundSettings
  voices: Record<VoiceId, VoiceSettings>
  patterns: Pattern[]
  activePatternId: PatternId
  arrangement: PatternId[]
}

export const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export const SOUND_WORLD_PROFILES: Record<SoundWorld, { label: string; description: string }> = {
  'witch-house': { label: 'Witch house', description: 'Slowed ritual pulse · cavernous tails · damaged haze' },
  darksynth: { label: 'Darksynth', description: 'Driven bass motion · bright saw edges · cinematic pressure' },
  darkwave: { label: 'Darkwave', description: 'Cold chorus width · minor harmony · restrained machine pulse' },
  glitch: { label: 'Glitch', description: 'Broken timing · reduced bits · unstable event density' },
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  memory: 0.28,
  environment: 0.2,
  veil: 0.18,
  fracture: 0,
  ghost: 0.12,
  humanize: 0.03,
  overclock: 0,
}

export const makeEmptyStep = (): Step => ({
  notes: [],
  bass: null,
  drum: false,
  texture: false,
  velocity: 0.72,
  chordLength: 1,
  bassLength: 1,
})

export const makeAutomationLanes = (): AutomationLanes => ({
  mask: Array.from({ length: STEP_COUNT }, () => null),
  memory: Array.from({ length: STEP_COUNT }, () => null),
  veil: Array.from({ length: STEP_COUNT }, () => null),
  fracture: Array.from({ length: STEP_COUNT }, () => null),
  ghost: Array.from({ length: STEP_COUNT }, () => null),
  overclock: Array.from({ length: STEP_COUNT }, () => null),
})

function makeVoice(overrides: Partial<VoiceSettings> = {}): VoiceSettings {
  return {
    core: 'triangle',
    cutoff: 2800,
    attack: 0.05,
    decay: 0.38,
    sustain: 0.58,
    release: 1.4,
    volume: -10,
    mute: false,
    solo: false,
    ...overrides,
  }
}

export const makeEmptyPattern = (id: PatternId): Pattern => ({
  id,
  name: `Pattern ${id}`,
  steps: Array.from({ length: STEP_COUNT }, makeEmptyStep),
  automation: makeAutomationLanes(),
})

export const makeEmptyComposition = (): Composition => ({
  id: 'untitled-signal',
  name: 'Untitled Signal',
  world: 'darkwave',
  bpm: 92,
  masterVolume: -12,
  seed: 1986,
  scaleLock: true,
  scaleRoot: 'C',
  scaleMode: 'minor',
  sound: { ...DEFAULT_SOUND_SETTINGS },
  voices: {
    chords: makeVoice(),
    bass: makeVoice({ core: 'triangle', cutoff: 950, attack: 0.012, decay: 0.3, sustain: 0.5, release: 0.7, volume: -9 }),
    pulse: makeVoice({ core: 'sine', cutoff: 2100, attack: 0.005, decay: 0.09, sustain: 0, release: 0.06, volume: -16 }),
    texture: makeVoice({ core: 'sawtooth', cutoff: 1400, attack: 0.08, decay: 0.6, sustain: 0.12, release: 1.8, volume: -22 }),
  },
  patterns: PATTERN_IDS.map(makeEmptyPattern),
  activePatternId: 'A',
  arrangement: ['A', 'A', 'B', 'C'],
})

const NOTE_PATTERN = /^([A-G])([#b]?)(-?\d)$/
const NATURAL_PITCHES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const PITCH_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export function noteToMidi(note: string): number | null {
  const match = NOTE_PATTERN.exec(note)
  if (!match) return null
  const [, letter, accidental, octaveText] = match
  const accidentalOffset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0
  return (Number(octaveText) + 1) * 12 + NATURAL_PITCHES[letter] + accidentalOffset
}

export function midiToNote(midi: number): string {
  const normalized = Math.round(midi)
  const pitch = ((normalized % 12) + 12) % 12
  const octave = Math.floor(normalized / 12) - 1
  return `${PITCH_NAMES[pitch]}${octave}`
}

export function isNote(value: string): boolean {
  const midi = noteToMidi(value)
  return midi !== null && midi >= 12 && midi <= 119
}

export function transposeNote(note: string, semitones: number): string {
  const midi = noteToMidi(note)
  return midi === null ? note : midiToNote(clamp(midi + semitones, 12, 119))
}

export function notesForScale(root: string, mode: ScaleMode, octave = 4): string[] {
  const rootMidi = noteToMidi(`${root}${octave}`) ?? 60
  const intervals = mode === 'minor' ? [0, 2, 3, 5, 7, 8, 10, 12] : [0, 2, 4, 5, 7, 9, 11, 12]
  return intervals.map((interval) => midiToNote(rootMidi + interval))
}

export function chordSuggestions(composition: Composition): Array<{ name: string; notes: string[] }> {
  const scale = notesForScale(composition.scaleRoot, composition.scaleMode)
  const degreeNames = composition.scaleMode === 'minor'
    ? ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']
    : ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
  return degreeNames.map((name, degree) => ({
    name,
    notes: [scale[degree], scale[(degree + 2) % 7], scale[(degree + 4) % 7]].map((note, index) => {
      const midi = noteToMidi(note) ?? 60
      const rootMidi = noteToMidi(scale[degree]) ?? 60
      return midi < rootMidi || (index > 0 && midi <= (noteToMidi(scale[degree]) ?? 60)) ? midiToNote(midi + 12) : note
    }),
  }))
}

export function defaultChord(composition: Composition): string[] {
  return chordSuggestions(composition)[0].notes
}

export function defaultBass(composition: Composition): string {
  return notesForScale(composition.scaleRoot, composition.scaleMode, 2)[0]
}

export function getPattern(composition: Composition, id = composition.activePatternId): Pattern {
  return composition.patterns.find((pattern) => pattern.id === id) ?? composition.patterns[0]
}

export function getActivePattern(composition: Composition): Pattern {
  return getPattern(composition, composition.activePatternId)
}

export function cloneStep(step: Step): Step {
  return { ...step, notes: [...step.notes] }
}

export function clonePattern(pattern: Pattern): Pattern {
  const lane = (target: AutomationTarget) => [...(pattern.automation[target] ?? Array.from({ length: STEP_COUNT }, () => null))]
  return {
    ...pattern,
    steps: pattern.steps.map(cloneStep),
    automation: {
      mask: lane('mask'),
      memory: lane('memory'),
      veil: lane('veil'),
      fracture: lane('fracture'),
      ghost: lane('ghost'),
      overclock: lane('overclock'),
    },
  }
}

export function cloneComposition(composition: Composition): Composition {
  return {
    ...composition,
    world: composition.world ?? 'darkwave',
    sound: { ...DEFAULT_SOUND_SETTINGS, ...composition.sound },
    voices: {
      chords: { ...composition.voices.chords },
      bass: { ...composition.voices.bass },
      pulse: { ...composition.voices.pulse },
      texture: { ...composition.voices.texture },
    },
    patterns: composition.patterns.map(clonePattern),
    arrangement: [...composition.arrangement],
  }
}

export function transposePattern(pattern: Pattern, semitones: number): Pattern {
  const next = clonePattern(pattern)
  next.steps.forEach((step) => {
    step.notes = step.notes.map((note) => transposeNote(note, semitones))
    if (step.bass) step.bass = transposeNote(step.bass, semitones)
  })
  return next
}

export function rotatePattern(pattern: Pattern, offset: number): Pattern {
  const next = clonePattern(pattern)
  const normalized = ((offset % STEP_COUNT) + STEP_COUNT) % STEP_COUNT
  next.steps = [...next.steps.slice(-normalized), ...next.steps.slice(0, -normalized)]
  for (const target of Object.keys(next.automation) as AutomationTarget[]) {
    const lane = next.automation[target]
    next.automation[target] = [...lane.slice(-normalized), ...lane.slice(0, -normalized)]
  }
  return next
}
