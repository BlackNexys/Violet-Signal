export const DEFAULT_STEP_COUNT = 16
/** Legacy alias retained for compact teaching imports and older integrations. */
export const STEP_COUNT = DEFAULT_STEP_COUNT
export const STEP_COUNT_OPTIONS = [8, 12, 14, 16, 20, 24, 28, 32, 64] as const
export const METERS = ['4/4', '3/4', '6/8', '5/4', '7/8'] as const
export const PATTERN_IDS = ['A', 'B', 'C', 'D'] as const
export const VOICE_IDS = ['chords', 'bass', 'pulse', 'texture'] as const
export const SCALE_ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'] as const
export const SCALE_MODES = ['minor', 'major', 'dorian', 'phrygian', 'harmonic minor', 'melodic minor', 'pentatonic'] as const
export const FORMAT_VERSION = 3

export type PatternId = (typeof PATTERN_IDS)[number]
export type Waveform = 'sine' | 'triangle' | 'square' | 'sawtooth'
export type FilterType = 'lowpass' | 'highpass' | 'bandpass'
export type ScaleMode = (typeof SCALE_MODES)[number]
export type StyleId = string
/** @deprecated `world` remains the serialized compatibility name for a style id. */
export type SoundWorld = StyleId
export type Meter = (typeof METERS)[number]
export type VoiceId = (typeof VOICE_IDS)[number]
export type LayerSlot = 'primary' | 'shadow'
export type ArrangementLayerSelection = 'all' | LayerSlot
export type InstrumentEngine = 'subtractive' | 'fm' | 'am' | 'dual' | 'pluck' | 'membrane' | 'metal' | 'noise'
export type NoteLane = 'notes' | 'bass'
export type StepLane = NoteLane | 'drum' | 'texture'
export type AutomationTarget = 'mask' | 'memory' | 'veil' | 'fracture' | 'ghost' | 'overclock'
export type ApplyQuantization = 'step' | 'beat' | 'bar'

export const SCALE_INTERVALS: Record<ScaleMode, readonly number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11],
  pentatonic: [0, 3, 5, 7, 10],
}

export interface Step {
  notes: string[]
  bass: string | null
  drum: boolean
  texture: boolean
  velocity: number
  chordLength: number
  bassLength: number
  probability: number
  ratchets: number
  microShift: number
}

export interface VoiceLayerSettings {
  enabled: boolean
  engine: InstrumentEngine
  waveform: Waveform
  octave: number
  detune: number
  level: number
  character: number
  attackScale: number
  releaseScale: number
}

export interface VoiceSettings {
  patchId: string | null
  layers: Record<LayerSlot, VoiceLayerSettings>
  cutoff: number
  attack: number
  decay: number
  sustain: number
  release: number
  filterType: FilterType
  resonance: number
  glide: number
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

export interface ArrangementOccurrence {
  pattern: PatternId
  transpose: number
  mute: VoiceId[]
  layers: Partial<Record<VoiceId, ArrangementLayerSelection>>
}

export interface Composition {
  formatVersion: number
  id: string
  name: string
  world: SoundWorld
  styleVersion: number
  styleInfluences: Array<{ id: StyleId; amount: number }>
  bpm: number
  meter: Meter
  stepCount: number
  swing: number
  masterVolume: number
  seed: number
  scaleLock: boolean
  scaleRoot: string
  scaleMode: ScaleMode
  sound: SoundSettings
  voices: Record<VoiceId, VoiceSettings>
  patterns: Pattern[]
  activePatternId: PatternId
  arrangement: ArrangementOccurrence[]
}

export const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

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
  probability: 1,
  ratchets: 1,
  microShift: 0,
})

export const makeAutomationLanes = (stepCount = DEFAULT_STEP_COUNT): AutomationLanes => ({
  mask: Array.from({ length: stepCount }, () => null),
  memory: Array.from({ length: stepCount }, () => null),
  veil: Array.from({ length: stepCount }, () => null),
  fracture: Array.from({ length: stepCount }, () => null),
  ghost: Array.from({ length: stepCount }, () => null),
  overclock: Array.from({ length: stepCount }, () => null),
})

const DEFAULT_WAVEFORMS: Record<VoiceId, Waveform> = {
  chords: 'triangle',
  bass: 'triangle',
  pulse: 'sine',
  texture: 'sawtooth',
}

const DEFAULT_ENGINES: Record<VoiceId, InstrumentEngine> = {
  chords: 'subtractive',
  bass: 'subtractive',
  pulse: 'membrane',
  texture: 'noise',
}

