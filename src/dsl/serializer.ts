import {
  PATTERN_IDS,
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
    assignments.push(`${stepNumber(index)}=${value}${length > 1 ? `~${length}` : ''}`)
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
  return `  voice ${id}: ${voice.core} filter=${voice.filterType} cutoff=${amount(voice.cutoff)} resonance=${amount(voice.resonance)} detune=${amount(voice.detune)} glide=${amount(voice.glide)} volume=${amount(voice.volume)} attack=${amount(voice.attack)} decay=${amount(voice.decay)} sustain=${amount(voice.sustain)} release=${amount(voice.release)} mute=${voice.mute ? 'on' : 'off'} solo=${voice.solo ? 'on' : 'off'}`
}

export function serializeComposition(composition: Composition): string {
  const lines = [
    `scene "${composition.name.replace(/"/g, '')}" {`,
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
    `  arrangement: ${composition.arrangement.join(' ')}`,
    voiceLine(composition, 'chords'),
    voiceLine(composition, 'bass'),
    voiceLine(composition, 'pulse'),
    voiceLine(composition, 'texture'),
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
      lines.push(`  automate ${target} ${pattern.id}: ${automationAssignments(pattern, target)}`)
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
    const match = /^\s*(notes|bass|pulse|texture|emphasis|chance|ratchet|shift|automate\s+\w+)\s+([A-D])\s*:\s*(.*)$/.exec(line)
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
  if (current.arrangement.join() !== pending.arrangement.join()) changes.push('arrangement')
  if (JSON.stringify(current.voices) !== JSON.stringify(pending.voices)) changes.push('voice settings')
  if (JSON.stringify(current.patterns) !== JSON.stringify(pending.patterns)) changes.push('pattern notes')
  if (JSON.stringify(current.sound) !== JSON.stringify(pending.sound)) changes.push('effects')
  return changes.slice(0, 3)
}

export function serializeStepForClipboard(step: Step): string {
  return step.notes.length ? step.notes.join('+') : '.'
}
