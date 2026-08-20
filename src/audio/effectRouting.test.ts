import { describe, expect, it } from 'vitest'
import { effectSendGain, PARALLEL_DRY_GAIN, SEND_INPUT_TRIM } from './effectRouting'

describe('parallel effect routing gain contract', () => {
  it('keeps dry and send inputs below unity before shared returns', () => {
    expect(PARALLEL_DRY_GAIN).toBeGreaterThan(0)
    expect(PARALLEL_DRY_GAIN).toBeLessThan(1)
    expect(SEND_INPUT_TRIM).toBeGreaterThan(0)
    expect(SEND_INPUT_TRIM).toBeLessThan(1)
  })

  it('clamps every voice send before applying its input trim', () => {
    expect(effectSendGain(-1)).toBe(0)
    expect(effectSendGain(0.5)).toBe(SEND_INPUT_TRIM * 0.5)
    expect(effectSendGain(2)).toBe(SEND_INPUT_TRIM)
  })
})
