import {
  PATTERN_IDS,
  chordSuggestions,
  clamp,
  cloneComposition,
  defaultBass,
  getPattern,
  noteToMidi,
  resizeComposition,
  transposeNote,
  type Composition,
  type Meter,
  type PatternId,
  type ScaleMode,
  type SoundSettings,
  type StyleId,
  type VoiceId,
  type VoiceSettings,
} from './composition'

export type StyleFamily = 'atmospheric' | 'wave' | 'club' | 'breakbeat' | 'industrial' | 'retro' | 'experimental' | 'cinematic'

export interface StyleDefinition {
  id: StyleId
  version: number
  label: string
  family: StyleFamily
  tags: string[]
  description: string
  tempo: { min: number; max: number; preferred: number }
  timing: { meter: Meter; stepCount: number; swing: number }
  harmony: { mode: ScaleMode; chordDensity: number }
  sound: Partial<SoundSettings>
  voices: Partial<Record<VoiceId, Partial<VoiceSettings>>>
  rhythm: {
    pulse: number[]
    texture: number[]
    chords: number[]
    bass: number[]
    probability?: number
    ratchets?: number
    microShift?: number
  }
  arrangement: PatternId[]
}

export interface StyleInfluence { id: StyleId; amount: number }
export interface StylePreserve {
  tempo: boolean
  timing: boolean
  harmony: boolean
  patterns: boolean
  arrangement: boolean
  voices: boolean
  effects: boolean
}

export const DEFAULT_STYLE_PRESERVE: StylePreserve = {
  tempo: false,
  timing: false,
  harmony: true,
  patterns: true,
  arrangement: true,
  voices: false,
  effects: false,
}

const baseVoices: StyleDefinition['voices'] = {
  chords: { core: 'triangle', filterType: 'lowpass', cutoff: 3000, resonance: 0.8, attack: 0.05, decay: 0.4, sustain: 0.58, release: 1.3, detune: 0, glide: 0, volume: -11 },
  bass: { core: 'sawtooth', filterType: 'lowpass', cutoff: 900, resonance: 1.4, attack: 0.008, decay: 0.24, sustain: 0.5, release: 0.45, detune: 0, glide: 0.03, volume: -9 },
  pulse: { core: 'sine', filterType: 'lowpass', cutoff: 2400, resonance: 0.7, attack: 0.005, decay: 0.1, sustain: 0, release: 0.05, detune: 0, glide: 0, volume: -15 },
  texture: { core: 'triangle', filterType: 'bandpass', cutoff: 1800, resonance: 1.2, attack: 0.06, decay: 0.55, sustain: 0.08, release: 1.5, detune: 0, glide: 0, volume: -23 },
}

const common = {
  version: 1,
  tempo: { min: 70, max: 130, preferred: 100 },
  timing: { meter: '4/4' as Meter, stepCount: 16, swing: 0 },
  harmony: { mode: 'minor' as ScaleMode, chordDensity: 0.5 },
  sound: { memory: 0.25, environment: 0.25, veil: 0.2, fracture: 0.02, ghost: 0.08, humanize: 0.02, overclock: 0.08 },
  voices: baseVoices,
  rhythm: { pulse: [0, 4, 8, 12], texture: [6, 14], chords: [0, 8], bass: [0, 4, 8, 12] },
  arrangement: ['A', 'A', 'B', 'C'] as PatternId[],
}

function defineStyle(definition: Omit<StyleDefinition, 'version'> & { version?: number }): StyleDefinition {
  return { ...definition, version: definition.version ?? 1 }
}

