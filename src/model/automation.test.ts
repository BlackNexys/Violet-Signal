import { describe, expect, it } from 'vitest'
import { resolveAutomationValue } from './automation'
import { clonePattern, makeEmptyPattern, type AutomationModes } from './composition'

describe('automation interpolation', () => {
  it('preserves held values across the loop seam', () => {
    const lane = Array.from({ length: 16 }, () => null as number | null)
    lane[4] = 0.25
    lane[12] = 0.75

    expect(resolveAutomationValue(lane, 15, 0, 'hold')).toBe(0.75)
    expect(resolveAutomationValue(lane, 1, 0, 'hold')).toBe(0.75)
  })

  it('interpolates linearly between points and across the loop seam', () => {
    const lane = Array.from({ length: 16 }, () => null as number | null)
    lane[4] = 0.25
    lane[12] = 0.75

    expect(resolveAutomationValue(lane, 8, 0, 'linear')).toBe(0.5)
    expect(resolveAutomationValue(lane, 0, 0, 'linear')).toBe(0.5)
    expect(resolveAutomationValue(lane, 14, 0, 'linear')).toBeCloseTo(0.625)
  })

  it('uses the fallback for an empty lane and a constant for one point', () => {
    const empty = Array.from({ length: 8 }, () => null as number | null)
    expect(resolveAutomationValue(empty, 3, 0.42, 'linear')).toBe(0.42)
    empty[5] = 0.8
    expect(resolveAutomationValue(empty, 1, 0.42, 'linear')).toBe(0.8)
  })

  it('migrates missing lane modes to Hold without changing points', () => {
    const legacy = makeEmptyPattern('A')
    legacy.automation.memory[3] = 0.6
    delete (legacy as unknown as { automationModes?: AutomationModes }).automationModes
    delete (legacy.steps[0] as unknown as { chordTie?: boolean }).chordTie
    delete (legacy.steps[0] as unknown as { bassTie?: boolean }).bassTie

    const migrated = clonePattern(legacy)

    expect(Object.values(migrated.automationModes)).toEqual(Array(6).fill('hold'))
    expect(migrated.automation.memory[3]).toBe(0.6)
    expect(migrated.steps[0]).toMatchObject({ chordTie: false, bassTie: false })
  })
})
