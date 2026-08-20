import {
  PATTERN_IDS,
  VOICE_IDS,
  type ArrangementOccurrence,
  type AutomationTarget,
  type Composition,
  type Pattern,
  type PatternId,
  type Step,
  type VoiceId,
} from '../model/composition'

const amount = (value: number) => Number(value.toFixed(3)).toString()
const stepNumber = (index: number) => String(index + 1).padStart(2, '0')

function noteAssignments(pattern: Pattern, lane: 'notes' | 'bass'): string {
  const assignments: string[] = []
  pattern.steps.forEach((step, index) => {
    const value = lane === 'notes' ? step.notes.join('+') : step.bass
    if (!value) return
    const length = lane === 'notes' ? step.chordLength : step.bassLength
    const tie = lane === 'notes' ? step.chordTie : step.bassTie
    assignments.push(`${stepNumber(index)}=${value}${length > 1 ? `~${length}` : ''}${tie ? '>' : ''}`)
  })
  return assignments.length ? assignments.join(' ') : 'none'
}

function hitAssignments(pattern: Pattern, lane: 'drum' | 'texture'): string {
  const hits = pattern.steps.flatMap((step, index) => step[lane] ? [stepNumber(index)] : [])
  return hits.length ? hits.join(' ') : 'none'
}

function emphasisAssignments(pattern: Pattern): string {
  const values = pattern.steps.flatMap((step, index) => step.velocity !== 0.72 ? [`${stepNumber(index)}=${amount(step.velocity)}`] : [])
  return values.length ? values.join(' ') : 'none'
}

function expressionAssignments(pattern: Pattern, key: 'probability' | 'ratchets' | 'microShift', defaultValue: number): string {
  const values = pattern.steps.flatMap((step, index) => step[key] !== defaultValue ? [`${stepNumber(index)}=${amount(step[key])}`] : [])
  return values.length ? values.join(' ') : 'none'
}

function automationAssignments(pattern: Pattern, target: AutomationTarget): string {
  const values = pattern.automation[target].flatMap((value, index) => value === null ? [] : [`${stepNumber(index)}=${amount(value)}`])
  return values.length ? values.join(' ') : 'none'
}

function voiceLine(composition: Composition, id: VoiceId): string {
  const voice = composition.voices[id]
  const layer = voice.layers.primary
  return `  voice ${id}: ${layer.waveform} engine=${layer.engine} octave=${layer.octave} detune=${amount(layer.detune)} layer-level=${amount(layer.level)} character=${amount(layer.character)} attack-scale=${amount(layer.attackScale)} release-scale=${amount(layer.releaseScale)} filter=${voice.filterType} cutoff=${amount(voice.cutoff)} resonance=${amount(voice.resonance)} glide=${amount(voice.glide)} volume=${amount(voice.volume)} attack=${amount(voice.attack)} decay=${amount(voice.decay)} sustain=${amount(voice.sustain)} release=${amount(voice.release)} send-fracture=${amount(voice.sends.fracture)} send-veil=${amount(voice.sends.veil)} send-memory=${amount(voice.sends.memory)} send-environment=${amount(voice.sends.environment)} mute=${voice.mute ? 'on' : 'off'} solo=${voice.solo ? 'on' : 'off'}`
}

function shadowLine(composition: Composition, id: VoiceId): string {
  const layer = composition.voices[id].layers.shadow
  return `  layer ${id} shadow: ${layer.enabled ? 'on' : 'off'} engine=${layer.engine} waveform=${layer.waveform} octave=${layer.octave} detune=${amount(layer.detune)} level=${amount(layer.level)} character=${amount(layer.character)} attack-scale=${amount(layer.attackScale)} release-scale=${amount(layer.releaseScale)}`
}

function arrangementOccurrence(occurrence: ArrangementOccurrence): string {
  const options: string[] = []
  if (occurrence.transpose) options.push(`transpose=${occurrence.transpose}`)
  if (occurrence.rotate) options.push(`rotate=${occurrence.rotate}`)
  if (occurrence.mute.length) options.push(`mute=${VOICE_IDS.filter((voice) => occurrence.mute.includes(voice)).join('+')}`)
  const layers = VOICE_IDS.flatMap((voice) => occurrence.layers[voice] ? [`${voice}:${occurrence.layers[voice]}`] : [])
  if (layers.length) options.push(`layers=${layers.join('+')}`)
  const effects = (['mask', 'memory', 'veil', 'fracture', 'ghost', 'overclock'] as const).flatMap((target) => occurrence.effects[target] === undefined ? [] : [`${target}:${amount(occurrence.effects[target]!)}`])
  if (effects.length) options.push(`effects=${effects.join('+')}`)
  return `${occurrence.pattern}${options.length ? `[${options.join(',')}]` : ''}`
}

