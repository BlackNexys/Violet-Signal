import * as Tone from 'tone'
import {
  clamp,
  transposeNote,
  type ArrangementLayerSelection,
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
  liveMonitoring: boolean
}

export const NEUTRAL_VOICE_MODIFIERS: VoiceRuntimeModifiers = {
  envelopeScale: 1,
  pitchDriftCents: 0,
  liveMonitoring: false,
}

const ENGINE_MONITOR_TRIM_DB: Record<InstrumentEngine, number> = {
  subtractive: 0,
  fm: 10,
  am: 14,
  dual: -3,
  pluck: 3,
  membrane: 0,
  metal: -6,
  noise: 0,
}

/** Compensates Tone engine output differences only in the real-time monitor path. */
export function engineMonitorTrimDb(engine: InstrumentEngine): number {
  return ENGINE_MONITOR_TRIM_DB[engine]
}

const LIVE_START_LEAD_SECONDS = 0.002
const LIVE_START_SEPARATION_SECONDS = 0.001

/** Prevents Tone's unsynced Sources from receiving equal/past starts after a late scheduler callback. */
export function monotonicLiveStartTime(requested: number, immediate: number, previous: number): number {
  return Math.max(requested, immediate + LIVE_START_LEAD_SECONDS, previous + LIVE_START_SEPARATION_SECONDS)
}

interface LayerSource {
  engine: InstrumentEngine
  update: (layer: VoiceLayerSettings, voice: VoiceSettings, modifiers: VoiceRuntimeModifiers) => void
  trigger: (notes: string | string[] | null, duration: number, time: number, velocity: number) => void
  attack: (notes: string | string[] | null, time: number, velocity: number) => void
  change: (notes: string | string[] | null, time: number, velocity: number) => void
  release: (time?: number) => void
  dispose: () => void
}

interface PitchedNode {
  maxPolyphony?: number
  set: (options: unknown) => unknown
  triggerAttack: (notes: string | string[], time: number, velocity: number) => unknown
  triggerAttackRelease: (notes: string | string[], duration: number, time: number, velocity: number) => unknown
  setNote?: (note: string, time: number) => unknown
  releaseAll?: (time?: number) => unknown
  triggerRelease?: (notesOrTime?: string | string[] | number, time?: number) => unknown
  dispose: () => unknown
}

