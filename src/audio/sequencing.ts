import { clamp, type Composition, type Pattern } from '../model/composition'
import { mapOverclock, type OverclockMapping } from './overclock'
import { seededBipolar, seededUnit } from './random'
import { humanizedStepOffset } from './timing'

export interface ResolvedSequencerStep {
  overclock: number
  mapped: OverclockMapping
  mask: number
  memory: number
  veil: number
  fracture: number
  ghost: number
  timingOffset: number
  isGhostChord: boolean
  isGhostDrum: boolean
}

export interface FatigueState {
  heat: number
  exhaustion: number
}

export function automatedValue(lane: Array<number | null>, step: number, fallback: number): number {
  if (lane[step] !== null) return lane[step]!
  for (let distance = 1; distance <= lane.length; distance += 1) {
    const index = (step - distance + lane.length) % lane.length
    if (lane[index] !== null) return lane[index]!
  }
  return fallback
}

export function resolveSequencerStep(
  composition: Composition,
  pattern: Pattern,
  step: number,
  cycle: number,
  exhaustion = 0,
  pressure = false,
): ResolvedSequencerStep {
  const current = pattern.steps[step]
  const automatedOverclock = automatedValue(pattern.automation.overclock, step, composition.sound.overclock)
  const overclock = clamp(automatedOverclock + (pressure ? 0.3 : 0), 0, 1)
  const mapped = mapOverclock(overclock, exhaustion)
  const ghost = automatedValue(pattern.automation.ghost, step, composition.sound.ghost)
  const ghostChance = clamp(ghost * 0.18 + mapped.activityBoost, 0, 0.42)

  return {
    overclock,
    mapped,
    mask: automatedValue(pattern.automation.mask, step, composition.voices.chords.cutoff),
    memory: automatedValue(pattern.automation.memory, step, composition.sound.memory),
    veil: automatedValue(pattern.automation.veil, step, composition.sound.veil),
    fracture: automatedValue(pattern.automation.fracture, step, composition.sound.fracture),
    ghost,
    timingOffset: humanizedStepOffset(
      step,
      composition.sound.humanize,
      mapped.timingInstability,
      seededBipolar(composition.seed, cycle, step, 1),
    ),
    isGhostChord: current.notes.length === 0 && seededUnit(composition.seed, cycle, step, 2) < ghostChance,
    isGhostDrum: !current.drum && seededUnit(composition.seed, cycle, step, 3) < ghost * 0.13,
  }
}

export function advanceFatigue(state: FatigueState, overclock: number): FatigueState {
  let heat = clamp(state.heat + (overclock > 0.76 ? (overclock - 0.76) * 0.17 : -0.035), 0, 1)
  let exhaustion = state.exhaustion
  if (heat >= 0.98) { exhaustion = 1; heat = 0.42 }
  else if (exhaustion > 0) exhaustion = clamp(exhaustion - 0.035, 0, 1)
  return { heat, exhaustion }
}
