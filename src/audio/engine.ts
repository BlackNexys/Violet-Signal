import * as Tone from 'tone'
import { VOICE_IDS, clamp, meterParts, stepsPerBeat, type ApplyQuantization, type Composition, type PatternId, type VoiceId } from '../model/composition'
import { occurrenceAllowsVoice, occurrenceLayerSelection, resolveArrangementOccurrence, transposeOccurrenceNote, transposeOccurrenceNotes } from '../model/arrangement'
import { mapOverclock } from './overclock'
import { advanceFatigue, resolveSequencerStep } from './sequencing'
import { LIMITER_CEILING_DB, liveMonitorOutputDb, memoryDelaySeconds } from './signalPath'
import { LayeredVoiceSource } from './instrumentSource'
import { resolvePendingRelease, resolvePitchedLifecycle } from './legato'
import {
  automateParallelEffectRouting,
  createParallelEffectRouting,
  createVoiceSendRoute,
  disposeParallelEffectRouting,
  disposeVoiceSendRoute,
  updateParallelEffectRouting,
  updateVoiceSendRoute,
  type ParallelEffectRouting,
  type VoiceSendRoute,
} from './effectRouting'

type Boundary = ApplyQuantization
interface PerformanceState { pressure: boolean; freeze: boolean }
interface VoiceChannel { filter: Tone.Filter; volume: Tone.Volume; route: VoiceSendRoute }

export interface AudioEngineCallbacks {
  getComposition: () => Composition
  getPerformance: () => PerformanceState
  applyBoundary: (boundary: Boundary) => Composition
  onPosition: (step: number, pattern: PatternId, arrangementIndex: number) => void
  onExhaustion: (amount: number) => void
}

export class VioletAudioEngine {
  private sources: Partial<Record<VoiceId, LayeredVoiceSource>> = {}
  private channels: Partial<Record<VoiceId, VoiceChannel>> = {}
  private routing: ParallelEffectRouting | null = null
  private limiter: Tone.Limiter | null = null
  private recorder: Tone.Recorder | null = null
  private initialization: Promise<void> | null = null
  private scheduleId: number | null = null
  private initialized = false
  private disposed = false
  private recording = false
  private step = 0
  private cycle = 0
  private barIndex = 0
  private heat = 0
  private exhaustion = 0
  private visualGeneration = 0
  private compositionId = ''
  private lastChord: string[] = ['C4', 'Eb4', 'G4']
  private chordTied = false
  private signalTied = false
  private bassTied = false
  private chordReleaseAt: number | null = null
  private signalReleaseAt: number | null = null
  private bassReleaseAt: number | null = null

  constructor(private readonly callbacks: AudioEngineCallbacks) {}

  private makeChannel(composition: Composition, id: VoiceId): VoiceChannel {
    const settings = composition.voices[id]
    const filter = new Tone.Filter({ type: settings.filterType, frequency: settings.cutoff, rolloff: -24, Q: settings.resonance })
    const volume = new Tone.Volume(settings.volume)
    filter.connect(volume)
    const route = createVoiceSendRoute(volume, this.routing!, settings.sends)
    return { filter, volume, route }
  }

  async initialize(composition: Composition): Promise<void> {
    if (this.disposed) return
    await Tone.start()
    if (this.disposed) return
    if (this.initialized) { this.update(composition); return }
    if (!this.initialization) this.initialization = this.initializeGraph(composition)
    try {
      await this.initialization
    } finally {
      this.initialization = null
    }
    if (this.initialized) this.update(composition)
  }

  private async initializeGraph(composition: Composition): Promise<void> {
    if (this.initialized || this.disposed) return
    this.limiter = new Tone.Limiter(LIMITER_CEILING_DB).toDestination()
    this.recorder = new Tone.Recorder()
    this.routing = createParallelEffectRouting(composition.sound, 0, liveMonitorOutputDb(composition.masterVolume, 0), memoryDelaySeconds(composition.bpm), this.limiter)
    this.limiter.connect(this.recorder)
    await this.routing.reverb.ready
    if (this.disposed) return

    for (const id of VOICE_IDS) this.channels[id] = this.makeChannel(composition, id)
    for (const id of VOICE_IDS) {
      this.sources[id] = new LayeredVoiceSource(id, this.channels[id]!.filter, composition.voices[id])
    }

    const transport = Tone.getTransport()
    transport.timeSignature = meterParts(composition.meter)
    this.scheduleId = transport.scheduleRepeat((time) => this.tick(time), '16n')
    this.initialized = true
  }

