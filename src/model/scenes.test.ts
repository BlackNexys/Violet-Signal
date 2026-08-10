import { describe, expect, it } from 'vitest'
import { scenes } from './scenes'

describe('dark electronic sound worlds', () => {
  it('provides a focused starting scene for every supported world', () => {
    expect(new Set(scenes.map((scene) => scene.world))).toEqual(new Set(['witch-house', 'darksynth', 'darkwave', 'glitch']))
  })

  it('makes the four headline scenes meaningfully different', () => {
    const witchHouse = scenes.find((scene) => scene.id === 'veil-communion')!
    const darksynth = scenes.find((scene) => scene.id === 'midnight-vector')!
    const darkwave = scenes.find((scene) => scene.id === 'cold-circuit')!
    const glitch = scenes.find((scene) => scene.id === 'fractured-broadcast')!

    expect(witchHouse.bpm).toBeLessThan(75)
    expect(witchHouse.sound.environment).toBeGreaterThan(0.6)
    expect(darksynth.sound.overclock).toBeGreaterThan(0.3)
    expect(darkwave.sound.veil).toBeGreaterThan(0.65)
    expect(glitch.sound.fracture).toBeGreaterThan(0.6)
    expect(glitch.sound.ghost).toBeGreaterThan(0.5)
  })

  it('gives every scene automatable Veil and Fracture movement', () => {
    for (const scene of scenes) {
      expect(scene.patterns.every((pattern) => pattern.automation.veil.some((value) => value !== null))).toBe(true)
      expect(scene.patterns.every((pattern) => pattern.automation.fracture.some((value) => value !== null))).toBe(true)
    }
  })
})
