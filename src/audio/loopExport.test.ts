import { describe, expect, it } from 'vitest'
import { makeEmptyComposition } from '../model/composition'
import { extractLoopChannels, planLoopExport, WAV_SAMPLE_RATE } from './loopExport'

describe('game loop export', () => {
  it('selects occurrences without mutating or normalizing the written project', () => {
    const composition = makeEmptyComposition()
    const original = structuredClone(composition)
    composition.bpm = 150
    const plan = planLoopExport(composition, { loop: { startOccurrence: 1, endOccurrence: 3 } })!
    expect(plan.occurrences).toEqual(composition.arrangement.slice(1, 3))
    expect(plan.seconds).toBe(3.2)
    expect(plan.frames).toBe(141120)
    expect(plan.start).toBe(1)
    expect(plan.warmupCycles * plan.seconds).toBeGreaterThanOrEqual(12)
    expect(composition.arrangement).toEqual(original.arrangement)
    expect(planLoopExport(composition, {})).toBeNull()
  })

  it.each([[-1, 2], [0, 0], [2, 1], [0, 5], [0.5, 2], [0, NaN]])('rejects invalid boundaries %s:%s', (startOccurrence, endOccurrence) => {
    expect(() => planLoopExport(makeEmptyComposition(), { loop: { startOccurrence, endOccurrence } })).toThrow('boundaries')
  })

  it('preserves exact length and stereo balance while carrying the preceding waveform into the seam', () => {
    const source = Float32Array.from({ length: 2000 }, (_, index) => Math.sin(index / 10) * 0.4)
    const right = source.map(value => value * 0.5)
    const input = { sampleRate: WAV_SAMPLE_RATE, numberOfChannels: 2, getChannelData: (channel: number) => channel ? right : source }
    const [leftLoop, rightLoop] = extractLoopChannels(input, 800, 1000)
    expect(leftLoop.length).toBe(1000)
    expect(leftLoop[0]).toBe(source[800])
    expect(leftLoop[500]).toBe(source[1300])
    expect(leftLoop[999]).toBe(source[799])
    expect(Math.abs(leftLoop[999] - leftLoop[0])).toBeLessThan(0.04)
    expect(rightLoop[999]).toBeCloseTo(leftLoop[999] * 0.5)
    expect(source[1799]).toBeCloseTo(Math.sin(1799 / 10) * 0.4)
  })

  it('rejects an out-of-bounds capture', () => {
    expect(() => extractLoopChannels({ sampleRate: 44100, numberOfChannels: 1, getChannelData: () => new Float32Array(10) }, 8, 10)).toThrow('outside')
  })
})