export function mapLayerCharacter(engine: InstrumentEngine, character: number): Record<string, number> {
  const amount = clamp(character, 0, 1)
  if (engine === 'fm') return { harmonicity: 0.5 + amount * 3.5, modulationIndex: 0.5 + amount * 11.5 }
  if (engine === 'am') return { harmonicity: 0.5 + amount * 4.5 }
  if (engine === 'dual') return { harmonicity: 0.995 + amount * 0.01, vibratoAmount: 0.015 + amount * 0.16, vibratoRate: 0.4 + amount * 4.6 }
  if (engine === 'pluck') return { attackNoise: 0.5 + amount * 1.8, dampening: 1200 + amount * 4800, resonance: 0.7 + amount * 0.27 }
  if (engine === 'membrane') return { pitchDecay: 0.01 + amount * 0.07, octaves: 2 + amount * 5 }
  if (engine === 'metal') return { harmonicity: 2.5 + amount * 3.5, modulationIndex: 12 + amount * 28, octaves: 0.5 + amount * 3.5, resonance: 180 + amount * 3200 }
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
  const envelope = envelopeOptions(layer, voice, modifiers)
  const common: Record<string, unknown> = {
    oscillator: { type: layer.waveform },
    envelope,
    detune: layer.detune + modifiers.pitchDriftCents,
    portamento: voice.glide,
  }
  if (layer.engine === 'fm') {
    return { ...common, harmonicity: character.harmonicity, modulationIndex: character.modulationIndex, modulation: { type: layer.waveform } }
  }
  if (layer.engine === 'am') return { ...common, harmonicity: character.harmonicity, modulation: { type: layer.waveform } }
  if (layer.engine === 'dual') {
    const voiceOptions = {
      oscillator: { type: layer.waveform },
      envelope,
      filter: { type: 'lowpass', rolloff: -24, Q: 1.2 },
      filterEnvelope: { attack: 0.01, decay: 0.22, sustain: 0.18, release: 0.6, baseFrequency: 70, octaves: 1 + layer.character * 3 },
    }
    return {
      detune: layer.detune + modifiers.pitchDriftCents,
      portamento: voice.glide,
      harmonicity: character.harmonicity,
      vibratoAmount: character.vibratoAmount,
      vibratoRate: character.vibratoRate,
      voice0: voiceOptions,
      voice1: voiceOptions,
    }
  }
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
  let activeNotes: string[] = []
  if (role === 'chords') {
    if (layer.engine === 'fm') node = asPitchedNode(new Tone.PolySynth(Tone.FMSynth).connect(output))
    else if (layer.engine === 'am') node = asPitchedNode(new Tone.PolySynth(Tone.AMSynth).connect(output))
    else if (layer.engine === 'dual') node = asPitchedNode(new Tone.PolySynth(Tone.DuoSynth).connect(output))
    else node = asPitchedNode(new Tone.PolySynth(Tone.Synth).connect(output))
  } else {
    if (layer.engine === 'fm') node = asPitchedNode(new Tone.FMSynth().connect(output))
    else if (layer.engine === 'am') node = asPitchedNode(new Tone.AMSynth().connect(output))
    else if (layer.engine === 'dual') node = asPitchedNode(new Tone.DuoSynth().connect(output))
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
    attack(notes, time, velocity) {
      const pitches = Array.isArray(notes) ? notes : notes ? [notes] : []
      if (!pitches.length) return
      if (activeNotes.length) {
        if (role === 'chords') node.triggerRelease?.(activeNotes, time)
        else node.triggerRelease?.(time)
      }
      node.triggerAttack(role === 'chords' ? pitches : pitches[0], time, velocity)
      activeNotes = [...pitches]
    },
    change(notes, time, velocity) {
      const pitches = Array.isArray(notes) ? notes : notes ? [notes] : []
      if (!pitches.length) return
      if (!activeNotes.length) {
        node.triggerAttack(role === 'chords' ? pitches : pitches[0], time, velocity)
      } else if (role === 'chords') {
        const removed = activeNotes.filter((note) => !pitches.includes(note))
        const added = pitches.filter((note) => !activeNotes.includes(note))
        if (removed.length) node.triggerRelease?.(removed, time)
        if (added.length) node.triggerAttack(added, time, velocity)
      } else if (pitches[0] !== activeNotes[0]) {
        node.setNote?.(pitches[0], time)
      }
      activeNotes = [...pitches]
    },
    release(time) {
      if (role === 'chords') {
        if (activeNotes.length) node.triggerRelease?.(activeNotes, time)
        else if (time === undefined) node.releaseAll?.()
      } else node.triggerRelease?.(time)
      activeNotes = []
    },
    dispose() { node.dispose() },
  }
}