  update(composition: Composition): void {
    if (!this.initialized) return
    if (composition.id !== this.compositionId) {
      this.compositionId = composition.id
      this.heat = 0
      this.exhaustion = 0
    }
    const mapped = mapOverclock(composition.sound.overclock + (this.callbacks.getPerformance().pressure ? 0.28 : 0), this.exhaustion)
    const transport = Tone.getTransport()
    transport.timeSignature = meterParts(composition.meter)
    Tone.getTransport().bpm.rampTo(composition.bpm, 0.08)
    if (this.routing) {
      updateParallelEffectRouting(this.routing, composition.sound, mapped.drive, liveMonitorOutputDb(composition.masterVolume, mapped.outputTrimDb), this.callbacks.getPerformance().freeze)
      this.routing.delay.delayTime.rampTo(memoryDelaySeconds(composition.bpm), 0.08)
    }

    const anySolo = Object.values(composition.voices).some((voice) => voice.solo)
    for (const id of VOICE_IDS) {
      const voice = composition.voices[id]
      const channel = this.channels[id]
      if (!channel) continue
      channel.volume.volume.rampTo(voice.volume, 0.06)
      channel.volume.mute = voice.mute || (anySolo && !voice.solo)
      channel.filter.type = voice.filterType
      channel.filter.Q.rampTo(voice.resonance, 0.06)
      channel.filter.frequency.rampTo(clamp(voice.cutoff * (id === 'chords' || id === 'signal' ? mapped.brightness : 1), 80, 12000), 0.06)
      updateVoiceSendRoute(channel.route, voice.sends)
    }
    for (const id of VOICE_IDS) {
      this.sources[id]?.update(composition.voices[id], id === 'chords' || id === 'signal'
        ? { envelopeScale: mapped.envelopeScale, pitchDriftCents: mapped.pitchDriftCents, liveMonitoring: true }
        : { envelopeScale: 1, pitchDriftCents: 0, liveMonitoring: true })
    }
  }