export const STYLE_DEFINITIONS: StyleDefinition[] = [
  defineStyle({ ...common, id: 'ambient', label: 'Ambient', family: 'atmospheric', tags: ['slow', 'spatial', 'generative'], description: 'Long envelopes, sparse events, wide space, and gently shifting texture.', tempo: { min: 40, max: 100, preferred: 68 }, timing: { meter: '4/4', stepCount: 32, swing: 0.06 }, sound: { memory: 0.54, environment: 0.82, veil: 0.62, fracture: 0.02, ghost: 0.18, humanize: 0.055, overclock: 0.02 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'sine', attack: 0.9, release: 4.6, cutoff: 2400 }, bass: { ...baseVoices.bass, core: 'sine', attack: 0.15, release: 2.4, cutoff: 520 }, texture: { ...baseVoices.texture, attack: 0.8, release: 4.8, volume: -19 } }, rhythm: { pulse: [], texture: [3, 11], chords: [0, 8], bass: [0, 8], probability: 0.82 }, arrangement: ['A', 'B', 'A', 'C', 'D', 'A'] }),
  defineStyle({ ...common, id: 'berlin-school', label: 'Berlin School', family: 'atmospheric', tags: ['sequenced', 'analog', 'hypnotic'], description: 'Long-form analog pulses, repeating bass figures, and slowly opening filters.', tempo: { min: 80, max: 130, preferred: 104 }, timing: { meter: '4/4', stepCount: 32, swing: 0.03 }, sound: { memory: 0.46, environment: 0.48, veil: 0.34, fracture: 0, ghost: 0.08, humanize: 0.018, overclock: 0.14 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'sawtooth', attack: 0.25, release: 2.8 }, bass: { ...baseVoices.bass, core: 'square', cutoff: 1180, resonance: 2.4, glide: 0.08 } }, rhythm: { pulse: [0, 4, 8, 12], texture: [7, 15], chords: [0, 8], bass: [0, 2, 4, 6, 8, 10, 12, 14], probability: 0.96 }, arrangement: ['A', 'A', 'B', 'A', 'C', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'synthpop', label: 'Synthpop', family: 'wave', tags: ['melodic', 'pop', 'bright'], description: 'Compact hooks, clear backbeats, bright chords, and supportive melodic bass.', tempo: { min: 92, max: 132, preferred: 116 }, timing: { meter: '4/4', stepCount: 16, swing: 0.02 }, harmony: { mode: 'major', chordDensity: 0.72 }, sound: { memory: 0.24, environment: 0.26, veil: 0.42, fracture: 0, ghost: 0.03, humanize: 0.016, overclock: 0.12 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'sawtooth', cutoff: 5200, attack: 0.018, release: 0.75, detune: 5 }, bass: { ...baseVoices.bass, core: 'square', cutoff: 1100 } }, rhythm: { pulse: [0, 4, 8, 12], texture: [2, 6, 10, 14], chords: [0, 4, 8, 12], bass: [0, 2, 4, 6, 8, 10, 12, 14] }, arrangement: ['A', 'A', 'B', 'C', 'A', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'new-wave', label: 'New Wave', family: 'wave', tags: ['angular', 'post-punk', 'machine'], description: 'Angular chord stabs, dry machine rhythm, and wiry melodic movement.', tempo: { min: 100, max: 150, preferred: 126 }, timing: { meter: '4/4', stepCount: 16, swing: 0.035 }, sound: { memory: 0.18, environment: 0.2, veil: 0.32, fracture: 0.04, ghost: 0.06, humanize: 0.024, overclock: 0.16 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'square', filterType: 'bandpass', cutoff: 3800, resonance: 1.8, attack: 0.008, release: 0.32 }, bass: { ...baseVoices.bass, core: 'sawtooth', cutoff: 1350 } }, rhythm: { pulse: [0, 4, 8, 12], texture: [6, 14], chords: [0, 3, 8, 11], bass: [0, 3, 4, 7, 8, 11, 12, 15] }, arrangement: ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'darkwave', label: 'Darkwave', family: 'wave', tags: ['cold', 'minor', 'chorused'], description: 'Cold chorus width, minor harmony, and a restrained machine pulse.', tempo: { min: 78, max: 124, preferred: 104 }, timing: { meter: '4/4', stepCount: 16, swing: 0.035 }, sound: { memory: 0.34, environment: 0.4, veil: 0.72, fracture: 0.02, ghost: 0.1, humanize: 0.034, overclock: 0.12 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'triangle', cutoff: 3400, attack: 0.06, release: 1.8 }, bass: { ...baseVoices.bass, core: 'square', cutoff: 760 } }, rhythm: { pulse: [0, 4, 8, 12], texture: [10], chords: [0, 4, 8, 12], bass: [0, 2, 4, 6, 8, 10, 12, 14] }, arrangement: ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'witch-house', label: 'Witch House', family: 'wave', tags: ['slow', 'ritual', 'damaged'], description: 'Slowed ritual pulse, cavernous tails, and damaged minor-key haze.', tempo: { min: 55, max: 88, preferred: 68 }, timing: { meter: '4/4', stepCount: 16, swing: 0.06 }, sound: { memory: 0.52, environment: 0.7, veil: 0.46, fracture: 0.18, ghost: 0.28, humanize: 0.04, overclock: 0.08 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'sawtooth', cutoff: 2050, attack: 0.18, release: 3.6, detune: -5 }, bass: { ...baseVoices.bass, core: 'square', cutoff: 560, release: 1.1 } }, rhythm: { pulse: [0, 6, 8, 14], texture: [2, 10, 15], chords: [0, 8], bass: [0, 8], probability: 0.92, microShift: 0.04 }, arrangement: ['A', 'A', 'B', 'A', 'C', 'B', 'D', 'A'] }),
  defineStyle({ ...common, id: 'synthwave', label: 'Synthwave', family: 'retro', tags: ['cinematic', 'retro', 'driving'], description: 'Wide analog chords, octave motion, and a polished cinematic backbeat.', tempo: { min: 88, max: 128, preferred: 108 }, timing: { meter: '4/4', stepCount: 16, swing: 0.015 }, sound: { memory: 0.3, environment: 0.38, veil: 0.52, fracture: 0, ghost: 0.04, humanize: 0.014, overclock: 0.2 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'sawtooth', cutoff: 4600, detune: 8, release: 1.4 }, bass: { ...baseVoices.bass, core: 'sawtooth', cutoff: 1050 } }, rhythm: { pulse: [0, 4, 8, 12], texture: [4, 12], chords: [0, 4, 8, 12], bass: [0, 2, 4, 6, 8, 10, 12, 14] }, arrangement: ['A', 'A', 'B', 'C', 'A', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'darksynth', label: 'Darksynth', family: 'retro', tags: ['driven', 'aggressive', 'cinematic'], description: 'Driven bass motion, bright saw edges, and controlled cinematic pressure.', tempo: { min: 100, max: 145, preferred: 116 }, timing: { meter: '4/4', stepCount: 16, swing: 0.01 }, sound: { memory: 0.2, environment: 0.2, veil: 0.24, fracture: 0.08, ghost: 0.08, humanize: 0.012, overclock: 0.38 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'sawtooth', cutoff: 5600, attack: 0.008, release: 0.24, detune: 6 }, bass: { ...baseVoices.bass, core: 'sawtooth', cutoff: 980, resonance: 2.2 } }, rhythm: { pulse: [0, 4, 6, 8, 12, 14], texture: [7, 15], chords: [0, 2, 4, 6, 8, 10, 12, 14], bass: [0, 2, 4, 6, 8, 10, 12, 14] }, arrangement: ['A', 'A', 'B', 'B', 'C', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'house', label: 'House', family: 'club', tags: ['four-on-floor', 'swing', 'warm'], description: 'Four-on-the-floor weight, offbeat motion, and a warm pocket of swing.', tempo: { min: 112, max: 132, preferred: 124 }, timing: { meter: '4/4', stepCount: 16, swing: 0.14 }, harmony: { mode: 'minor', chordDensity: 0.5 }, sound: { memory: 0.16, environment: 0.2, veil: 0.24, fracture: 0, ghost: 0.04, humanize: 0.018, overclock: 0.12 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'square', filterType: 'bandpass', cutoff: 4300, attack: 0.008, release: 0.25 }, bass: { ...baseVoices.bass, core: 'sine', cutoff: 720, release: 0.24 } }, rhythm: { pulse: [0, 4, 8, 12], texture: [2, 6, 10, 14], chords: [2, 6, 10, 14], bass: [0, 3, 6, 8, 11, 14], microShift: 0.02 }, arrangement: ['A', 'A', 'B', 'A', 'C', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'techno', label: 'Techno', family: 'club', tags: ['hypnotic', 'driving', 'minimal'], description: 'Repetitive machine pulse, restrained harmony, and evolving timbral pressure.', tempo: { min: 120, max: 150, preferred: 132 }, timing: { meter: '4/4', stepCount: 16, swing: 0.04 }, sound: { memory: 0.14, environment: 0.18, veil: 0.08, fracture: 0.1, ghost: 0.1, humanize: 0.01, overclock: 0.3 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'square', filterType: 'bandpass', cutoff: 3200, resonance: 3.2, attack: 0.005, release: 0.12 }, bass: { ...baseVoices.bass, core: 'sawtooth', cutoff: 780, resonance: 3.8, release: 0.16 } }, rhythm: { pulse: [0, 4, 8, 12], texture: [2, 6, 10, 14], chords: [3, 11], bass: [0, 3, 6, 8, 11, 14], probability: 0.96 }, arrangement: ['A', 'A', 'B', 'A', 'C', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'acid', label: 'Acid', family: 'club', tags: ['resonant', 'sequenced', '303'], description: 'Resonant mono sequences, short accents, glide, and insistent club rhythm.', tempo: { min: 118, max: 150, preferred: 130 }, timing: { meter: '4/4', stepCount: 16, swing: 0.09 }, sound: { memory: 0.12, environment: 0.1, veil: 0.04, fracture: 0.06, ghost: 0.08, humanize: 0.012, overclock: 0.28 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'square', cutoff: 2600, release: 0.12 }, bass: { ...baseVoices.bass, core: 'sawtooth', cutoff: 1450, resonance: 7.5, decay: 0.15, sustain: 0.18, release: 0.12, glide: 0.14 } }, rhythm: { pulse: [0, 4, 8, 12], texture: [6, 14], chords: [], bass: [0, 1, 3, 4, 6, 7, 9, 10, 12, 14, 15], probability: 0.94, ratchets: 2 }, arrangement: ['A', 'A', 'B', 'A', 'C', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'trance', label: 'Trance', family: 'club', tags: ['uplifting', 'arpeggiated', 'wide'], description: 'Extended harmonic motion, bright repeated figures, and a wide driving pulse.', tempo: { min: 125, max: 145, preferred: 136 }, timing: { meter: '4/4', stepCount: 32, swing: 0.01 }, sound: { memory: 0.34, environment: 0.42, veil: 0.58, fracture: 0, ghost: 0.04, humanize: 0.008, overclock: 0.22 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'sawtooth', cutoff: 6200, attack: 0.012, release: 0.55, detune: 9 }, bass: { ...baseVoices.bass, core: 'sawtooth', cutoff: 920, release: 0.18 } }, rhythm: { pulse: [0, 4, 8, 12], texture: [2, 6, 10, 14], chords: [0, 2, 4, 6, 8, 10, 12, 14], bass: [0, 3, 4, 7, 8, 11, 12, 15], ratchets: 1 }, arrangement: ['A', 'A', 'B', 'C', 'A', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'electro', label: 'Electro / Breakbeat', family: 'breakbeat', tags: ['syncopated', 'robotic', 'broken'], description: 'Syncopated machine rhythm, clipped bass, and bright robotic punctuation.', tempo: { min: 105, max: 140, preferred: 124 }, timing: { meter: '4/4', stepCount: 16, swing: 0.08 }, sound: { memory: 0.16, environment: 0.14, veil: 0.12, fracture: 0.12, ghost: 0.12, humanize: 0.018, overclock: 0.24 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'square', filterType: 'highpass', cutoff: 1900, attack: 0.005, release: 0.16 }, bass: { ...baseVoices.bass, core: 'square', cutoff: 1050, glide: 0.06 } }, rhythm: { pulse: [0, 3, 6, 8, 11, 14], texture: [2, 7, 10, 15], chords: [3, 11], bass: [0, 3, 6, 8, 10, 13, 15], probability: 0.95, microShift: 0.025 }, arrangement: ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'drum-and-bass', label: 'Drum & Bass', family: 'breakbeat', tags: ['fast', 'breaks', 'sub'], description: 'Fast broken rhythm, deep sub movement, and sharply controlled harmonic space.', tempo: { min: 155, max: 180, preferred: 172 }, timing: { meter: '4/4', stepCount: 16, swing: 0.05 }, sound: { memory: 0.12, environment: 0.16, veil: 0.08, fracture: 0.12, ghost: 0.18, humanize: 0.014, overclock: 0.3 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'square', filterType: 'highpass', cutoff: 3200, release: 0.18 }, bass: { ...baseVoices.bass, core: 'sine', cutoff: 620, release: 0.28, glide: 0.09, volume: -7 } }, rhythm: { pulse: [0, 3, 6, 8, 10, 14], texture: [2, 5, 7, 11, 13, 15], chords: [0, 8], bass: [0, 5, 8, 11, 14], probability: 0.95, ratchets: 2 }, arrangement: ['A', 'B', 'A', 'C', 'B', 'D', 'A', 'C'] }),
  defineStyle({ ...common, id: 'hip-hop', label: 'Hip-Hop / Trap', family: 'breakbeat', tags: ['half-time', 'sub', 'swung'], description: 'Half-time impact, deep sub notes, swung detail, and sparse harmonic punctuation.', tempo: { min: 60, max: 160, preferred: 78 }, timing: { meter: '4/4', stepCount: 16, swing: 0.18 }, sound: { memory: 0.12, environment: 0.12, veil: 0.06, fracture: 0.08, ghost: 0.12, humanize: 0.028, overclock: 0.12 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'sine', cutoff: 2600, attack: 0.02, release: 1.1 }, bass: { ...baseVoices.bass, core: 'sine', cutoff: 480, release: 0.65, glide: 0.16, volume: -7 } }, rhythm: { pulse: [0, 6, 8, 11, 14], texture: [2, 5, 10, 13, 15], chords: [0, 8], bass: [0, 5, 8, 11, 14], probability: 0.9, ratchets: 3, microShift: 0.04 }, arrangement: ['A', 'A', 'B', 'A', 'C', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'industrial-ebm', label: 'Industrial / EBM', family: 'industrial', tags: ['mechanical', 'distorted', 'body'], description: 'Rigid body rhythm, abrasive edges, short commands, and disciplined distortion.', tempo: { min: 105, max: 145, preferred: 126 }, timing: { meter: '4/4', stepCount: 16, swing: 0.015 }, sound: { memory: 0.14, environment: 0.16, veil: 0.08, fracture: 0.34, ghost: 0.1, humanize: 0.01, overclock: 0.42 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'square', filterType: 'bandpass', cutoff: 4400, resonance: 2.8, attack: 0.005, release: 0.14 }, bass: { ...baseVoices.bass, core: 'sawtooth', cutoff: 1180, resonance: 3.4, release: 0.2 } }, rhythm: { pulse: [0, 2, 4, 6, 8, 10, 12, 14], texture: [3, 7, 11, 15], chords: [0, 8], bass: [0, 2, 4, 6, 8, 10, 12, 14], probability: 0.97 }, arrangement: ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'chiptune', label: 'Chiptune', family: 'retro', tags: ['8-bit', 'arpeggio', 'bright'], description: 'Fast square-wave figures, compact harmony, and crisp game-machine rhythm.', tempo: { min: 100, max: 180, preferred: 148 }, timing: { meter: '4/4', stepCount: 16, swing: 0 }, harmony: { mode: 'major', chordDensity: 0.84 }, sound: { memory: 0.08, environment: 0.06, veil: 0, fracture: 0.36, ghost: 0.02, humanize: 0, overclock: 0.12 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'square', cutoff: 7600, attack: 0.005, decay: 0.08, sustain: 0.12, release: 0.06 }, bass: { ...baseVoices.bass, core: 'square', cutoff: 2200, attack: 0.005, release: 0.08 }, pulse: { ...baseVoices.pulse, core: 'square' } }, rhythm: { pulse: [0, 2, 4, 6, 8, 10, 12, 14], texture: [3, 7, 11, 15], chords: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], bass: [0, 2, 4, 6, 8, 10, 12, 14], ratchets: 2 }, arrangement: ['A', 'A', 'B', 'C', 'A', 'B', 'D', 'C'] }),
  defineStyle({ ...common, id: 'glitch', label: 'Glitch / IDM', family: 'experimental', tags: ['broken', 'probability', 'digital'], description: 'Broken timing, reduced detail, deterministic gaps, and unstable event density.', tempo: { min: 90, max: 180, preferred: 136 }, timing: { meter: '7/8', stepCount: 14, swing: 0.11 }, sound: { memory: 0.14, environment: 0.12, veil: 0.1, fracture: 0.68, ghost: 0.56, humanize: 0.12, overclock: 0.24 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'square', filterType: 'bandpass', cutoff: 6500, resonance: 2.4, attack: 0.005, release: 0.08 }, bass: { ...baseVoices.bass, core: 'square', cutoff: 1320, release: 0.1 } }, rhythm: { pulse: [0, 3, 6, 8, 11, 13], texture: [1, 6, 10, 15], chords: [0, 3, 7, 11, 15], bass: [0, 4, 8, 12], probability: 0.72, ratchets: 3, microShift: 0.1 }, arrangement: ['A', 'B', 'D', 'A', 'C', 'D', 'B', 'D'] }),
  defineStyle({ ...common, id: 'cinematic', label: 'Cinematic', family: 'cinematic', tags: ['score', 'dramatic', 'evolving'], description: 'Evolving harmonic weight, spacious impact, and a broad compound-meter arc.', tempo: { min: 50, max: 120, preferred: 84 }, timing: { meter: '6/8', stepCount: 12, swing: 0.03 }, sound: { memory: 0.42, environment: 0.72, veil: 0.48, fracture: 0.04, ghost: 0.12, humanize: 0.038, overclock: 0.18 }, voices: { ...baseVoices, chords: { ...baseVoices.chords, core: 'sawtooth', cutoff: 3600, attack: 0.35, release: 3.8, detune: 7 }, bass: { ...baseVoices.bass, core: 'sine', cutoff: 620, attack: 0.08, release: 2.2 }, texture: { ...baseVoices.texture, attack: 0.4, release: 4, volume: -18 } }, rhythm: { pulse: [0, 6], texture: [3, 9], chords: [0, 6], bass: [0, 6], probability: 0.92 }, arrangement: ['A', 'A', 'B', 'C', 'A', 'D', 'C', 'D'] }),
]

