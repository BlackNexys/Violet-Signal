import {
  PATTERN_IDS,
  applyVoiceRecipe,
  clamp,
  cloneComposition,
  cloneStep,
  makeArrangementOccurrence,
  makeEmptyComposition,
  rotatePattern,
  transposePattern,
  type Composition,
  type PatternId,
  type Step,
  type VoiceId,
  type VoiceRecipe,
} from './composition'

type StepInput = Partial<Step>
const sceneValue = (value: number, minimum: number, maximum: number) => Number(clamp(value, minimum, maximum).toFixed(3))

function buildScene(details: {
  id: string
  name: string
  world: Composition['world']
  bpm: number
  seed: number
  scaleRoot: string
  masterVolume: number
  sound: Partial<Composition['sound']>
  chordVoice?: VoiceRecipe
  voices?: Partial<Record<VoiceId, VoiceRecipe>>
  arrangement?: PatternId[]
  steps: StepInput[]
}): Composition {
  const base = makeEmptyComposition()
  base.id = details.id
  base.name = details.name
  base.world = details.world
  base.bpm = details.bpm
  base.seed = details.seed
  base.scaleRoot = details.scaleRoot
  base.masterVolume = details.masterVolume
  base.sound = { ...base.sound, ...details.sound }
  base.voices.chords = applyVoiceRecipe(base.voices.chords, details.chordVoice ?? {}, 'chords')
  for (const [id, settings] of Object.entries(details.voices ?? {}) as Array<[VoiceId, VoiceRecipe]>) {
    base.voices[id] = applyVoiceRecipe(base.voices[id], settings, id)
  }
  const patternA = base.patterns[0]
  patternA.steps = patternA.steps.map((step, index) => ({
    ...step,
    ...(details.steps[index] ?? {}),
    notes: [...(details.steps[index]?.notes ?? step.notes)],
  }))
  patternA.automation.mask[0] = base.voices.chords.cutoff
  patternA.automation.mask[8] = sceneValue(base.voices.chords.cutoff * 1.35, 80, 12000)
  patternA.automation.memory[0] = base.sound.memory
  patternA.automation.memory[12] = sceneValue(base.sound.memory + 0.12, 0, 1)
  patternA.automation.veil[0] = base.sound.veil
  patternA.automation.veil[8] = sceneValue(base.sound.veil + 0.16, 0, 1)
  patternA.automation.fracture[0] = base.sound.fracture
  patternA.automation.fracture[12] = sceneValue(base.sound.fracture + 0.16, 0, 1)
  patternA.automation.ghost[0] = base.sound.ghost
  patternA.automation.ghost[8] = sceneValue(base.sound.ghost + 0.12, 0, 1)
  patternA.automation.overclock[0] = base.sound.overclock
  patternA.automation.overclock[12] = sceneValue(base.sound.overclock + 0.14, 0, 1)
  const patternB = rotatePattern(patternA, 2)
  patternB.id = 'B'
  patternB.name = 'Pattern B'
  const patternC = transposePattern(patternA, details.scaleRoot === 'F' ? 5 : 3)
  patternC.id = 'C'
  patternC.name = 'Pattern C'
  patternC.steps = patternC.steps.map((step, index) => index % 2 === 0 ? cloneStep(step) : { ...cloneStep(step), drum: false, texture: false })
  const patternD = rotatePattern(patternA, -4)
  patternD.id = 'D'
  patternD.name = 'Pattern D'
  patternD.steps.forEach((step, index) => {
    if (index % 4 !== 0) step.notes = []
    if (index % 2 !== 0) step.bass = null
  })
  base.patterns = PATTERN_IDS.map((id) => ({ A: patternA, B: patternB, C: patternC, D: patternD })[id])
  base.arrangement = (details.arrangement ?? ['A', 'A', 'B', 'C']).map(makeArrangementOccurrence)
  return base
}