export const ENGINES_BY_VOICE: Record<VoiceId, InstrumentEngine[]> = {
  chords: ['subtractive', 'fm', 'am', 'dual', 'pluck'],
  bass: ['subtractive', 'fm', 'am', 'dual', 'pluck'],
  pulse: ['membrane', 'metal', 'noise'],
  texture: ['metal', 'noise'],
}

export interface VoiceRecipe extends Partial<Omit<VoiceSettings, 'patchId' | 'layers'>> {
  patchId?: string | null
  core?: Waveform
  detune?: number
  engine?: InstrumentEngine
  primary?: Partial<VoiceLayerSettings>
  shadow?: Partial<VoiceLayerSettings>
}

export function isEngineCompatible(voice: VoiceId, engine: InstrumentEngine): boolean {
  return ENGINES_BY_VOICE[voice].includes(engine)
}

export function makeVoiceLayer(voice: VoiceId, slot: LayerSlot, overrides: Partial<VoiceLayerSettings> = {}): VoiceLayerSettings {
  return {
    enabled: slot === 'primary',
    engine: DEFAULT_ENGINES[voice],
    waveform: DEFAULT_WAVEFORMS[voice],
    octave: 0,
    detune: 0,
    level: slot === 'primary' ? 0 : -18,
    character: 0.28,
    attackScale: 1,
    releaseScale: 1,
    ...overrides,
  }
}

export function makeVoiceSettings(voice: VoiceId, overrides: VoiceRecipe = {}): VoiceSettings {
  const settings: VoiceSettings = {
    patchId: overrides.patchId ?? null,
    layers: {
      primary: makeVoiceLayer(voice, 'primary'),
      shadow: makeVoiceLayer(voice, 'shadow'),
    },
    cutoff: 2800,
    attack: 0.05,
    decay: 0.38,
    sustain: 0.58,
    release: 1.4,
    filterType: 'lowpass',
    resonance: 0.7,
    glide: 0,
    volume: -10,
    mute: false,
    solo: false,
  }
  return applyVoiceRecipe(settings, overrides, voice)
}

export function applyVoiceRecipe(settings: VoiceSettings, recipe: VoiceRecipe, voice: VoiceId): VoiceSettings {
  const next: VoiceSettings = {
    ...settings,
    layers: {
      primary: { ...settings.layers.primary },
      shadow: { ...settings.layers.shadow },
    },
  }
  for (const [key, value] of Object.entries(recipe)) {
    if (value === undefined || ['core', 'detune', 'engine', 'primary', 'shadow'].includes(key)) continue
    ;(next as unknown as Record<string, unknown>)[key] = value
  }
  if (recipe.core !== undefined) next.layers.primary.waveform = recipe.core
  if (recipe.detune !== undefined) next.layers.primary.detune = recipe.detune
  if (recipe.engine !== undefined && isEngineCompatible(voice, recipe.engine)) next.layers.primary.engine = recipe.engine
  if (recipe.primary) next.layers.primary = { ...next.layers.primary, ...recipe.primary, enabled: true }
  if (recipe.shadow) next.layers.shadow = { ...next.layers.shadow, ...recipe.shadow }
  return next
}

export const makeEmptyPattern = (id: PatternId, stepCount = DEFAULT_STEP_COUNT): Pattern => ({
  id,
  name: `Pattern ${id}`,
  steps: Array.from({ length: stepCount }, makeEmptyStep),
  automation: makeAutomationLanes(stepCount),
})

export function makeArrangementOccurrence(pattern: PatternId): ArrangementOccurrence {
  return { pattern, transpose: 0, mute: [], layers: {} }
}

export function normalizeArrangementOccurrence(
  input: PatternId | Partial<ArrangementOccurrence> | undefined,
  fallback: PatternId = 'A',
): ArrangementOccurrence {
  if (typeof input === 'string') {
    return makeArrangementOccurrence(PATTERN_IDS.includes(input) ? input : fallback)
  }
  const pattern = input?.pattern && PATTERN_IDS.includes(input.pattern) ? input.pattern : fallback
  const rawTranspose = input?.transpose
  const transpose = Math.round(clamp(typeof rawTranspose === 'number' && Number.isFinite(rawTranspose) ? rawTranspose : 0, -24, 24))
  const inputMute = Array.isArray(input?.mute) ? input.mute : []
  const mute = VOICE_IDS.filter((voice) => inputMute.includes(voice))
  const layers: ArrangementOccurrence['layers'] = {}
  for (const voice of VOICE_IDS) {
    const selection = input?.layers?.[voice]
    if (selection === 'primary' || selection === 'shadow') layers[voice] = selection
  }
  return { pattern, transpose, mute, layers }
}

