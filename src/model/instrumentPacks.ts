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
  for (const patch of INSTRUMENT_PATCHES) {
    if (ids.has(patch.id)) errors.push(`Duplicate patch id: ${patch.id}`)
    ids.add(patch.id)
    if (!SOUND_PACKS.some((pack) => pack.id === patch.packId)) errors.push(`Unknown pack for ${patch.id}`)
    for (const layer of Object.values(patch.settings.layers)) {
      if (!isEngineCompatible(patch.role, layer.engine)) errors.push(`${patch.id} uses ${layer.engine} on ${patch.role}`)
    }
  }
  return errors
}
