import * as Tone from 'tone'
import { clamp, getPattern, meterParts, stepsPerBeat, type ApplyQuantization, type Composition, type PatternId, type VoiceId } from '../model/composition'
import { mapOverclock } from './overclock'
import { advanceFatigue, resolveSequencerStep } from './sequencing'
import { delayFeedback, delayWet, INPUT_GAIN, LIMITER_CEILING_DB, masterOutputDb, reverbWet, textureNoiseType } from './signalPath'
import { mapFracture, mapVeil } from './soundverse'

type Boundary = ApplyQuantization
interface PerformanceState { pressure: boolean; freeze: boolean }
interface VoiceChannel { filter: Tone.Filter; volume: Tone.Volume }

export interface AudioEngineCallbacks {
  getComposition: () => Composition
  getPerformance: () => PerformanceState
  applyBoundary: (boundary: Boundary) => Composition
  onPosition: (step: number, pattern: PatternId, arrangementIndex: number) => void
  onExhaustion: (amount: number) => void
}

export class VioletAudioEngine {
  private poly: Tone.PolySynth | null = null
  private bass: Tone.MonoSynth | null = null
  private percussion: Tone.MembraneSynth | null = null
  private texture: Tone.NoiseSynth | null = null
  private channels: Partial<Record<VoiceId, VoiceChannel>> = {}
  private input: Tone.Gain | null = null
  private drive: Tone.Distortion | null = null
  private crusher: Tone.BitCrusher | null = null
  private chorus: Tone.Chorus | null = null
  private delay: Tone.FeedbackDelay | null = null
  private reverb: Tone.Reverb | null = null
  private output: Tone.Volume | null = null
  private limiter: Tone.Limiter | null = null
  private recorder: Tone.Recorder | null = null
  private scheduleId: number | null = null
  private initialized = false
  private recording = false
  private step = 0
  private cycle = 0
  private barIndex = 0
  private heat = 0
  private exhaustion = 0
  private visualGeneration = 0
  private compositionId = ''
  private lastChord: string[] = ['C4', 'Eb4', 'G4']

  constructor(private readonly callbacks: AudioEngineCallbacks) {}

  private makeChannel(composition: Composition, id: VoiceId): VoiceChannel {
    const settings = composition.voices[id]
    const filter = new Tone.Filter({ type: settings.filterType, frequency: settings.cutoff, rolloff: -24, Q: settings.resonance })
    const volume = new Tone.Volume(settings.volume)
    filter.chain(volume, this.input!)
    return { filter, volume }
  }

