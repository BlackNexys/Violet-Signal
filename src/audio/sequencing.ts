import { resolveAutomationValue } from '../model/automation'
import { clamp, type ArrangementOccurrence, type AutomationMode, type Composition, type OccurrenceEffectTarget, type Pattern } from '../model/composition'
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
  shouldPlay: boolean
  ratchets: number
  isGhostChord: boolean
  isGhostDrum: boolean
}

export interface FatigueState {
  heat: number
  exhaustion: number
}

export function automatedValue(lane: Array<number | null>, step: number, fallback: number, mode: AutomationMode = 'hold'): number {
  return resolveAutomationValue(lane, step, fallback, mode)
}

export function resolveSequencerStep(
  composition: Composition,
  pattern: Pattern,
  step: number,
  cycle: number,
  exhaustion = 0,
  pressure = false,
  stepDuration = 0,
  occurrence?: ArrangementOccurrence,
): ResolvedSequencerStep {
  const current = pattern.steps[step]
  const effectValue = (target: OccurrenceEffectTarget, automated: number) => {
    const modifier = occurrence?.effects[target]
    if (target === 'mask') return automated * (modifier ?? 1)
    return clamp(automated + (modifier ?? 0), 0, 1)
  }
  const automation = (target: OccurrenceEffectTarget, fallback: number) =>
    resolveAutomationValue(pattern.automation[target], step, fallback, pattern.automationModes?.[target] ?? 'hold')
  const automatedOverclock = effectValue('overclock', automation('overclock', composition.sound.overclock))
  const overclock = clamp(automatedOverclock + (pressure ? 0.3 : 0), 0, 1)
  const mapped = mapOverclock(overclock, exhaustion)
  const ghost = effectValue('ghost', automation('ghost', composition.sound.ghost))
  const ghostChance = clamp(ghost * 0.18 + mapped.activityBoost, 0, 0.42)
  const humanizedOffset = humanizedStepOffset(
    step,
    composition.sound.humanize,
    mapped.timingInstability,
    seededBipolar(composition.seed, cycle, step, 1),
  )
  const swingOffset = step > 0 && step % 2 === 1 ? composition.swing * stepDuration * 0.5 : 0
  const microOffset = step > 0 ? clamp(current.microShift ?? 0, -0.45, 0.45) * stepDuration : 0
  const earliestOffset = -Math.min(0.06, stepDuration * 0.4)

  return {
    overclock,
    mapped,
    mask: effectValue('mask', automation('mask', composition.voices.chords.cutoff)),
    memory: effectValue('memory', automation('memory', composition.sound.memory)),
    veil: effectValue('veil', automation('veil', composition.sound.veil)),
    fracture: effectValue('fracture', automation('fracture', composition.sound.fracture)),
    ghost,
    timingOffset: step === 0 ? 0 : clamp(humanizedOffset + swingOffset + microOffset, earliestOffset, stepDuration * 0.48),
    shouldPlay: seededUnit(composition.seed, cycle, step, 4) <= clamp(current.probability ?? 1, 0, 1),
    ratchets: clamp(Math.round(current.ratchets ?? 1), 1, 4),
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
