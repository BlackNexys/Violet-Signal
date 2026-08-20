import * as Tone from 'tone'
import { EFFECT_SEND_TARGETS, clamp, type EffectSendTarget, type SoundSettings, type VoiceSettings } from '../model/composition'
import { delayFeedback, delayWet, INPUT_GAIN, reverbWet } from './signalPath'
import { mapFracture, mapVeil } from './soundverse'

export const PARALLEL_DRY_GAIN = 0.78
export const SEND_INPUT_TRIM = 0.72

export const effectSendGain = (value: number) => clamp(value, 0, 1) * SEND_INPUT_TRIM

export interface ParallelEffectRouting {
  mix: Tone.Gain
  dry: Tone.Gain
  drive: Tone.Distortion
  crusher: Tone.BitCrusher
  chorus: Tone.Chorus
  delay: Tone.FeedbackDelay
  reverb: Tone.Reverb
  returns: Record<EffectSendTarget, Tone.Gain>
  output: Tone.Volume
}

export interface VoiceSendRoute {
  sends: Record<EffectSendTarget, Tone.Gain>
}

export function createParallelEffectRouting(
  sound: SoundSettings,
  driveAmount: number,
  outputDb: number,
  delayTime: number,
  destination: Tone.InputNode,
): ParallelEffectRouting {
  const fracture = mapFracture(sound.fracture)
  const veil = mapVeil(sound.veil)
  const mix = new Tone.Gain(INPUT_GAIN)
  const drive = new Tone.Distortion({ distortion: driveAmount, oversample: '2x' })
  const output = new Tone.Volume(outputDb).connect(destination)
  mix.chain(drive, output)
  const dry = new Tone.Gain(PARALLEL_DRY_GAIN).connect(mix)
  const returns = {
    fracture: new Tone.Gain(fracture.wet).connect(mix),
    veil: new Tone.Gain(veil.wet).connect(mix),
    memory: new Tone.Gain(delayWet(sound.memory)).connect(mix),
    environment: new Tone.Gain(reverbWet(sound.environment)).connect(mix),
  }
  const crusher = new Tone.BitCrusher(fracture.bits).connect(returns.fracture)
  crusher.wet.value = 1
  const chorus = new Tone.Chorus({
    frequency: veil.frequency,
    delayTime: veil.delayTime,
    depth: veil.depth,
    spread: 180,
    wet: 1,
  }).start().connect(returns.veil)
  const delay = new Tone.FeedbackDelay({ delayTime, feedback: delayFeedback(sound.memory), wet: 1 }).connect(returns.memory)
  const reverb = new Tone.Reverb({ decay: 3.2, preDelay: 0.035, wet: 1 }).connect(returns.environment)
  return { mix, dry, drive, crusher, chorus, delay, reverb, returns, output }
}

export function createVoiceSendRoute(source: Tone.ToneAudioNode, routing: ParallelEffectRouting, sends: VoiceSettings['sends']): VoiceSendRoute {
  source.connect(routing.dry)
  const processors: Record<EffectSendTarget, Tone.InputNode> = {
    fracture: routing.crusher,
    veil: routing.chorus,
    memory: routing.delay,
    environment: routing.reverb,
  }
  const nodes = Object.fromEntries(EFFECT_SEND_TARGETS.map((target) => {
    const gain = new Tone.Gain(effectSendGain(sends[target])).connect(processors[target])
    source.connect(gain)
    return [target, gain]
  })) as Record<EffectSendTarget, Tone.Gain>
  return { sends: nodes }
}

export function updateVoiceSendRoute(route: VoiceSendRoute, sends: VoiceSettings['sends'], ramp = 0.06): void {
  for (const target of EFFECT_SEND_TARGETS) route.sends[target].gain.rampTo(effectSendGain(sends[target]), ramp)
}

export function updateParallelEffectRouting(
  routing: ParallelEffectRouting,
  sound: SoundSettings,
  driveAmount: number,
  outputDb: number,
  freeze: boolean,
): void {
  const fracture = mapFracture(sound.fracture)
  const veil = mapVeil(sound.veil)
  routing.drive.distortion = driveAmount
  routing.returns.fracture.gain.rampTo(fracture.wet, 0.1)
  routing.crusher.bits.rampTo(fracture.bits, 0.1)
  routing.returns.veil.gain.rampTo(veil.wet, 0.12)
  routing.chorus.frequency.rampTo(veil.frequency, 0.12)
  routing.chorus.depth = veil.depth
  routing.chorus.delayTime = veil.delayTime
  routing.returns.memory.gain.rampTo(delayWet(sound.memory), 0.1)
  routing.delay.feedback.rampTo(freeze ? 0.82 : delayFeedback(sound.memory), 0.1)
  routing.returns.environment.gain.rampTo(reverbWet(sound.environment), 0.15)
  routing.output.volume.rampTo(outputDb, 0.08)
}

export function automateParallelEffectRouting(
  routing: ParallelEffectRouting,
  memory: number,
  veil: number,
  fracture: number,
  freeze: boolean,
): void {
  const fractureMapping = mapFracture(fracture)
  routing.returns.fracture.gain.rampTo(fractureMapping.wet, 0.04)
  routing.crusher.bits.rampTo(fractureMapping.bits, 0.04)
  routing.returns.veil.gain.rampTo(mapVeil(veil).wet, 0.04)
  routing.returns.memory.gain.rampTo(delayWet(memory), 0.04)
  routing.delay.feedback.rampTo(freeze ? 0.82 : delayFeedback(memory), 0.04)
}

export function setParallelEffectRoutingAtTime(
  routing: ParallelEffectRouting,
  memory: number,
  veil: number,
  fracture: number,
  time: number,
): void {
  const fractureMapping = mapFracture(fracture)
  routing.returns.fracture.gain.setValueAtTime(fractureMapping.wet, time)
  routing.crusher.bits.setValueAtTime(fractureMapping.bits, time)
  routing.returns.veil.gain.setValueAtTime(mapVeil(veil).wet, time)
  routing.returns.memory.gain.setValueAtTime(delayWet(memory), time)
  routing.delay.feedback.setValueAtTime(delayFeedback(memory), time)
}

export function disposeVoiceSendRoute(route: VoiceSendRoute): void {
  for (const send of Object.values(route.sends)) send.dispose()
}

export function disposeParallelEffectRouting(routing: ParallelEffectRouting): void {
  routing.dry.dispose()
  routing.crusher.dispose()
  routing.chorus.dispose()
  routing.delay.dispose()
  routing.reverb.dispose()
  for (const effectReturn of Object.values(routing.returns)) effectReturn.dispose()
  routing.mix.dispose()
  routing.drive.dispose()
  routing.output.dispose()
}
