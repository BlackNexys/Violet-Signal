import { clamp, type Waveform } from '../model/composition'

export const INPUT_GAIN = 0.54
export const LIMITER_CEILING_DB = -1
export const LIVE_MONITOR_BOOST_DB = 12

export function delayWet(memory: number): number {
  return clamp(memory * 0.5, 0, 0.5)
}

export function delayFeedback(memory: number): number {
  return clamp(0.16 + memory * 0.38, 0.1, 0.58)
}

/** A dotted eighth is three sixteenth-note steps, or three quarters of one beat. */
export function memoryDelaySeconds(bpm: number): number {
  return 45 / clamp(bpm, 30, 300)
}

export function reverbWet(environment: number): number {
  return clamp(environment * 0.48, 0, 0.48)
}

export function masterOutputDb(masterVolume: number, outputTrimDb: number): number {
  return clamp(masterVolume + outputTrimDb, -42, -6)
}

/** Adds editor monitoring headroom without changing written output values or normalized WAV renders. */
export function liveMonitorOutputDb(masterVolume: number, outputTrimDb: number): number {
  return clamp(masterOutputDb(masterVolume, outputTrimDb) + LIVE_MONITOR_BOOST_DB, -30, 6)
}

export function textureNoiseType(core: Waveform): 'brown' | 'pink' | 'white' {
  if (core === 'sine') return 'brown'
  if (core === 'triangle') return 'pink'
  return 'white'
}
