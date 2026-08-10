import { clamp } from '../model/composition'

export interface OverclockMapping {
  brightness: number
  drive: number
  envelopeScale: number
  ghostBoost: number
  timingInstability: number
  activityBoost: number
  pitchDriftCents: number
  outputTrimDb: number
}

/** Pure mapping shared by the engine, UI explanation, and safety tests. */
export function mapOverclock(value: number, exhaustion = 0): OverclockMapping {
  const clock = clamp(value, 0, 1)
  const tired = clamp(exhaustion, 0, 1)
  const intensity = clock * clock

  return {
    brightness: clamp(1 + clock * 1.8 - tired * 0.8, 0.55, 2.8),
    drive: clamp(intensity * 0.46, 0, 0.46),
    envelopeScale: clamp(1 - clock * 0.38 + tired * 0.22, 0.62, 1.22),
    ghostBoost: clamp(intensity * 0.3 - tired * 0.1, 0, 0.3),
    timingInstability: clamp(intensity * 0.018, 0, 0.018),
    activityBoost: clamp(intensity * 0.24 - tired * 0.14, 0, 0.24),
    pitchDriftCents: clamp(intensity * 9, 0, 9),
    // Higher drive is counterbalanced before a hard -1 dB limiter.
    outputTrimDb: clamp(-clock * 4.5 - tired * 1.5, -6, 0),
  }
}