export const STYLE_FAMILIES: Array<{ id: StyleFamily | 'all'; label: string }> = [
  { id: 'all', label: 'All styles' },
  { id: 'atmospheric', label: 'Atmospheric' },
  { id: 'wave', label: 'Wave & pop' },
  { id: 'club', label: 'Club' },
  { id: 'breakbeat', label: 'Breakbeat' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'retro', label: 'Retro' },
  { id: 'experimental', label: 'Experimental' },
  { id: 'cinematic', label: 'Cinematic' },
]

const styleMap = new Map(STYLE_DEFINITIONS.map((style) => [style.id, style]))

export function getStyle(id: string): StyleDefinition {
  return styleMap.get(id) ?? styleMap.get('darkwave')!
}

export function isStyleId(id: string): boolean {
  return styleMap.has(id)
}

function mix(current: number, target: number, amount: number): number {
  return current + (target - current) * clamp(amount, 0, 1)
}

function effectiveStyle(primaryId: string, influences: StyleInfluence[]): StyleDefinition {
  const primary = getStyle(primaryId)
  const result: StyleDefinition = {
    ...primary,
    tempo: { ...primary.tempo }, timing: { ...primary.timing }, harmony: { ...primary.harmony },
    sound: { ...primary.sound }, voices: Object.fromEntries(Object.entries(primary.voices).map(([id, voice]) => [id, { ...voice }])) as StyleDefinition['voices'],
    rhythm: { ...primary.rhythm, pulse: [...primary.rhythm.pulse], texture: [...primary.rhythm.texture], chords: [...primary.rhythm.chords], bass: [...primary.rhythm.bass] },
    arrangement: [...primary.arrangement], tags: [...primary.tags],
  }
  for (const influence of influences) {
    if (!isStyleId(influence.id) || influence.id === primaryId) continue
    const source = getStyle(influence.id)
    const amount = clamp(influence.amount, 0, 0.8)
    result.tempo.preferred = mix(result.tempo.preferred, source.tempo.preferred, amount)
    result.timing.swing = mix(result.timing.swing, source.timing.swing, amount)
    result.harmony.chordDensity = mix(result.harmony.chordDensity, source.harmony.chordDensity, amount)
    for (const key of Object.keys(source.sound) as Array<keyof SoundSettings>) {
      const value = source.sound[key]
      if (value !== undefined) result.sound[key] = mix(result.sound[key] ?? value, value, amount)
    }
    for (const id of Object.keys(source.voices) as VoiceId[]) {
      const sourceVoice = source.voices[id]
      const targetVoice = { ...(result.voices[id] ?? {}) }
      if (!sourceVoice) continue
      for (const [rawKey, value] of Object.entries(sourceVoice)) {
        const key = rawKey as keyof VoiceSettings
        if (typeof value === 'number' && typeof targetVoice[key] === 'number') {
          ;(targetVoice as Record<string, unknown>)[key] = mix(targetVoice[key] as number, value, amount)
        }
      }
      result.voices[id] = targetVoice
    }
  }
  return result
}