const VEIL_COMMUNION = buildScene({
  id: 'veil-communion', name: 'Veil Communion', world: 'witch-house', bpm: 68, seed: 713, scaleRoot: 'F#', masterVolume: -14,
  sound: { memory: 0.52, environment: 0.7, veil: 0.46, fracture: 0.18, ghost: 0.28, humanize: 0.024, overclock: 0.08 },
  voices: {
    chords: { core: 'sawtooth', cutoff: 2050, attack: 0.18, decay: 0.9, sustain: 0.68, release: 3.6, volume: -14 },
    bass: { core: 'square', cutoff: 560, attack: 0.012, decay: 0.48, sustain: 0.7, release: 1.1, volume: -8 },
    pulse: { core: 'sine', cutoff: 1350, attack: 0.005, decay: 0.17, sustain: 0, release: 0.1, volume: -13 },
    texture: { core: 'triangle', cutoff: 920, attack: 0.16, decay: 1.4, sustain: 0.16, release: 3, volume: -19 },
  },
  arrangement: ['A', 'A', 'B', 'A', 'C', 'B', 'D', 'A'],
  steps: [
    { notes: ['F#3', 'A3', 'C#4', 'E4'], bass: 'F#1', drum: true, velocity: 0.9, chordLength: 8, bassLength: 8 }, {},
    { texture: true, velocity: 0.34 }, { drum: true, velocity: 0.38 }, {}, {}, { drum: true, velocity: 0.58 }, {},
    { notes: ['D3', 'F#3', 'A3', 'C#4'], bass: 'D2', drum: true, velocity: 0.8, chordLength: 8, bassLength: 8 }, {},
    { texture: true, velocity: 0.3 }, { drum: true, velocity: 0.42 }, {}, {}, { drum: true, velocity: 0.66 }, { texture: true, velocity: 0.26 },
  ],
})

const MIDNIGHT_VECTOR = buildScene({
  id: 'midnight-vector', name: 'Midnight Vector', world: 'darksynth', bpm: 112, seed: 1984, scaleRoot: 'E', masterVolume: -13,
  sound: { memory: 0.2, environment: 0.2, veil: 0.24, fracture: 0.08, ghost: 0.08, humanize: 0.012, overclock: 0.38 },
  voices: {
    chords: { core: 'sawtooth', cutoff: 5200, attack: 0.008, decay: 0.18, sustain: 0.34, release: 0.24, volume: -13 },
    bass: { core: 'sawtooth', cutoff: 940, attack: 0.005, decay: 0.14, sustain: 0.48, release: 0.16, volume: -8 },
    pulse: { core: 'square', cutoff: 2900, attack: 0.005, decay: 0.11, sustain: 0, release: 0.05, volume: -13 },
    texture: { core: 'sawtooth', cutoff: 2600, attack: 0.012, decay: 0.22, sustain: 0, release: 0.32, volume: -23 },
  },
  arrangement: ['A', 'A', 'B', 'B', 'C', 'B', 'D', 'C'],
  steps: [
    { notes: ['E4'], bass: 'E2', drum: true, velocity: 0.92 }, {}, { notes: ['G4'], bass: 'E2', velocity: 0.68 }, {},
    { notes: ['B4'], bass: 'B1', drum: true, velocity: 0.84 }, {}, { notes: ['D5'], bass: 'B1', drum: true, velocity: 0.62 }, { texture: true, velocity: 0.3 },
    { notes: ['C5'], bass: 'C2', drum: true, velocity: 0.88 }, {}, { notes: ['B4'], bass: 'C2', velocity: 0.66 }, {},
    { notes: ['G4'], bass: 'D2', drum: true, velocity: 0.82 }, {}, { notes: ['F#4'], bass: 'D2', drum: true, velocity: 0.64 }, { texture: true, velocity: 0.34 },
  ],
})

