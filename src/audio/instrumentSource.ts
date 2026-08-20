import * as Tone from 'tone'
import {
  clamp,
  transposeNote,
  type InstrumentEngine,
  type LayerSlot,
  type VoiceId,
  type VoiceLayerSettings,
  type VoiceSettings,
} from '../model/composition'
import { textureNoiseType } from './signalPath'

export interface VoiceRuntimeModifiers {
  envelopeScale: number
  pitchDriftCents: number
}

export const NEUTRAL_VOICE_MODIFIERS: VoiceRuntimeModifiers = {
  envelopeScale: 1,
  pitchDriftCents: 0,
}

interface LayerSource {
  engine: InstrumentEngine
  update: (layer: VoiceLayerSettings, voice: VoiceSettings, modifiers: VoiceRuntimeModifiers) => void
  trigger: (notes: string | string[] | null, duration: number, time: number, velocity: number) => void
  release: () => void
  dispose: () => void
}

interface PitchedNode {
  maxPolyphony?: number
  set: (options: unknown) => unknown
  triggerAttackRelease: (notes: string | string[], duration: number, time: number, velocity: number) => unknown
  releaseAll?: () => unknown
  triggerRelease?: () => unknown
  dispose: () => unknown
}

export function mapLayerCharacter(engine: InstrumentEngine, character: number): Record<string, number> {
  const amount = clamp(character, 0, 1)
  if (engine === 'fm') return { harmonicity: 0.5 + amount * 3.5, modulationIndex: 0.5 + amount * 11.5 }
  if (engine === 'am') return { harmonicity: 0.5 + amount * 4.5 }
  if (engine === 'membrane') return { pitchDecay: 0.01 + amount * 0.07, octaves: 2 + amount * 5 }
  return {}
}

function envelopeOptions(layer: VoiceLayerSettings, voice: VoiceSettings, modifiers: VoiceRuntimeModifiers) {
  return {
    attack: voice.attack * layer.attackScale * modifiers.envelopeScale,
    decay: voice.decay * modifiers.envelopeScale,
    sustain: voice.sustain,
    release: voice.release * layer.releaseScale * modifiers.envelopeScale,
  }
}

function pitchedOptions(layer: VoiceLayerSettings, voice: VoiceSettings, modifiers: VoiceRuntimeModifiers): Record<string, unknown> {
  const character = mapLayerCharacter(layer.engine, layer.character)
  const common: Record<string, unknown> = {
    oscillator: { type: layer.waveform },
    envelope: envelopeOptions(layer, voice, modifiers),
    detune: layer.detune + modifiers.pitchDriftCents,
    portamento: voice.glide,
  }
  if (layer.engine === 'fm') {
    return { ...common, harmonicity: character.harmonicity, modulationIndex: character.modulationIndex, modulation: { type: layer.waveform } }
  }
  if (layer.engine === 'am') return { ...common, harmonicity: character.harmonicity, modulation: { type: layer.waveform } }
  return {
    ...common,
    filter: { type: 'lowpass', rolloff: -24, Q: 1.2 },
    filterEnvelope: { attack: 0.01, decay: 0.22, sustain: 0.18, release: 0.6, baseFrequency: 70, octaves: 1 + layer.character * 3 },
  }
}

function asPitchedNode(node: unknown): PitchedNode {
  return node as PitchedNode
}

function makePitchedSource(role: VoiceId, layer: VoiceLayerSettings, output: Tone.InputNode): LayerSource {
  let node: PitchedNode
  if (role === 'chords') {
    if (layer.engine === 'fm') node = asPitchedNode(new Tone.PolySynth(Tone.FMSynth).connect(output))
    else if (layer.engine === 'am') node = asPitchedNode(new Tone.PolySynth(Tone.AMSynth).connect(output))
    else node = asPitchedNode(new Tone.PolySynth(Tone.Synth).connect(output))
  } else {
    if (layer.engine === 'fm') node = asPitchedNode(new Tone.FMSynth().connect(output))
    else if (layer.engine === 'am') node = asPitchedNode(new Tone.AMSynth().connect(output))
    else node = asPitchedNode(new Tone.MonoSynth().connect(output))
  }
  if (role === 'chords') node.maxPolyphony = 8
  return {
    engine: layer.engine,
    update(nextLayer, voice, modifiers) {
      node.set(pitchedOptions(nextLayer, voice, modifiers))
    },
    trigger(notes, duration, time, velocity) {
      if (notes) node.triggerAttackRelease(notes, duration, time, velocity)
    },
    release() {
      if (node.releaseAll) node.releaseAll()
      else node.triggerRelease?.()
    },
    dispose() { node.dispose() },
  }
}