export const makeEmptyComposition = (): Composition => ({
  formatVersion: FORMAT_VERSION,
  id: 'untitled-signal',
  name: 'Untitled Signal',
  world: 'darkwave',
  styleVersion: 1,
  styleInfluences: [],
  bpm: 92,
  meter: '4/4',
  stepCount: DEFAULT_STEP_COUNT,
  swing: 0,
  masterVolume: -12,
  seed: 1986,
  scaleLock: true,
  scaleRoot: 'C',
  scaleMode: 'minor',
  sound: { ...DEFAULT_SOUND_SETTINGS },
  voices: {
    chords: makeVoiceSettings('chords'),
    bass: makeVoiceSettings('bass', { core: 'triangle', cutoff: 950, attack: 0.012, decay: 0.3, sustain: 0.5, release: 0.7, volume: -9 }),
    pulse: makeVoiceSettings('pulse', { core: 'sine', cutoff: 2100, attack: 0.005, decay: 0.09, sustain: 0, release: 0.06, volume: -16 }),
    texture: makeVoiceSettings('texture', { core: 'sawtooth', cutoff: 1400, attack: 0.08, decay: 0.6, sustain: 0.12, release: 1.8, volume: -22 }),
  },
  patterns: PATTERN_IDS.map((id) => makeEmptyPattern(id, DEFAULT_STEP_COUNT)),
  activePatternId: 'A',
  arrangement: (['A', 'A', 'B', 'C'] as PatternId[]).map(makeArrangementOccurrence),
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
  const intervals = SCALE_INTERVALS[mode]
  return Array.from({ length: 8 }, (_, degree) => {
    const interval = intervals[degree % intervals.length] + Math.floor(degree / intervals.length) * 12
    return midiToNote(rootMidi + interval)
  })
}

export function chordSuggestions(composition: Composition): Array<{ name: string; notes: string[] }> {
  const rootMidi = noteToMidi(`${composition.scaleRoot}4`) ?? 60
  const intervals = SCALE_INTERVALS[composition.scaleMode]
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
  const midiForDegree = (degree: number) => rootMidi + intervals[degree % intervals.length] + Math.floor(degree / intervals.length) * 12
  return intervals.map((_, degree) => {
    const notes = [degree, degree + 2, degree + 4].map((scaleDegree) => midiForDegree(scaleDegree))
    const shape = [notes[1] - notes[0], notes[2] - notes[0]]
    const quality = shape[0] === 3 && shape[1] === 7 ? 'minor' : shape[0] === 3 && shape[1] === 6 ? 'diminished' : shape[0] === 4 && shape[1] === 8 ? 'augmented' : 'major'
    const numeral = quality === 'minor' || quality === 'diminished' ? roman[degree].toLowerCase() : roman[degree]
    const suffix = quality === 'diminished' ? '°' : quality === 'augmented' ? '+' : ''
    return { name: `${numeral}${suffix}`, notes: notes.map(midiToNote) }
  })
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
  return {
    ...step,
    notes: [...step.notes],
    probability: step.probability ?? 1,
    ratchets: step.ratchets ?? 1,
    microShift: step.microShift ?? 0,
  }
}

export function clonePattern(pattern: Pattern): Pattern {
  const stepCount = pattern.steps.length || DEFAULT_STEP_COUNT
  const lane = (target: AutomationTarget) => Array.from({ length: stepCount }, (_, index) => pattern.automation[target]?.[index] ?? null)
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
  const stepCount = normalizeStepCount(composition.stepCount ?? composition.patterns?.[0]?.steps.length ?? DEFAULT_STEP_COUNT)
  const legacyArrangement = (composition.arrangement ?? []) as unknown as Array<PatternId | Partial<ArrangementOccurrence>>
  const arrangement = legacyArrangement.slice(0, 16).map((occurrence) => normalizeArrangementOccurrence(occurrence, composition.activePatternId ?? 'A'))
  return {
    ...composition,
    formatVersion: FORMAT_VERSION,
    world: composition.world ?? 'darkwave',
    styleVersion: composition.styleVersion ?? 1,
    styleInfluences: (composition.styleInfluences ?? []).map((influence) => ({ ...influence, amount: clamp(influence.amount, 0, 1) })),
    meter: METERS.includes(composition.meter) ? composition.meter : '4/4',
    scaleRoot: SCALE_ROOTS.includes(composition.scaleRoot as (typeof SCALE_ROOTS)[number]) ? composition.scaleRoot : 'C',
    scaleMode: SCALE_MODES.includes(composition.scaleMode) ? composition.scaleMode : 'minor',
    stepCount,
    swing: clamp(composition.swing ?? 0, 0, 0.75),
    sound: { ...DEFAULT_SOUND_SETTINGS, ...composition.sound },
    voices: {
      chords: normalizeVoice('chords', composition.voices?.chords),
      bass: normalizeVoice('bass', composition.voices?.bass),
      pulse: normalizeVoice('pulse', composition.voices?.pulse),
      texture: normalizeVoice('texture', composition.voices?.texture),
    },
    patterns: composition.patterns.map((pattern) => resizePattern(clonePattern(pattern), stepCount)),
    arrangement: arrangement.length ? arrangement : [makeArrangementOccurrence(composition.activePatternId ?? 'A')],
  }
}

function normalizeVoice(id: VoiceId, input: VoiceSettings | undefined): VoiceSettings {
  const legacy = (input ?? {}) as VoiceSettings & { core?: Waveform; detune?: number }
  const defaults = makeVoiceSettings(id, id === 'bass' ? { cutoff: 950, volume: -9 } : id === 'pulse' ? { cutoff: 2100, volume: -16 } : id === 'texture' ? { cutoff: 1400, volume: -22 } : {})
  const primary = legacy.layers?.primary ?? makeVoiceLayer(id, 'primary', { waveform: legacy.core ?? defaults.layers.primary.waveform, detune: legacy.detune ?? 0 })
  const shadow = legacy.layers?.shadow ?? makeVoiceLayer(id, 'shadow')
  const channel = { ...legacy } as unknown as Record<string, unknown>
  delete channel.core
  delete channel.detune
  delete channel.layers
  delete channel.patchId
  return {
    ...defaults,
    ...channel,
    patchId: legacy.patchId ?? null,
    layers: {
      primary: normalizeLayer(id, 'primary', primary),
      shadow: normalizeLayer(id, 'shadow', shadow),
    },
  }
}

function normalizeLayer(id: VoiceId, slot: LayerSlot, input: VoiceLayerSettings): VoiceLayerSettings {
  const fallback = makeVoiceLayer(id, slot)
  const engine = isEngineCompatible(id, input.engine) ? input.engine : fallback.engine
  return {
    ...fallback,
    ...input,
    enabled: slot === 'primary' ? true : Boolean(input.enabled),
    engine,
    octave: Math.round(clamp(input.octave ?? 0, -2, 2)),
    detune: clamp(input.detune ?? 0, -100, 100),
    level: clamp(input.level ?? fallback.level, -36, 0),
    character: clamp(input.character ?? fallback.character, 0, 1),
    attackScale: clamp(input.attackScale ?? 1, 0.25, 4),
    releaseScale: clamp(input.releaseScale ?? 1, 0.25, 4),
  }
}

export function normalizeStepCount(value: number): number {
  const rounded = Math.round(value)
  return STEP_COUNT_OPTIONS.includes(rounded as (typeof STEP_COUNT_OPTIONS)[number]) ? rounded : DEFAULT_STEP_COUNT
}

export function resizePattern(pattern: Pattern, stepCount: number): Pattern {
  const count = normalizeStepCount(stepCount)
  const next = clonePatternWithoutResize(pattern)
  next.steps = Array.from({ length: count }, (_, index) => index < next.steps.length ? cloneStep(next.steps[index]) : makeEmptyStep())
  for (const target of Object.keys(next.automation) as AutomationTarget[]) {
    next.automation[target] = Array.from({ length: count }, (_, index) => next.automation[target][index] ?? null)
  }
  return next
}

function clonePatternWithoutResize(pattern: Pattern): Pattern {
  const lanes = makeAutomationLanes(pattern.steps.length || DEFAULT_STEP_COUNT)
  for (const target of Object.keys(lanes) as AutomationTarget[]) lanes[target] = [...(pattern.automation[target] ?? lanes[target])]
  return { ...pattern, steps: pattern.steps.map(cloneStep), automation: lanes }
}

export function resizeComposition(composition: Composition, stepCount: number): Composition {
  const count = normalizeStepCount(stepCount)
  const next = cloneComposition(composition)
  next.stepCount = count
  next.patterns = next.patterns.map((pattern) => resizePattern(pattern, count))
  return next
}

export function stepsPerBeat(meter: Meter): number {
  return meter.endsWith('/8') ? 2 : 4
}

export function meterParts(meter: Meter): [number, number] {
  const [beats, denominator] = meter.split('/').map(Number)
  return [beats, denominator]
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
  const stepCount = next.steps.length
  const normalized = ((offset % stepCount) + stepCount) % stepCount
  next.steps = [...next.steps.slice(-normalized), ...next.steps.slice(0, -normalized)]
  for (const target of Object.keys(next.automation) as AutomationTarget[]) {
    const lane = next.automation[target]
    next.automation[target] = [...lane.slice(-normalized), ...lane.slice(0, -normalized)]
  }
  return next
}