const COLD_CIRCUIT = buildScene({
  id: 'cold-circuit', name: 'Cold Circuit', world: 'darkwave', bpm: 104, seed: 1017, scaleRoot: 'A', masterVolume: -12,
  sound: { memory: 0.34, environment: 0.4, veil: 0.72, fracture: 0.02, ghost: 0.1, humanize: 0.034, overclock: 0.12 },
  voices: {
    chords: { core: 'triangle', cutoff: 3400, attack: 0.06, decay: 0.48, sustain: 0.56, release: 1.8, volume: -12 },
    bass: { core: 'square', cutoff: 760, attack: 0.008, decay: 0.25, sustain: 0.58, release: 0.42, volume: -8 },
    pulse: { core: 'sine', cutoff: 2200, attack: 0.005, decay: 0.1, sustain: 0, release: 0.05, volume: -15 },
    texture: { core: 'triangle', cutoff: 1700, attack: 0.08, decay: 0.52, sustain: 0.08, release: 1.4, volume: -24 },
  },
  arrangement: ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'C'],
  steps: [
    { notes: ['A3', 'C4', 'E4', 'G4'], bass: 'A1', drum: true, velocity: 0.8, chordLength: 4, bassLength: 2 }, {}, { bass: 'A1', velocity: 0.54 }, {},
    { notes: ['F3', 'A3', 'C4', 'E4'], bass: 'F2', drum: true, velocity: 0.74, chordLength: 4, bassLength: 2 }, {}, { bass: 'F2', drum: true, velocity: 0.5 }, {},
    { notes: ['C4', 'E4', 'G4', 'B4'], bass: 'C2', drum: true, velocity: 0.76, chordLength: 4, bassLength: 2 }, {}, { bass: 'C2', texture: true, velocity: 0.48 }, {},
    { notes: ['G3', 'B3', 'D4', 'F4'], bass: 'G1', drum: true, velocity: 0.78, chordLength: 4, bassLength: 2 }, {}, { bass: 'G1', drum: true, velocity: 0.52 }, {},
  ],
})

const FRACTURED_BROADCAST = buildScene({
  id: 'fractured-broadcast', name: 'Fractured Broadcast', world: 'glitch', bpm: 136, seed: 4049, scaleRoot: 'D', masterVolume: -15,
  sound: { memory: 0.14, environment: 0.12, veil: 0.1, fracture: 0.68, ghost: 0.56, humanize: 0.12, overclock: 0.24 },
  voices: {
    chords: { core: 'square', cutoff: 6500, attack: 0.005, decay: 0.09, sustain: 0.08, release: 0.08, volume: -16 },
    bass: { core: 'square', cutoff: 1320, attack: 0.005, decay: 0.1, sustain: 0.34, release: 0.1, volume: -10 },
    pulse: { core: 'square', cutoff: 3900, attack: 0.005, decay: 0.055, sustain: 0, release: 0.04, volume: -17 },
    texture: { core: 'sawtooth', cutoff: 4700, attack: 0.005, decay: 0.13, sustain: 0, release: 0.18, volume: -20 },
  },
  arrangement: ['A', 'B', 'D', 'A', 'C', 'D', 'B', 'D'],
  steps: [
    { notes: ['D4', 'F4'], bass: 'D2', drum: true, velocity: 0.92 }, { texture: true, velocity: 0.28 }, {},
    { notes: ['Ab4'], drum: true, velocity: 0.48 }, { bass: 'D2', velocity: 0.66 }, {}, { drum: true, texture: true, velocity: 0.78 },
    { notes: ['C5'], velocity: 0.34 }, { bass: 'Bb1', drum: true, velocity: 0.88 }, {}, { texture: true, velocity: 0.3 },
    { notes: ['E4', 'F4'], drum: true, velocity: 0.58 }, { bass: 'C2', velocity: 0.7 }, { drum: true, velocity: 0.32 }, {},
    { notes: ['A3'], drum: true, texture: true, velocity: 0.82 },
  ],
})