export function serializeComposition(composition: Composition): string {
  const lines = [
    `scene "${composition.name.replace(/"/g, '')}" {`,
    `  format-version: ${composition.formatVersion}`,
    `  style: ${composition.world}`,
    `  style-version: ${composition.styleVersion}`,
    `  influences: ${composition.styleInfluences.length ? composition.styleInfluences.map((influence) => `${influence.id}=${amount(influence.amount)}`).join(' ') : 'none'}`,
    `  tempo: ${amount(composition.bpm)}`,
    `  meter: ${composition.meter}`,
    `  steps: ${composition.stepCount}`,
    `  swing: ${amount(composition.swing)}`,
    `  seed: ${composition.seed}`,
    `  scale: ${composition.scaleRoot} ${composition.scaleMode}`,
    `  lock: ${composition.scaleLock ? 'on' : 'off'}`,
    `  patterns: ${PATTERN_IDS.join(' ')}`,
    `  active: ${composition.activePatternId}`,
    `  arrangement: ${composition.arrangement.map(arrangementOccurrence).join(' ')}`,
    `  patch chords: ${composition.voices.chords.patchId ?? 'custom'}`,
    voiceLine(composition, 'chords'),
    shadowLine(composition, 'chords'),
    `  patch bass: ${composition.voices.bass.patchId ?? 'custom'}`,
    voiceLine(composition, 'bass'),
    shadowLine(composition, 'bass'),
    `  patch pulse: ${composition.voices.pulse.patchId ?? 'custom'}`,
    voiceLine(composition, 'pulse'),
    shadowLine(composition, 'pulse'),
    `  patch texture: ${composition.voices.texture.patchId ?? 'custom'}`,
    voiceLine(composition, 'texture'),
    shadowLine(composition, 'texture'),
    `  memory: ${amount(composition.sound.memory)}`,
    `  environment: ${amount(composition.sound.environment)}`,
    `  veil: ${amount(composition.sound.veil)}`,
    `  fracture: ${amount(composition.sound.fracture)}`,
    `  ghost: ${amount(composition.sound.ghost)}`,
    `  humanize: ${amount(composition.sound.humanize)}`,
    `  overclock: ${amount(composition.sound.overclock)}`,
    `  output: ${amount(composition.masterVolume)}`,
    '',
  ]

  for (const pattern of composition.patterns) {
    lines.push(`  // Pattern ${pattern.id}`)
    lines.push(`  notes ${pattern.id}: ${noteAssignments(pattern, 'notes')}`)
    lines.push(`  bass ${pattern.id}: ${noteAssignments(pattern, 'bass')}`)
    lines.push(`  pulse ${pattern.id}: ${hitAssignments(pattern, 'drum')}`)
    lines.push(`  texture ${pattern.id}: ${hitAssignments(pattern, 'texture')}`)
    lines.push(`  emphasis ${pattern.id}: ${emphasisAssignments(pattern)}`)
    lines.push(`  chance ${pattern.id}: ${expressionAssignments(pattern, 'probability', 1)}`)
    lines.push(`  ratchet ${pattern.id}: ${expressionAssignments(pattern, 'ratchets', 1)}`)
    lines.push(`  shift ${pattern.id}: ${expressionAssignments(pattern, 'microShift', 0)}`)
    for (const target of ['mask', 'memory', 'veil', 'fracture', 'ghost', 'overclock'] as AutomationTarget[]) {
      const mode = pattern.automationModes?.[target] === 'linear' ? ' linear' : ''
      lines.push(`  automate ${target} ${pattern.id}${mode}: ${automationAssignments(pattern, target)}`)
    }
    lines.push('')
  }
  lines.push('}')
  return lines.join('\n')
}

export interface TokenRange {
  from: number
  to: number
}

export function activeTokenRanges(source: string, step: number, patternId?: PatternId): TokenRange[] {
  const ranges: TokenRange[] = []
  const needle = stepNumber(step)
  let offset = 0

  for (const line of source.replace(/\r/g, '').split('\n')) {
    const match = /^\s*(notes|bass|pulse|texture|emphasis|chance|ratchet|shift|automate\s+\w+)\s+([A-D])(?:\s+(?:hold|linear))?\s*:\s*(.*)$/.exec(line)
    if (match && (!patternId || match[2] === patternId)) {
      const valueStart = line.indexOf(match[3])
      for (const token of match[3].matchAll(/\S+/g)) {
        if (token.index === undefined || (token[0] !== needle && !token[0].startsWith(`${needle}=`))) continue
        ranges.push({ from: offset + valueStart + token.index, to: offset + valueStart + token.index + token[0].length })
      }
    }
    offset += line.length + 1
  }
  return ranges
}

export function summarizeCompositionChange(current: Composition, pending: Composition): string[] {
  const changes: string[] = []
  if (current.bpm !== pending.bpm) changes.push(`tempo ${current.bpm} → ${pending.bpm}`)
  if (current.world !== pending.world) changes.push(`style ${current.world} → ${pending.world}`)
  if (current.meter !== pending.meter || current.stepCount !== pending.stepCount || current.swing !== pending.swing) changes.push('timing & groove')
  if (JSON.stringify(current.arrangement) !== JSON.stringify(pending.arrangement)) changes.push('arrangement')
  if (JSON.stringify(current.voices) !== JSON.stringify(pending.voices)) changes.push('voice settings')
  if (JSON.stringify(current.patterns) !== JSON.stringify(pending.patterns)) changes.push('patterns & automation')
  if (JSON.stringify(current.sound) !== JSON.stringify(pending.sound)) changes.push('effects')
  return changes.slice(0, 3)
}

export function serializeStepForClipboard(step: Step): string {
  return step.notes.length ? step.notes.join('+') : '.'
}