  private tick(time: number): void {
    const initialComposition = this.callbacks.getComposition()
    const beatSize = stepsPerBeat(initialComposition.meter)
    const boundary: Boundary = this.step === 0 ? 'bar' : this.step % beatSize === 0 ? 'beat' : 'step'
    const composition = this.callbacks.applyBoundary(boundary)
    const arrangementIndex = this.barIndex % Math.max(1, composition.arrangement.length)
    const { occurrence, pattern } = resolveArrangementOccurrence(composition, arrangementIndex)
    const patternId = occurrence.pattern
    if (this.step >= pattern.steps.length) this.step = 0
    const current = pattern.steps[this.step]
    const performance = this.callbacks.getPerformance()
    const stepDuration = Tone.Time('16n').toSeconds()
    const resolved = resolveSequencerStep(composition, pattern, this.step, this.cycle, this.exhaustion, performance.pressure, stepDuration, occurrence)
    this.channels.chords?.filter.frequency.rampTo(clamp(resolved.mask * resolved.mapped.brightness, 80, 12000), 0.03)
    if (this.routing) automateParallelEffectRouting(this.routing, resolved.memory, resolved.veil, resolved.fracture, composition.sound.environment, performance.freeze)

    const jitteredTime = time + resolved.timingOffset
    const ratchetSpacing = stepDuration / resolved.ratchets
    const triggerTimes = Array.from({ length: resolved.ratchets }, (_, index) => jitteredTime + index * ratchetSpacing)

    const chordAllowed = occurrenceAllowsVoice(composition, occurrence, 'chords')
    const chordCanSound = current.notes.length > 0 && resolved.shouldPlay && chordAllowed
    const chordPending = resolvePendingRelease(this.chordReleaseAt, time, chordCanSound ? jitteredTime : null)
    if (chordPending.releaseTime !== null) this.sources.chords?.release(chordPending.releaseTime)
    this.chordReleaseAt = chordPending.pendingAt
    const chordLifecycle = resolvePitchedLifecycle(this.chordTied, chordCanSound, current.chordTie, resolved.ratchets)
    if (chordLifecycle.releasePrevious) this.sources.chords?.release(chordCanSound ? jitteredTime : time)
    if (current.notes.length && resolved.shouldPlay && chordAllowed) this.lastChord = [...current.notes]
    if (chordCanSound) {
      const chord = transposeOccurrenceNotes(current.notes, occurrence)
      const velocity = clamp(current.velocity * 0.72, 0.08, 0.78)
      const selection = occurrenceLayerSelection(occurrence, 'chords')
      const intendedDuration = stepDuration * current.chordLength * 0.94
      const duration = resolved.ratchets > 1 ? Math.min(intendedDuration, ratchetSpacing * 0.82) : intendedDuration
      if (chordLifecycle.mode === 'attack') this.sources.chords?.attack(chord, jitteredTime, velocity, selection)
      else if (chordLifecycle.mode === 'change') {
        this.sources.chords?.change(chord, jitteredTime, velocity, selection)
        if (!chordLifecycle.held) this.chordReleaseAt = jitteredTime + intendedDuration
      } else for (const triggerTime of triggerTimes) this.sources.chords?.trigger(chord, duration, triggerTime, velocity, selection)
    } else if (resolved.shouldPlay && chordAllowed && resolved.isGhostChord) {
      const chord = transposeOccurrenceNotes(this.lastChord, occurrence)
      this.sources.chords?.trigger(chord, stepDuration * 0.45, jitteredTime, clamp(current.velocity * 0.3, 0.08, 0.78), occurrenceLayerSelection(occurrence, 'chords'))
    }
    this.chordTied = chordLifecycle.held

    const signalAllowed = occurrenceAllowsVoice(composition, occurrence, 'signal')
    const signalCanSound = Boolean(current.signal) && resolved.shouldPlay && signalAllowed
    const signalPending = resolvePendingRelease(this.signalReleaseAt, time, signalCanSound ? jitteredTime : null)
    if (signalPending.releaseTime !== null) this.sources.signal?.release(signalPending.releaseTime)
    this.signalReleaseAt = signalPending.pendingAt
    const signalLifecycle = resolvePitchedLifecycle(this.signalTied, signalCanSound, current.signalTie, resolved.ratchets)
    if (signalLifecycle.releasePrevious) this.sources.signal?.release(signalCanSound ? jitteredTime : time)
    if (signalCanSound && current.signal) {
      const intendedDuration = stepDuration * current.signalLength * 0.92
      const duration = resolved.ratchets > 1 ? Math.min(intendedDuration, ratchetSpacing * 0.82) : intendedDuration
      const signal = transposeOccurrenceNote(current.signal, occurrence)
      const velocity = clamp(current.velocity * 0.66, 0.1, 0.72)
      const selection = occurrenceLayerSelection(occurrence, 'signal')
      if (signalLifecycle.mode === 'attack') this.sources.signal?.attack(signal, jitteredTime, velocity, selection)
      else if (signalLifecycle.mode === 'change') {
        this.sources.signal?.change(signal, jitteredTime, velocity, selection)
        if (!signalLifecycle.held) this.signalReleaseAt = jitteredTime + intendedDuration
      } else for (const triggerTime of triggerTimes) this.sources.signal?.trigger(signal, duration, triggerTime, velocity, selection)
    }
    this.signalTied = signalLifecycle.held

    const bassAllowed = occurrenceAllowsVoice(composition, occurrence, 'bass')
    const bassCanSound = Boolean(current.bass) && resolved.shouldPlay && bassAllowed
    const bassPending = resolvePendingRelease(this.bassReleaseAt, time, bassCanSound ? jitteredTime : null)
    if (bassPending.releaseTime !== null) this.sources.bass?.release(bassPending.releaseTime)
    this.bassReleaseAt = bassPending.pendingAt
    const bassLifecycle = resolvePitchedLifecycle(this.bassTied, bassCanSound, current.bassTie, resolved.ratchets)
    if (bassLifecycle.releasePrevious) this.sources.bass?.release(bassCanSound ? jitteredTime : time)
    if (bassCanSound && current.bass) {
      const intendedDuration = stepDuration * current.bassLength * 0.92
      const duration = resolved.ratchets > 1 ? Math.min(intendedDuration, ratchetSpacing * 0.82) : intendedDuration
      const bass = transposeOccurrenceNote(current.bass, occurrence)
      const velocity = clamp(current.velocity * 0.72, 0.12, 0.72)
      const selection = occurrenceLayerSelection(occurrence, 'bass')
      if (bassLifecycle.mode === 'attack') this.sources.bass?.attack(bass, jitteredTime, velocity, selection)
      else if (bassLifecycle.mode === 'change') {
        this.sources.bass?.change(bass, jitteredTime, velocity, selection)
        if (!bassLifecycle.held) this.bassReleaseAt = jitteredTime + intendedDuration
      } else for (const triggerTime of triggerTimes) this.sources.bass?.trigger(bass, duration, triggerTime, velocity, selection)
    }
    this.bassTied = bassLifecycle.held
    if (resolved.shouldPlay && occurrenceAllowsVoice(composition, occurrence, 'pulse') && (current.drum || resolved.isGhostDrum)) {
      for (const triggerTime of triggerTimes) this.sources.pulse?.trigger(resolved.isGhostDrum ? 'C1' : this.step % beatSize === 0 ? 'C1' : 'G1', Math.min(stepDuration * 0.5, ratchetSpacing * 0.72), triggerTime, clamp(current.velocity * (resolved.isGhostDrum ? 0.26 : 0.62), 0.08, 0.64), occurrenceLayerSelection(occurrence, 'pulse'))
    }
    if (resolved.shouldPlay && current.texture && occurrenceAllowsVoice(composition, occurrence, 'texture')) {
      for (const triggerTime of triggerTimes) this.sources.texture?.trigger(null, Math.min(stepDuration * 1.7, ratchetSpacing * 0.82), triggerTime, clamp(current.velocity * 0.28, 0.05, 0.28), occurrenceLayerSelection(occurrence, 'texture'))
    }

    this.updateFatigue(resolved.overclock, time)
    const visualStep = this.step
    this.scheduleVisual(time, () => this.callbacks.onPosition(visualStep, patternId, arrangementIndex))
    this.step = (this.step + 1) % pattern.steps.length
    if (this.step === 0) { this.cycle += 1; this.barIndex += 1 }
  }

