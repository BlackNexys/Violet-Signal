import { describe, expect, it } from 'vitest'
import { resolvePendingRelease, resolvePitchedLifecycle } from './legato'

describe('pitched legato lifecycle', () => {
  it('attacks an outgoing tie and changes pitch through a chain', () => {
    expect(resolvePitchedLifecycle(false, true, true, 1)).toEqual({ mode: 'attack', releasePrevious: false, held: true })
    expect(resolvePitchedLifecycle(true, true, true, 1)).toEqual({ mode: 'change', releasePrevious: false, held: true })
    expect(resolvePitchedLifecycle(true, true, false, 1)).toEqual({ mode: 'change', releasePrevious: false, held: false })
  })

  it('releases a tie on rests, mute, or failed Chance', () => {
    expect(resolvePitchedLifecycle(true, false, true, 1)).toEqual({ mode: 'none', releasePrevious: true, held: false })
  })

  it('breaks a tie before ratcheted retriggers', () => {
    expect(resolvePitchedLifecycle(true, true, true, 3)).toEqual({ mode: 'trigger', releasePrevious: true, held: false })
  })

  it('keeps a terminal tie alive for its authored gate unless another note replaces it', () => {
    expect(resolvePendingRelease(4, 2, null)).toEqual({ releaseTime: null, pendingAt: 4 })
    expect(resolvePendingRelease(4, 4, null)).toEqual({ releaseTime: 4, pendingAt: null })
    expect(resolvePendingRelease(4, 3, 3.08)).toEqual({ releaseTime: 3.08, pendingAt: null })
  })
})