function expandedPositions(positions: number[], stepCount: number): Set<number> {
  const output = new Set<number>()
  for (let block = 0; block < stepCount; block += 16) {
    for (const position of positions) if (block + position < stepCount) output.add(block + position)
  }
  return output
}

function generatePatterns(composition: Composition, style: StyleDefinition): void {
  const suggestions = chordSuggestions(composition)
  const bassRoot = defaultBass(composition)
  const pulse = expandedPositions(style.rhythm.pulse, composition.stepCount)
  const texture = expandedPositions(style.rhythm.texture, composition.stepCount)
  const chords = expandedPositions(style.rhythm.chords, composition.stepCount)
  const bass = expandedPositions(style.rhythm.bass, composition.stepCount)

  PATTERN_IDS.forEach((patternId, patternIndex) => {
    const pattern = getPattern(composition, patternId)
    pattern.steps.forEach((step, index) => {
      const chordIndex = (patternIndex + Math.floor(index / 4)) % suggestions.length
      const bassOffset = (noteToMidi(suggestions[chordIndex].notes[0]) ?? 60) - (noteToMidi(suggestions[0].notes[0]) ?? 60)
      step.notes = chords.has(index) ? [...suggestions[chordIndex].notes] : []
      step.bass = bass.has(index) ? transposeNote(bassRoot, bassOffset) : null
      step.drum = pulse.has(index)
      step.texture = texture.has(index)
      step.velocity = index % 4 === 0 ? 0.88 : 0.62
      step.chordLength = Math.max(1, Math.min(8, Math.round(4 / Math.max(style.harmony.chordDensity, 0.2))))
      step.bassLength = style.id === 'ambient' || style.id === 'cinematic' ? 4 : 1
      step.probability = style.rhythm.probability ?? 1
      step.ratchets = (step.drum || step.texture) ? style.rhythm.ratchets ?? 1 : 1
      step.microShift = index === 0 ? 0 : style.rhythm.microShift ?? 0
    })
  })
}

