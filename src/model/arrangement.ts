import {
  getPattern,
  makeArrangementOccurrence,
  rotatePattern,
  transposeNote,
  type ArrangementLayerSelection,
  type ArrangementOccurrence,
  type Composition,
  type Pattern,
  type VoiceId,
} from './composition'

export interface ResolvedArrangementOccurrence {
  occurrence: ArrangementOccurrence
  pattern: Pattern
}

export function resolveArrangementOccurrence(composition: Composition, index: number): ResolvedArrangementOccurrence {
  const occurrence = composition.arrangement[index] ?? makeArrangementOccurrence(composition.activePatternId)
  const source = getPattern(composition, occurrence.pattern)
  return { occurrence, pattern: occurrence.rotate === 0 ? source : rotatePattern(source, occurrence.rotate) }
}

export function occurrenceLayerSelection(occurrence: ArrangementOccurrence, voice: VoiceId): ArrangementLayerSelection {
  return occurrence.layers[voice] ?? 'all'
}

export function occurrenceAllowsVoice(composition: Composition, occurrence: ArrangementOccurrence, voice: VoiceId): boolean {
  const anySolo = Object.values(composition.voices).some((settings) => settings.solo)
  const settings = composition.voices[voice]
  return !settings.mute && !occurrence.mute.includes(voice) && (!anySolo || settings.solo)
}

export function transposeOccurrenceNotes(notes: string[], occurrence: ArrangementOccurrence): string[] {
  return occurrence.transpose === 0 ? [...notes] : notes.map((note) => transposeNote(note, occurrence.transpose))
}

export function transposeOccurrenceNote(note: string, occurrence: ArrangementOccurrence): string {
  return occurrence.transpose === 0 ? note : transposeNote(note, occurrence.transpose)
}

export function arrangementOccurrenceLabel(occurrence: ArrangementOccurrence): string {
  const modifiers = [
    occurrence.transpose ? `${occurrence.transpose > 0 ? '+' : ''}${occurrence.transpose}` : '',
    occurrence.rotate ? `R${occurrence.rotate > 0 ? '+' : ''}${occurrence.rotate}` : '',
    occurrence.mute.length ? `M${occurrence.mute.length}` : '',
    Object.keys(occurrence.layers).length ? 'L' : '',
    Object.keys(occurrence.effects).length ? 'FX' : '',
  ].filter(Boolean)
  return `${occurrence.pattern}${modifiers.length ? ` ${modifiers.join(' ')}` : ''}`
}

export function arrangementOccurrenceDescription(occurrence: ArrangementOccurrence, index: number): string {
  const details = [`Occurrence ${index + 1}, pattern ${occurrence.pattern}`]
  if (occurrence.transpose) details.push(`transpose ${occurrence.transpose > 0 ? '+' : ''}${occurrence.transpose} semitones`)
  if (occurrence.rotate) details.push(`rotate memory ${occurrence.rotate > 0 ? '+' : ''}${occurrence.rotate} steps`)
  if (occurrence.mute.length) details.push(`mute ${occurrence.mute.join(', ')}`)
  const layers = Object.entries(occurrence.layers).map(([voice, selection]) => `${voice} ${selection}`)
  if (layers.length) details.push(layers.join(', '))
  const effects = Object.entries(occurrence.effects).map(([target, value]) => target === 'mask' ? `${target} ×${value}` : `${target} ${value >= 0 ? '+' : ''}${value}`)
  if (effects.length) details.push(`effects ${effects.join(', ')}`)
  return details.join('; ')
}
