import { describe, expect, it } from 'vitest'
import { humanizedStepOffset, MAX_HUMANIZED_OFFSET_SECONDS } from './timing'

describe('humanizedStepOffset', () => {
  it('keeps every loop downbeat exactly on the transport grid', () => {
    expect(humanizedStepOffset(0, 0.2, 0.018, 1)).toBe(0)
  })

  it('allows late-only variation away from the loop seam', () => {
    expect(humanizedStepOffset(7, 0.1, 0.002, 0.5)).toBeCloseTo(0.00325)
    expect(humanizedStepOffset(7, 0.1, 0.002, -0.5)).toBe(0)
  })

  it('caps extreme timing offsets at the safe scheduling window', () => {
    expect(humanizedStepOffset(15, 1, 1, 2)).toBe(MAX_HUMANIZED_OFFSET_SECONDS)
  })
})