export function applyStyle(
  composition: Composition,
  styleId: string,
  strength = 1,
  preserve: StylePreserve = DEFAULT_STYLE_PRESERVE,
  influences: StyleInfluence[] = [],
): Composition {
  const amount = clamp(strength, 0, 1)
  const style = effectiveStyle(styleId, influences)
  let next = cloneComposition(composition)
  next.world = style.id
  next.styleVersion = style.version
  next.styleInfluences = influences.filter((influence) => isStyleId(influence.id) && influence.id !== style.id && influence.amount > 0).map((influence) => ({ id: influence.id, amount: clamp(influence.amount, 0, 0.8) }))

  if (!preserve.tempo) next.bpm = Math.round(mix(next.bpm, style.tempo.preferred, amount))
  if (!preserve.timing) {
    if (amount >= 0.5) {
      next.meter = style.timing.meter
      next = resizeComposition(next, style.timing.stepCount)
    }
    next.swing = Number(mix(next.swing, style.timing.swing, amount).toFixed(3))
  }
  if (!preserve.harmony && amount >= 0.5) next.scaleMode = style.harmony.mode
  if (!preserve.effects) {
    for (const key of Object.keys(style.sound) as Array<keyof SoundSettings>) {
      const target = style.sound[key]
      if (target !== undefined) next.sound[key] = Number(mix(next.sound[key], target, amount).toFixed(3))
    }
  } else if (!preserve.timing && style.sound.humanize !== undefined) {
    next.sound.humanize = Number(mix(next.sound.humanize, style.sound.humanize, amount).toFixed(3))
  }
  if (!preserve.voices) {
    for (const id of Object.keys(style.voices) as VoiceId[]) {
      const recipe = style.voices[id]
      if (!recipe) continue
      for (const [rawKey, target] of Object.entries(recipe)) {
        const key = rawKey as keyof VoiceSettings
        const current = next.voices[id][key]
        if (typeof current === 'number' && typeof target === 'number') (next.voices[id] as unknown as Record<string, unknown>)[key] = Number(mix(current, target, amount).toFixed(3))
        else if (amount >= 0.5) (next.voices[id] as unknown as Record<string, unknown>)[key] = target
      }
    }
  }
  if (!preserve.patterns) generatePatterns(next, style)
  if (!preserve.arrangement && amount >= 0.5) next.arrangement = [...style.arrangement]
  return next
}
