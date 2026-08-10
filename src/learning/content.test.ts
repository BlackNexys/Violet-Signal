import { describe, expect, it } from 'vitest'
import { cheatSections, tutorialSteps } from './content'

describe('built-in learning content', () => {
  it('covers the complete compose-to-capture workflow in a stable order', () => {
    expect(tutorialSteps.map((step) => step.id)).toEqual(['wake', 'styles', 'location', 'notes', 'shape', 'patterns', 'code', 'keep'])
    expect(new Set(tutorialSteps.map((step) => step.id)).size).toBe(tutorialSteps.length)
  })

  it('provides a concrete interface target and useful explanation for every step', () => {
    for (const step of tutorialSteps) {
      expect(step.selector).toMatch(/^[.#]/)
      expect(step.body.length).toBeGreaterThan(30)
      expect(step.detail.length).toBeGreaterThan(30)
    }
  })

  it('documents timing, notation, keyboard, terminology, and project handling', () => {
    expect(cheatSections.map((section) => section.id)).toEqual(['timing', 'notation', 'styles', 'keys', 'terms', 'projects'])
    const notation = cheatSections.find((section) => section.id === 'notation')!
    expect(notation.items.some((item) => item.example?.includes('05=C4+Eb4+G4~4'))).toBe(true)
    expect(notation.items.some((item) => item.example?.includes('automate mask'))).toBe(true)
    expect(notation.items.some((item) => item.example?.includes('automate fracture'))).toBe(true)
    expect(cheatSections.find((section) => section.id === 'styles')?.items.length).toBeGreaterThanOrEqual(8)
  })
})