function makePluckSource(role: VoiceId, layer: VoiceLayerSettings, output: Tone.InputNode): LayerSource {
  const poolSize = role === 'chords' ? 8 : 4
  const voices = Array.from({ length: poolSize }, () => {
    const gain = new Tone.Gain(1).connect(output)
    return { synth: new Tone.PluckSynth().connect(gain), gain }
  })
  let cursor = 0
  let detuneCents = layer.detune
  const active = new Map<string, (typeof voices)[number]>()
  const allocate = (pitch: string, time: number, velocity: number) => {
    const item = voices[cursor % voices.length]
    cursor += 1
    for (const [activePitch, activeItem] of active) {
      if (activeItem === item) {
        activeItem.synth.triggerRelease(time)
        active.delete(activePitch)
      }
    }
    item.gain.gain.setValueAtTime(clamp(velocity, 0, 1), time)
    const frequency = Tone.Frequency(pitch).transpose(detuneCents / 100).toFrequency()
    item.synth.triggerAttack(frequency, time)
    active.set(pitch, item)
    return item
  }
  return {
    engine: layer.engine,
    update(nextLayer, voice, modifiers) {
      const character = mapLayerCharacter('pluck', nextLayer.character)
      detuneCents = nextLayer.detune + modifiers.pitchDriftCents
      for (const item of voices) {
        item.synth.set({
          attackNoise: character.attackNoise,
          dampening: character.dampening,
          resonance: character.resonance,
          release: clamp(voice.release * nextLayer.releaseScale, 0.05, 4),
        })
      }
    },
    trigger(notes, duration, time, velocity) {
      const pitches = Array.isArray(notes) ? notes : notes ? [notes] : []
      for (const pitch of pitches.slice(0, poolSize)) {
        const item = voices[cursor % voices.length]
        cursor += 1
        item.gain.gain.setValueAtTime(clamp(velocity, 0, 1), time)
        const frequency = Tone.Frequency(pitch).transpose(detuneCents / 100).toFrequency()
        item.synth.triggerAttack(frequency, time)
        item.synth.triggerRelease(time + duration)
      }
    },
    attack(notes, time, velocity) {
      for (const item of active.values()) item.synth.triggerRelease(time)
      active.clear()
      const pitches = Array.isArray(notes) ? notes : notes ? [notes] : []
      for (const pitch of pitches.slice(0, poolSize)) allocate(pitch, time, velocity)
    },
    change(notes, time, velocity) {
      const pitches = (Array.isArray(notes) ? notes : notes ? [notes] : []).slice(0, poolSize)
      for (const [pitch, item] of active) {
        if (!pitches.includes(pitch)) {
          item.synth.triggerRelease(time)
          active.delete(pitch)
        }
      }
      for (const pitch of pitches) if (!active.has(pitch)) allocate(pitch, time, velocity)
    },
    release(time) {
      for (const item of active.values()) item.synth.triggerRelease(time)
      if (time === undefined) for (const item of voices) item.synth.triggerRelease()
      active.clear()
    },
    dispose() {
      for (const item of voices) {
        item.synth.dispose()
        item.gain.dispose()
      }
    },
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
    attack(notes, time, velocity) { synth.triggerAttack(typeof notes === 'string' ? notes : 'C1', time, velocity) },
    change(notes, time) { synth.setNote(typeof notes === 'string' ? notes : 'C1', time) },
    release(time) { synth.triggerRelease(time) },
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
    attack(_notes, time, velocity) { synth.triggerAttack(time, velocity) },
    change() {},
    release(time) { synth.triggerRelease(time) },
    dispose() { synth.dispose() },
  }
}

function makeMetalSource(layer: VoiceLayerSettings, output: Tone.InputNode): LayerSource {
  const synth = new Tone.MetalSynth().connect(output)
  return {
    engine: layer.engine,
    update(nextLayer, voice, modifiers) {
      const character = mapLayerCharacter('metal', nextLayer.character)
      synth.set({
        detune: nextLayer.detune + modifiers.pitchDriftCents,
        envelope: envelopeOptions(nextLayer, voice, modifiers),
        harmonicity: character.harmonicity,
        modulationIndex: character.modulationIndex,
        octaves: character.octaves,
        resonance: character.resonance,
      })
    },
    trigger(notes, duration, time, velocity) {
      const note = Array.isArray(notes) ? notes[0] : notes ?? 'C3'
      synth.triggerAttackRelease(note, duration, time, velocity)
    },
    attack(notes, time, velocity) {
      const note = Array.isArray(notes) ? notes[0] : notes ?? 'C3'
      synth.triggerAttack(note, time, velocity)
    },
    change(notes, time) {
      const note = Array.isArray(notes) ? notes[0] : notes ?? 'C3'
      synth.frequency.setValueAtTime(Tone.Frequency(note).toFrequency(), time)
    },
    release(time) { synth.triggerRelease(time) },
    dispose() { synth.dispose() },
  }
}

