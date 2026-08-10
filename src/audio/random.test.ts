import { describe, expect, it } from 'vitest'
import { seededUnit } from './random'

describe('seeded probability', () => {
  it('repeats the same variation for the same musical coordinates', () => {
    const firstPass = Array.from({ length: 16 }, (_, step) => seededUnit(2407, 3, step, 2))
    const secondPass = Array.from({ length: 16 }, (_, step) => seededUnit(2407, 3, step, 2))
    expect(firstPass).toEqual(secondPass)
  })

  it('changes when the seed changes and remains within the unit interval', () => {
    const first = seededUnit(2407, 1, 8, 2)
    const second = seededUnit(2408, 1, 8, 2)
    expect(first).not.toBe(second)
    expect(first).toBeGreaterThanOrEqual(0)
    expect(first).toBeLessThan(1)
  })
})