function makeMembraneSource(layer: VoiceLayerSettings, output: Tone.InputNode): LayerSource {
  const synth = new Tone.MembraneSynth().connect(output)
  return {
    engine: layer.engine,
    update(nextLayer, voice, modifiers) {
      const character = mapLayerCharacter('membrane', nextLayer.character)
      synth.set({
        oscillator: { type: nextLayer.waveform },
        envelope: envelopeOptions(nextLayer, voice, modifiers),
        detune: nextLayer.detune + modifiers.pitchDriftCents,
        pitchDecay: character.pitchDecay,
        octaves: character.octaves,
      })
    },
    trigger(notes, duration, time, velocity) {
      synth.triggerAttackRelease(typeof notes === 'string' ? notes : 'C1', duration, time, velocity)
    },
    release() { synth.triggerRelease() },
    dispose() { synth.dispose() },
  }
}

function makeNoiseSource(layer: VoiceLayerSettings, output: Tone.InputNode): LayerSource {
  const synth = new Tone.NoiseSynth().connect(output)
  return {
    engine: layer.engine,
    update(nextLayer, voice, modifiers) {
      synth.set({
        noise: { type: textureNoiseType(nextLayer.waveform) },
        envelope: envelopeOptions(nextLayer, voice, modifiers),
      })
    },
    trigger(_notes, duration, time, velocity) { synth.triggerAttackRelease(duration, time, velocity) },
    release() { synth.triggerRelease() },
    dispose() { synth.dispose() },
  }
}

function makeLayerSource(role: VoiceId, layer: VoiceLayerSettings, output: Tone.InputNode): LayerSource {
  if (layer.engine === 'membrane') return makeMembraneSource(layer, output)
  if (layer.engine === 'noise') return makeNoiseSource(layer, output)
  return makePitchedSource(role, layer, output)
}

function shiftedNotes(notes: string | string[] | null, octave: number): string | string[] | null {
  const semitones = octave * 12
  if (!notes || semitones === 0) return notes
  return Array.isArray(notes) ? notes.map((note) => transposeNote(note, semitones)) : transposeNote(notes, semitones)
}

export class LayeredVoiceSource {
  private readonly gains: Record<LayerSlot, Tone.Volume>
  private readonly sources: Partial<Record<LayerSlot, LayerSource>> = {}
  private settings: VoiceSettings

  constructor(private readonly role: VoiceId, output: Tone.InputNode, settings: VoiceSettings, modifiers: VoiceRuntimeModifiers = NEUTRAL_VOICE_MODIFIERS) {
    this.settings = settings
    this.gains = {
      primary: new Tone.Volume(settings.layers.primary.level).connect(output),
      shadow: new Tone.Volume(settings.layers.shadow.level).connect(output),
    }
    this.update(settings, modifiers)
  }

  update(settings: VoiceSettings, modifiers: VoiceRuntimeModifiers = NEUTRAL_VOICE_MODIFIERS): void {
    this.settings = settings
    for (const slot of ['primary', 'shadow'] as LayerSlot[]) {
      const layer = settings.layers[slot]
      const current = this.sources[slot]
      if (!current || current.engine !== layer.engine) {
        current?.release()
        current?.dispose()
        this.sources[slot] = makeLayerSource(this.role, layer, this.gains[slot])
      }
      this.gains[slot].volume.rampTo(layer.level, 0.05)
      this.gains[slot].mute = slot === 'shadow' && !layer.enabled
      this.sources[slot]?.update(layer, settings, modifiers)
    }
  }

  trigger(notes: string | string[] | null, duration: number, time: number, velocity: number): void {
    for (const slot of ['primary', 'shadow'] as LayerSlot[]) {
      const layer = this.settings.layers[slot]
      if (slot === 'shadow' && !layer.enabled) continue
      this.sources[slot]?.trigger(shiftedNotes(notes, layer.octave), duration, time, velocity)
    }
  }

  release(): void {
    for (const source of Object.values(this.sources)) source.release()
  }

  dispose(): void {
    for (const source of Object.values(this.sources)) source.dispose()
    this.sources.primary = undefined
    this.sources.shadow = undefined
    this.gains.primary.dispose()
    this.gains.shadow.dispose()
  }
}