  async initialize(composition: Composition): Promise<void> {
    await Tone.start()
    if (this.initialized) return
    this.input = new Tone.Gain(INPUT_GAIN)
    this.drive = new Tone.Distortion({ distortion: 0, oversample: '2x' })
    const fracture = mapFracture(composition.sound.fracture)
    const veil = mapVeil(composition.sound.veil)
    this.crusher = new Tone.BitCrusher(fracture.bits)
    this.crusher.wet.value = fracture.wet
    this.chorus = new Tone.Chorus({
      frequency: veil.frequency,
      delayTime: veil.delayTime,
      depth: veil.depth,
      spread: 180,
      wet: veil.wet,
    }).start()
    this.delay = new Tone.FeedbackDelay({ delayTime: '8n.', feedback: delayFeedback(composition.sound.memory), wet: delayWet(composition.sound.memory) })
    this.reverb = new Tone.Reverb({ decay: 3.2, preDelay: 0.035, wet: reverbWet(composition.sound.environment) })
    this.output = new Tone.Volume(composition.masterVolume)
    this.limiter = new Tone.Limiter(LIMITER_CEILING_DB).toDestination()
    this.recorder = new Tone.Recorder()
    this.input.chain(this.drive, this.crusher, this.chorus, this.delay, this.reverb, this.output, this.limiter)
    this.limiter.connect(this.recorder)
    await this.reverb.ready

    for (const id of ['chords', 'bass', 'pulse', 'texture'] as VoiceId[]) this.channels[id] = this.makeChannel(composition, id)
    const chords = composition.voices.chords
    this.poly = new Tone.PolySynth(Tone.Synth, { oscillator: { type: chords.core }, envelope: { attack: chords.attack, decay: chords.decay, sustain: chords.sustain, release: chords.release } }).connect(this.channels.chords!.filter)
    this.poly.maxPolyphony = 16
    const bass = composition.voices.bass
    this.bass = new Tone.MonoSynth({
      oscillator: { type: bass.core }, filter: { type: 'lowpass', rolloff: -24, Q: 1.2 },
      filterEnvelope: { attack: 0.01, decay: 0.22, sustain: 0.18, release: 0.6, baseFrequency: 70, octaves: 2.4 },
      envelope: { attack: bass.attack, decay: bass.decay, sustain: bass.sustain, release: bass.release },
      portamento: bass.glide,
    }).connect(this.channels.bass!.filter)
    const pulse = composition.voices.pulse
    this.percussion = new Tone.MembraneSynth({ pitchDecay: 0.018, octaves: 4, oscillator: { type: pulse.core }, envelope: { attack: pulse.attack, decay: pulse.decay, sustain: pulse.sustain, release: pulse.release } }).connect(this.channels.pulse!.filter)
    this.texture = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: composition.voices.texture.attack, decay: composition.voices.texture.decay, sustain: composition.voices.texture.sustain, release: composition.voices.texture.release } }).connect(this.channels.texture!.filter)

    const transport = Tone.getTransport()
    transport.timeSignature = meterParts(composition.meter)
    this.scheduleId = transport.scheduleRepeat((time) => this.tick(time), '16n')
    this.initialized = true
    this.update(composition)
  }

  update(composition: Composition): void {
    if (!this.initialized) return
    if (composition.id !== this.compositionId) {
      this.compositionId = composition.id
      this.heat = 0
      this.exhaustion = 0
    }
    const mapped = mapOverclock(composition.sound.overclock + (this.callbacks.getPerformance().pressure ? 0.28 : 0), this.exhaustion)
    const fracture = mapFracture(composition.sound.fracture)
    const veil = mapVeil(composition.sound.veil)
    const transport = Tone.getTransport()
    transport.timeSignature = meterParts(composition.meter)
    Tone.getTransport().bpm.rampTo(composition.bpm, 0.08)
    if (this.drive) this.drive.distortion = mapped.drive
    this.crusher?.wet.rampTo(fracture.wet, 0.1)
    this.crusher?.bits.rampTo(fracture.bits, 0.1)
    if (this.chorus) {
      this.chorus.wet.rampTo(veil.wet, 0.12)
      this.chorus.frequency.rampTo(veil.frequency, 0.12)
      this.chorus.depth = veil.depth
      this.chorus.delayTime = veil.delayTime
    }
    this.delay?.wet.rampTo(delayWet(composition.sound.memory), 0.1)
    this.delay?.feedback.rampTo(this.callbacks.getPerformance().freeze ? 0.82 : delayFeedback(composition.sound.memory), 0.1)
    this.reverb?.wet.rampTo(reverbWet(composition.sound.environment), 0.15)
    this.output?.volume.rampTo(masterOutputDb(composition.masterVolume, mapped.outputTrimDb), 0.08)

    const anySolo = Object.values(composition.voices).some((voice) => voice.solo)
    for (const id of ['chords', 'bass', 'pulse', 'texture'] as VoiceId[]) {
      const voice = composition.voices[id]
      const channel = this.channels[id]
      if (!channel) continue
      channel.volume.volume.rampTo(voice.volume, 0.06)
      channel.volume.mute = voice.mute || (anySolo && !voice.solo)
      channel.filter.type = voice.filterType
      channel.filter.Q.rampTo(voice.resonance, 0.06)
      channel.filter.frequency.rampTo(clamp(voice.cutoff * (id === 'chords' ? mapped.brightness : 1), 80, 12000), 0.06)
    }
    const chordVoice = composition.voices.chords
    this.poly?.set({ oscillator: { type: chordVoice.core }, envelope: { attack: chordVoice.attack * mapped.envelopeScale, decay: chordVoice.decay * mapped.envelopeScale, sustain: chordVoice.sustain, release: chordVoice.release * mapped.envelopeScale }, detune: chordVoice.detune + mapped.pitchDriftCents })
    const bassVoice = composition.voices.bass
    this.bass?.set({ oscillator: { type: bassVoice.core }, envelope: { attack: bassVoice.attack, decay: bassVoice.decay, sustain: bassVoice.sustain, release: bassVoice.release }, detune: bassVoice.detune, portamento: bassVoice.glide })
    const pulseVoice = composition.voices.pulse
    this.percussion?.set({ oscillator: { type: pulseVoice.core }, envelope: { attack: pulseVoice.attack, decay: pulseVoice.decay, sustain: pulseVoice.sustain, release: pulseVoice.release }, detune: pulseVoice.detune })
    this.texture?.set({ noise: { type: textureNoiseType(composition.voices.texture.core) } })
  }

  private tick(time: number): void {
    const initialComposition = this.callbacks.getComposition()
    const beatSize = stepsPerBeat(initialComposition.meter)
    const boundary: Boundary = this.step === 0 ? 'bar' : this.step % beatSize === 0 ? 'beat' : 'step'
    const composition = this.callbacks.applyBoundary(boundary)
    const arrangementIndex = this.barIndex % Math.max(1, composition.arrangement.length)
    const patternId = composition.arrangement[arrangementIndex] ?? composition.activePatternId
    const pattern = getPattern(composition, patternId)
    if (this.step >= pattern.steps.length) this.step = 0
    const current = pattern.steps[this.step]
    const performance = this.callbacks.getPerformance()
    const stepDuration = Tone.Time('16n').toSeconds()
    const resolved = resolveSequencerStep(composition, pattern, this.step, this.cycle, this.exhaustion, performance.pressure, stepDuration)
    const veil = mapVeil(resolved.veil)
    const fracture = mapFracture(resolved.fracture)
    this.channels.chords?.filter.frequency.rampTo(clamp(resolved.mask * resolved.mapped.brightness, 80, 12000), 0.03)
    this.delay?.wet.rampTo(delayWet(resolved.memory), 0.04)
    this.delay?.feedback.rampTo(performance.freeze ? 0.82 : delayFeedback(resolved.memory), 0.04)
    this.chorus?.wet.rampTo(veil.wet, 0.04)
    this.crusher?.wet.rampTo(fracture.wet, 0.04)
    this.crusher?.bits.rampTo(fracture.bits, 0.04)

    const jitteredTime = time + resolved.timingOffset
    const ratchetSpacing = stepDuration / resolved.ratchets
    const triggerTimes = Array.from({ length: resolved.ratchets }, (_, index) => jitteredTime + index * ratchetSpacing)

    if (current.notes.length && resolved.shouldPlay) this.lastChord = [...current.notes]
    if (resolved.shouldPlay && (current.notes.length || resolved.isGhostChord)) {
      const chord = current.notes.length ? current.notes : this.lastChord
      const intendedDuration = resolved.isGhostChord ? stepDuration * 0.45 : stepDuration * current.chordLength * 0.94
      const duration = resolved.ratchets > 1 ? Math.min(intendedDuration, ratchetSpacing * 0.82) : intendedDuration
      for (const triggerTime of triggerTimes) this.poly?.triggerAttackRelease(chord, duration, triggerTime, clamp(current.velocity * (resolved.isGhostChord ? 0.3 : 0.72), 0.08, 0.78))
    }
    if (resolved.shouldPlay && current.bass) {
      const intendedDuration = stepDuration * current.bassLength * 0.92
      const duration = resolved.ratchets > 1 ? Math.min(intendedDuration, ratchetSpacing * 0.82) : intendedDuration
      for (const triggerTime of triggerTimes) this.bass?.triggerAttackRelease(current.bass, duration, triggerTime, clamp(current.velocity * 0.72, 0.12, 0.72))
    }
    if (resolved.shouldPlay && (current.drum || resolved.isGhostDrum)) {
      for (const triggerTime of triggerTimes) this.percussion?.triggerAttackRelease(resolved.isGhostDrum ? 'C1' : this.step % beatSize === 0 ? 'C1' : 'G1', Math.min(stepDuration * 0.5, ratchetSpacing * 0.72), triggerTime, clamp(current.velocity * (resolved.isGhostDrum ? 0.26 : 0.62), 0.08, 0.64))
    }
    if (resolved.shouldPlay && current.texture) {
      for (const triggerTime of triggerTimes) this.texture?.triggerAttackRelease(Math.min(stepDuration * 1.7, ratchetSpacing * 0.82), triggerTime, clamp(current.velocity * 0.28, 0.05, 0.28))
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

  start(): void { if (this.initialized) Tone.getTransport().start() }
  pause(): void { Tone.getTransport().pause(); this.visualGeneration += 1; this.poly?.releaseAll(); this.bass?.triggerRelease() }
  stop(): void {
    Tone.getTransport().stop(); this.visualGeneration += 1; this.step = 0; this.cycle = 0; this.barIndex = 0
    this.poly?.releaseAll(); this.bass?.triggerRelease()
    const composition = this.callbacks.getComposition()
    this.callbacks.onPosition(-1, composition.activePatternId, 0)
  }
  audition(note: string): void { if (this.initialized) this.poly?.triggerAttackRelease(note, '8n', Tone.now(), 0.55) }
  async startRecording(): Promise<void> { if (!this.recorder || this.recording) return; await this.recorder.start(); this.recording = true }
  async stopRecording(): Promise<Blob | null> { if (!this.recorder || !this.recording) return null; const blob = await this.recorder.stop(); this.recording = false; return blob }
  panic(): void { this.stop(); this.percussion?.triggerRelease(); this.texture?.triggerRelease(); this.heat = 0; this.exhaustion = 0; this.callbacks.onExhaustion(0) }

  dispose(): void {
    this.stop()
    if (this.scheduleId !== null) Tone.getTransport().clear(this.scheduleId)
    this.scheduleId = null
    this.poly?.dispose(); this.bass?.dispose(); this.percussion?.dispose(); this.texture?.dispose()
    for (const channel of Object.values(this.channels)) { channel.filter.dispose(); channel.volume.dispose() }
    this.channels = {}
    this.input?.dispose(); this.drive?.dispose(); this.crusher?.dispose(); this.chorus?.dispose(); this.delay?.dispose(); this.reverb?.dispose(); this.output?.dispose(); this.limiter?.dispose(); this.recorder?.dispose()
    this.poly = null; this.bass = null; this.percussion = null; this.texture = null; this.initialized = false
  }
}
