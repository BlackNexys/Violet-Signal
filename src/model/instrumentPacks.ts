import {
  cloneComposition,
  isEngineCompatible,
  makeVoiceSettings,
  type Composition,
  type VoiceId,
  type VoiceRecipe,
  type VoiceSettings,
} from './composition'

export interface InstrumentPatchDefinition {
  id: string
  packId: string
  version: number
  label: string
  conventionalDescription: string
  tags: string[]
  role: VoiceId
  settings: VoiceSettings
}

export interface SoundPackDefinition {
  id: string
  version: number
  label: string
  description: string
  tags: string[]
}

export const SOUND_PACKS: SoundPackDefinition[] = [
  {
    id: 'blacklight-core',
    version: 1,
    label: 'Blacklight Core',
    description: 'The original signal path, preserved as calibrated starting voices.',
    tags: ['familiar', 'balanced', 'foundational'],
  },
  {
    id: 'veil-archive',
    version: 1,
    label: 'Veil Archive',
    description: 'Glass harmonics, slow shadows, and low-frequency afterimages.',
    tags: ['darkwave', 'ambient', 'spectral'],
  },
  {
    id: 'chrome-wound',
    version: 1,
    label: 'Chrome Wound',
    description: 'Detuned machinery, metallic impacts, and bright industrial debris.',
    tags: ['industrial', 'wide', 'metallic'],
  },
  {
    id: 'fractured-relay',
    version: 1,
    label: 'Fractured Relay',
    description: 'Short physical strings and clipped machine transients.',
    tags: ['pluck', 'glitch', 'percussive'],
  },
]

function definePatch(
  packId: string,
  id: string,
  label: string,
  conventionalDescription: string,
  tags: string[],
  role: VoiceId,
  recipe: VoiceRecipe,
): InstrumentPatchDefinition {
  const patchId = `${packId}/${id}@1`
  const settings = makeVoiceSettings(role, { ...recipe, patchId })
  return { id: patchId, packId, version: 1, label, conventionalDescription, tags, role, settings }
}

export const INSTRUMENT_PATCHES: InstrumentPatchDefinition[] = [
  definePatch('blacklight-core', 'quiet-circuit', 'Quiet Circuit', 'Classic filtered poly synth', ['clear', 'soft', 'balanced'], 'chords', {
    core: 'triangle', cutoff: 2800, resonance: 0.7, attack: 0.05, decay: 0.38, sustain: 0.58, release: 1.4, volume: -10,
  }),
  definePatch('blacklight-core', 'underline', 'Underline', 'Focused subtractive mono bass', ['grounded', 'warm', 'direct'], 'bass', {
    core: 'triangle', cutoff: 950, resonance: 0.7, attack: 0.012, decay: 0.3, sustain: 0.5, release: 0.7, volume: -9,
  }),
  definePatch('blacklight-core', 'heart-signal', 'Heart Signal', 'Short synthesized membrane hit', ['round', 'compact', 'percussive'], 'pulse', {
    core: 'sine', cutoff: 2100, attack: 0.005, decay: 0.09, sustain: 0, release: 0.06, volume: -16,
  }),
  definePatch('blacklight-core', 'rain-carrier', 'Rain Carrier', 'Filtered procedural noise', ['soft', 'weathered', 'spatial'], 'texture', {
    core: 'sawtooth', cutoff: 1400, attack: 0.08, decay: 0.6, sustain: 0.12, release: 1.8, volume: -22,
  }),
  definePatch('veil-archive', 'glass-choir', 'Glass Choir', 'Slow AM pad with an FM octave shadow', ['glassy', 'wide', 'slow'], 'chords', {
    cutoff: 2450, resonance: 1.1, attack: 0.34, decay: 0.86, sustain: 0.68, release: 3.4, volume: -13,
    primary: { engine: 'am', waveform: 'triangle', character: 0.42, level: -2, attackScale: 1.15, releaseScale: 1.2 },
    shadow: { enabled: true, engine: 'fm', waveform: 'sine', octave: 1, detune: 7, level: -17, character: 0.5, attackScale: 1.65, releaseScale: 1.35 },
  }),
  definePatch('veil-archive', 'undertow', 'Undertow', 'Sine sub bass with a quiet FM edge', ['deep', 'hollow', 'restrained'], 'bass', {
    cutoff: 620, resonance: 1.8, attack: 0.018, decay: 0.42, sustain: 0.66, release: 1.05, glide: 0.08, volume: -8,
    primary: { engine: 'subtractive', waveform: 'sine', character: 0.12, level: -1 },
    shadow: { enabled: true, engine: 'fm', waveform: 'sine', octave: 0, detune: -6, level: -18, character: 0.28, attackScale: 0.8, releaseScale: 0.75 },
  }),
  definePatch('chrome-wound', 'razor-assembly', 'Razor Assembly', 'Wide dual-oscillator saw stack', ['wide', 'bright', 'unstable'], 'chords', {
    cutoff: 3600, resonance: 2.1, attack: 0.025, decay: 0.42, sustain: 0.5, release: 1.25, volume: -15,
    primary: { engine: 'dual', waveform: 'sawtooth', detune: -5, level: -4, character: 0.62 },
    shadow: { enabled: true, engine: 'fm', waveform: 'square', octave: 1, detune: 8, level: -22, character: 0.48, attackScale: 0.7, releaseScale: 0.75 },
  }),
  definePatch('chrome-wound', 'reactor', 'Reactor', 'Dual-oscillator bass with a restrained sub shadow', ['driven', 'low', 'mechanical'], 'bass', {
    cutoff: 820, resonance: 2.8, attack: 0.012, decay: 0.3, sustain: 0.58, release: 0.62, glide: 0.045, volume: -11,
    primary: { engine: 'dual', waveform: 'sawtooth', detune: -3, level: -5, character: 0.38 },
    shadow: { enabled: true, engine: 'subtractive', waveform: 'sine', octave: -1, level: -19, character: 0.08, releaseScale: 0.8 },
  }),
  definePatch('chrome-wound', 'iron-pulse', 'Iron Pulse', 'Membrane body with a metallic attack', ['heavy', 'metallic', 'short'], 'pulse', {
    cutoff: 3300, resonance: 1.4, attack: 0.005, decay: 0.13, sustain: 0, release: 0.1, volume: -19,
    primary: { engine: 'membrane', waveform: 'sine', level: -3, character: 0.58 },
    shadow: { enabled: true, engine: 'metal', waveform: 'square', octave: 1, level: -21, character: 0.72, attackScale: 0.5, releaseScale: 0.55 },
  }),
  definePatch('chrome-wound', 'arc-ash', 'Arc Ash', 'Bright metallic debris in a noise cloud', ['bright', 'broken', 'textural'], 'texture', {
    cutoff: 4100, filterType: 'bandpass', resonance: 3.6, attack: 0.008, decay: 0.24, sustain: 0.02, release: 0.42, volume: -25,
    primary: { engine: 'metal', waveform: 'triangle', octave: 1, level: -9, character: 0.82 },
    shadow: { enabled: true, engine: 'noise', waveform: 'square', level: -24, character: 0.35, releaseScale: 1.4 },
  }),
  definePatch('fractured-relay', 'wire-below', 'Wire Below', 'Short physical-string bass with a dry sub edge', ['plucked', 'dark', 'precise'], 'bass', {
    cutoff: 1350, resonance: 1.9, attack: 0.005, decay: 0.18, sustain: 0.08, release: 0.48, volume: -11,
    primary: { engine: 'pluck', waveform: 'triangle', level: -5, character: 0.44 },
    shadow: { enabled: true, engine: 'subtractive', waveform: 'sine', octave: -1, level: -22, character: 0.1, releaseScale: 0.5 },
  }),
  definePatch('fractured-relay', 'relay-click', 'Relay Click', 'Clipped metallic machine transient', ['click', 'industrial', 'dry'], 'pulse', {
    cutoff: 5200, filterType: 'highpass', resonance: 2.2, attack: 0.005, decay: 0.06, sustain: 0, release: 0.045, volume: -22,
    primary: { engine: 'metal', waveform: 'square', octave: 1, level: -8, character: 0.34 },
    shadow: { enabled: true, engine: 'noise', waveform: 'square', level: -27, character: 0.2, releaseScale: 0.5 },
  }),
]

