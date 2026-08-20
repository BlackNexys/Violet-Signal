import { describe, expect, it } from 'vitest'
import { resolvePitchedLifecycle } from './legato'

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
})