const RAIN_BEHIND_GLASS = buildScene({
  id: 'rain-behind-glass', name: 'Rain Behind Glass', world: 'darkwave', bpm: 76, seed: 2407, scaleRoot: 'C', masterVolume: -12,
  sound: { memory: 0.42, environment: 0.34, veil: 0.56, fracture: 0.02, ghost: 0.08, humanize: 0.018 },
  chordVoice: { core: 'triangle', cutoff: 2550, attack: 0.12, decay: 0.62, sustain: 0.64, release: 2.2 },
  steps: [
    { notes: ['C4', 'Eb4', 'G4', 'Bb4'], bass: 'C2', velocity: 0.72, chordLength: 4, bassLength: 4 }, {},
    { drum: true, texture: true, velocity: 0.42 }, {},
    { notes: ['Ab3', 'C4', 'Eb4', 'G4'], bass: 'Ab1', velocity: 0.64, chordLength: 4, bassLength: 4 }, {},
    { drum: true, velocity: 0.36 }, {},
    { notes: ['F3', 'Ab3', 'C4', 'Eb4'], bass: 'F2', velocity: 0.68, chordLength: 4, bassLength: 4 }, {},
    { drum: true, texture: true, velocity: 0.4 }, {},
    { notes: ['G3', 'Bb3', 'D4', 'F4'], bass: 'G1', velocity: 0.66, chordLength: 4, bassLength: 4 }, {},
    { drum: true, velocity: 0.32 }, {},
  ],
})

const STATIC_NERVES = buildScene({
  id: 'static-nerves', name: 'Static Nerves', world: 'glitch', bpm: 124, seed: 9013, scaleRoot: 'D', masterVolume: -13,
  sound: { memory: 0.16, environment: 0.1, veil: 0.08, fracture: 0.52, ghost: 0.32, humanize: 0.052, overclock: 0.18 },
  chordVoice: { core: 'square', cutoff: 4100, attack: 0.008, decay: 0.16, sustain: 0.22, release: 0.18 },
  steps: [
    { notes: ['D4', 'F4', 'A4'], bass: 'D2', drum: true, velocity: 0.88 }, { drum: true, velocity: 0.35 }, {},
    { drum: true, texture: true, velocity: 0.62 }, { bass: 'D2', velocity: 0.74 }, {},
    { notes: ['C4', 'D4', 'F4'], drum: true, velocity: 0.72 }, { drum: true, velocity: 0.38 },
    { bass: 'Bb1', drum: true, texture: true, velocity: 0.9 }, {}, { drum: true, velocity: 0.56 },
    { notes: ['A3', 'C4', 'E4'], velocity: 0.58 }, { bass: 'C2', drum: true, velocity: 0.76 },
    { drum: true, velocity: 0.34 }, {}, { drum: true, texture: true, velocity: 0.68 },
  ],
})

const BLUES_BLACK_MOON = buildScene({
  id: 'blues-on-a-black-moon', name: 'Blues on a Black Moon', world: 'darkwave', bpm: 88, seed: 6119, scaleRoot: 'F', masterVolume: -11,
  sound: { memory: 0.24, environment: 0.2, veil: 0.38, fracture: 0.04, ghost: 0.14, humanize: 0.038, overclock: 0.08 },
  chordVoice: { core: 'sine', cutoff: 3200, attack: 0.025, decay: 0.72, sustain: 0.42, release: 1.35 },
  steps: [
    { notes: ['F3', 'Ab3', 'C4', 'Eb4'], bass: 'F2', velocity: 0.82, chordLength: 4 }, {},
    { drum: true, velocity: 0.38 }, { bass: 'C2', velocity: 0.58 },
    { notes: ['Bb3', 'Db4', 'F4', 'Ab4'], bass: 'Bb1', drum: true, velocity: 0.76, chordLength: 4 }, {},
    { drum: true, texture: true, velocity: 0.44 }, { bass: 'B1', velocity: 0.54 },
    { notes: ['F3', 'A3', 'C4', 'Eb4'], bass: 'C2', velocity: 0.72, chordLength: 2 }, {},
    { notes: ['Db4', 'F4', 'Ab4', 'C5'], drum: true, velocity: 0.7 }, {},
    { notes: ['C4', 'Eb4', 'G4', 'Bb4'], bass: 'C2', drum: true, velocity: 0.74, chordLength: 4 }, {},
    { drum: true, texture: true, velocity: 0.4 }, { bass: 'E2', velocity: 0.48 },
  ],
})

export const scenes = [VEIL_COMMUNION, MIDNIGHT_VECTOR, COLD_CIRCUIT, FRACTURED_BROADCAST, RAIN_BEHIND_GLASS, STATIC_NERVES, BLUES_BLACK_MOON] as const

export function getScene(id: string): Composition {
  return cloneComposition(scenes.find((item) => item.id === id) ?? scenes[0])
}