const patchMap = new Map(INSTRUMENT_PATCHES.map((patch) => [patch.id, patch]))

export function getInstrumentPatch(id: string): InstrumentPatchDefinition | null {
  return patchMap.get(id) ?? null
}

export function patchesForVoice(role: VoiceId): InstrumentPatchDefinition[] {
  return INSTRUMENT_PATCHES.filter((patch) => patch.role === role)
}

export function applyInstrumentPatch(composition: Composition, role: VoiceId, patchId: string): Composition {
  const patch = getInstrumentPatch(patchId)
  if (!patch || patch.role !== role) return cloneComposition(composition)
  const next = cloneComposition(composition)
  next.voices[role] = {
    ...patch.settings,
    layers: {
      primary: { ...patch.settings.layers.primary },
      shadow: { ...patch.settings.layers.shadow },
    },
  }
  return next
}

export function validateInstrumentPatches(): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  const inRange = (value: number, minimum: number, maximum: number) => Number.isFinite(value) && value >= minimum && value <= maximum
  for (const patch of INSTRUMENT_PATCHES) {
    if (ids.has(patch.id)) errors.push(`Duplicate patch id: ${patch.id}`)
    ids.add(patch.id)
    if (!SOUND_PACKS.some((pack) => pack.id === patch.packId)) errors.push(`Unknown pack for ${patch.id}`)
    if (!patch.settings.layers.primary.enabled) errors.push(`${patch.id} disables its Primary layer`)
    for (const [slot, layer] of Object.entries(patch.settings.layers)) {
      if (!isEngineCompatible(patch.role, layer.engine)) errors.push(`${patch.id} uses ${layer.engine} on ${patch.role}`)
      if (!Number.isInteger(layer.octave) || !inRange(layer.octave, -2, 2)) errors.push(`${patch.id} ${slot} octave is out of range`)
      if (!inRange(layer.detune, -100, 100)) errors.push(`${patch.id} ${slot} detune is out of range`)
      if (!inRange(layer.level, -36, 0)) errors.push(`${patch.id} ${slot} level is out of range`)
      if (!inRange(layer.character, 0, 1)) errors.push(`${patch.id} ${slot} Character is out of range`)
      if (!inRange(layer.attackScale, 0.25, 4) || !inRange(layer.releaseScale, 0.25, 4)) errors.push(`${patch.id} ${slot} response is out of range`)
    }
    if (!inRange(patch.settings.cutoff, 80, 12_000)) errors.push(`${patch.id} cutoff is out of range`)
    if (!inRange(patch.settings.resonance, 0, 12)) errors.push(`${patch.id} resonance is out of range`)
    if (!inRange(patch.settings.volume, -36, -4)) errors.push(`${patch.id} volume is out of range`)
  }
  return errors
}