function makeLayerSource(role: VoiceId, layer: VoiceLayerSettings, output: Tone.InputNode): LayerSource {
  if (layer.engine === 'pluck') return makePluckSource(role, layer, output)
  if (layer.engine === 'membrane') return makeMembraneSource(layer, output)
  if (layer.engine === 'metal') return makeMetalSource(layer, output)
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
  private readonly retiredSources = new Set<LayerSource>()
  private readonly retirementTimers = new Map<LayerSource, ReturnType<typeof setTimeout>>()
  private readonly lastStartTimes: Record<LayerSlot, number> = { primary: Number.NEGATIVE_INFINITY, shadow: Number.NEGATIVE_INFINITY }
  private settings: VoiceSettings
  private liveMonitoring: boolean

  constructor(private readonly role: VoiceId, output: Tone.InputNode, settings: VoiceSettings, modifiers: VoiceRuntimeModifiers = NEUTRAL_VOICE_MODIFIERS) {
    this.settings = settings
    this.liveMonitoring = modifiers.liveMonitoring
    this.gains = {
      primary: new Tone.Volume(settings.layers.primary.level).connect(output),
      shadow: new Tone.Volume(settings.layers.shadow.level).connect(output),
    }
    this.update(settings, modifiers)
  }

  update(settings: VoiceSettings, modifiers: VoiceRuntimeModifiers = NEUTRAL_VOICE_MODIFIERS): void {
    const previousSettings = this.settings
    const shadowWasEnabled = this.settings.layers.shadow.enabled
    this.settings = settings
    this.liveMonitoring = modifiers.liveMonitoring
    for (const slot of ['primary', 'shadow'] as LayerSlot[]) {
      const layer = settings.layers[slot]
      const current = this.sources[slot]
      if (!current || current.engine !== layer.engine) {
        if (current) this.retire(current, previousSettings.release * previousSettings.layers[slot].releaseScale)
        this.sources[slot] = makeLayerSource(this.role, layer, this.gains[slot])
      }
      const monitorTrim = modifiers.liveMonitoring ? engineMonitorTrimDb(layer.engine) : 0
      this.gains[slot].volume.rampTo(layer.level + monitorTrim, 0.05)
      this.sources[slot]?.update(layer, settings, modifiers)
    }
    if (shadowWasEnabled && !settings.layers.shadow.enabled) this.sources.shadow?.release()
  }

  private startTime(slot: LayerSlot, requested: number): number {
    if (!this.liveMonitoring) return requested
    const next = monotonicLiveStartTime(requested, Tone.immediate(), this.lastStartTimes[slot])
    this.lastStartTimes[slot] = next
    return next
  }

  private retire(source: LayerSource, releaseSeconds: number): void {
    source.release()
    this.retiredSources.add(source)
    const timer = setTimeout(() => {
      this.retirementTimers.delete(source)
      if (this.retiredSources.delete(source)) source.dispose()
    }, Math.ceil((Math.max(0.05, releaseSeconds) + 0.1) * 1000))
    this.retirementTimers.set(source, timer)
  }

  trigger(notes: string | string[] | null, duration: number, time: number, velocity: number, selection: ArrangementLayerSelection = 'all'): void {
    for (const slot of ['primary', 'shadow'] as LayerSlot[]) {
      const layer = this.settings.layers[slot]
      const selected = selection === 'all' ? slot === 'primary' || layer.enabled : slot === selection
      if (!selected) continue
      this.sources[slot]?.trigger(shiftedNotes(notes, layer.octave), duration, this.startTime(slot, time), velocity)
    }
  }

  attack(notes: string | string[] | null, time: number, velocity: number, selection: ArrangementLayerSelection = 'all'): void {
    this.applyLifecycle('attack', notes, time, velocity, selection)
  }

  change(notes: string | string[] | null, time: number, velocity: number, selection: ArrangementLayerSelection = 'all'): void {
    this.applyLifecycle('change', notes, time, velocity, selection)
  }

  private applyLifecycle(action: 'attack' | 'change', notes: string | string[] | null, time: number, velocity: number, selection: ArrangementLayerSelection): void {
    for (const slot of ['primary', 'shadow'] as LayerSlot[]) {
      const layer = this.settings.layers[slot]
      const selected = selection === 'all' ? slot === 'primary' || layer.enabled : slot === selection
      if (selected) this.sources[slot]?.[action](shiftedNotes(notes, layer.octave), this.startTime(slot, time), velocity)
      else this.sources[slot]?.release(time)
    }
  }

  release(time?: number): void {
    for (const source of Object.values(this.sources)) source.release(time)
  }

  dispose(): void {
    for (const source of Object.values(this.sources)) source.dispose()
    for (const timer of this.retirementTimers.values()) clearTimeout(timer)
    for (const source of this.retiredSources) source.dispose()
    this.sources.primary = undefined
    this.sources.shadow = undefined
    this.retirementTimers.clear()
    this.retiredSources.clear()
    this.gains.primary.dispose()
    this.gains.shadow.dispose()
  }
}
