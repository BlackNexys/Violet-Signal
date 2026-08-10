import { clamp } from '../model/composition'

export interface VeilMapping {
  wet: number
  frequency: number
  depth: number
  delayTime: number
}

export interface FractureMapping {
  wet: number
  bits: number
}

/** Maps the beginner-facing Veil control to a restrained stereo chorus. */
export function mapVeil(value: number): VeilMapping {
  const veil = clamp(value, 0, 1)
  return {
    wet: veil * 0.52,
    frequency: 0.18 + veil * 0.72,
    depth: 0.18 + veil * 0.68,
    delayTime: 5 + veil * 8,
  }
}

/** Keeps Fracture parallel-mixed and above four bits so it erodes without flattening the output. */
export function mapFracture(value: number): FractureMapping {
  const fracture = clamp(value, 0, 1)
  return {
    wet: fracture * 0.7,
    bits: clamp(16 - fracture * 12, 4, 16),
  }
}