  private scheduleVisual(time: number, callback: () => void): void {
    const generation = this.visualGeneration
    Tone.getDraw().schedule(() => {
      if (generation === this.visualGeneration) callback()
    }, time)
  }

  private updateFatigue(overclock: number, time: number): void {
    const previous = this.exhaustion
    const next = advanceFatigue({ heat: this.heat, exhaustion: this.exhaustion }, overclock)
    this.heat = next.heat
    this.exhaustion = next.exhaustion
    if (this.exhaustion !== previous) {
      const exhaustion = this.exhaustion
      this.scheduleVisual(time, () => this.callbacks.onExhaustion(exhaustion))
    }
  }

  start(): boolean {
    if (!this.initialized) return false
    const transport = Tone.getTransport()
    if (transport.state !== 'started') transport.start()
    return true
  }
  pause(): void {
    if (this.initialized) {
      const transport = Tone.getTransport()
      if (transport.state === 'started') transport.pause()
    }
    this.visualGeneration += 1
    this.chordTied = false; this.signalTied = false; this.bassTied = false; this.chordReleaseAt = null; this.signalReleaseAt = null; this.bassReleaseAt = null
    for (const source of Object.values(this.sources)) source.release()
  }
  stop(): void {
    if (this.initialized) {
      const transport = Tone.getTransport()
      if (transport.state !== 'stopped') transport.stop()
    }
    this.visualGeneration += 1; this.step = 0; this.cycle = 0; this.barIndex = 0
    this.chordTied = false; this.signalTied = false; this.bassTied = false; this.chordReleaseAt = null; this.signalReleaseAt = null; this.bassReleaseAt = null
    for (const source of Object.values(this.sources)) source.release()
    const composition = this.callbacks.getComposition()
    this.callbacks.onPosition(-1, composition.activePatternId, 0)
  }
  audition(note: string, role: VoiceId = 'chords'): void {
    if (!this.initialized) return
    const auditionNote = role === 'pulse' ? 'C1' : role === 'texture' ? null : note
    this.sources[role]?.trigger(auditionNote, Tone.Time('8n').toSeconds(), Tone.now(), 0.55)
  }
  async startRecording(): Promise<void> { if (!this.recorder || this.recording) return; await this.recorder.start(); this.recording = true }
  async stopRecording(): Promise<Blob | null> { if (!this.recorder || !this.recording) return null; const blob = await this.recorder.stop(); this.recording = false; return blob }
  panic(): void { this.stop(); for (const source of Object.values(this.sources)) source.release(); this.heat = 0; this.exhaustion = 0; this.callbacks.onExhaustion(0) }

  dispose(): void {
    this.disposed = true
    this.stop()
    if (this.scheduleId !== null) Tone.getTransport().clear(this.scheduleId)
    this.scheduleId = null
    for (const source of Object.values(this.sources)) source.dispose()
    this.sources = {}
    for (const channel of Object.values(this.channels)) { disposeVoiceSendRoute(channel.route); channel.filter.dispose(); channel.volume.dispose() }
    this.channels = {}
    if (this.routing) disposeParallelEffectRouting(this.routing)
    this.routing = null
    this.limiter?.dispose(); this.recorder?.dispose()
    this.initialized = false
  }
}
