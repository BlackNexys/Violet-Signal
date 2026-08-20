import {
  PATTERN_IDS,
  FORMAT_VERSION,
  METERS,
  STEP_COUNT_OPTIONS,
  isNote,
  isEngineCompatible,
  SCALE_MODES,
  makeArrangementOccurrence,
  makeEmptyComposition,
  noteToMidi,
  resizeComposition,
  type AutomationTarget,
  type ArrangementOccurrence,
  type Composition,
  type PatternId,
  type ScaleMode,
  type FilterType,
  type InstrumentEngine,
  type Meter,
  type VoiceId,
  type VoiceSettings,
  type VoiceLayerSettings,
  type Waveform,
} from '../model/composition'
import { STYLE_DEFINITIONS, isStyleId } from '../model/styles'
import { getInstrumentPatch } from '../model/instrumentPacks'

export interface FriendlyParseError { line: number; message: string; excerpt: string }
export type ParseResult = { ok: true; composition: Composition } | { ok: false; error: FriendlyParseError }

class DslError extends Error {
  constructor(message: string, readonly line: number, readonly excerpt: string) { super(message) }
}

const WAVEFORMS: Waveform[] = ['sine', 'triangle', 'square', 'sawtooth']
const FILTER_TYPES: FilterType[] = ['lowpass', 'highpass', 'bandpass']
const VOICES: VoiceId[] = ['chords', 'bass', 'pulse', 'texture']
const ENGINES: InstrumentEngine[] = ['subtractive', 'fm', 'am', 'dual', 'pluck', 'membrane', 'metal', 'noise']
const STYLE_IDS = STYLE_DEFINITIONS.map((style) => style.id)
function fail(message: string, line: number, excerpt: string): never { throw new DslError(message, line, excerpt) }
function slugify(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled-signal' }

function numberIn(value: string, label: string, min: number, max: number, line: number, excerpt: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) fail(`${label} needs a number, but “${value}” is not one.`, line, excerpt)
  if (parsed < min || parsed > max) fail(`${label} can range from ${min} to ${max}; ${parsed} falls outside the instrument.`, line, excerpt)
  return parsed
}

function onOff(value: string, label: string, line: number, excerpt: string): boolean {
  if (!/^(on|off)$/i.test(value)) fail(`${label} understands “on” or “off”.`, line, excerpt)
  return value.toLowerCase() === 'on'
}

function patternId(value: string, line: number, excerpt: string): PatternId {
  if (!PATTERN_IDS.includes(value as PatternId)) fail(`Pattern “${value}” is not available. Use A, B, C, or D.`, line, excerpt)
  return value as PatternId
}

function parseArrangementOccurrence(value: string, line: number, excerpt: string): ArrangementOccurrence {
  const match = /^([a-d])(?:\[([^\]]+)\])?$/i.exec(value)
  if (!match) fail(`“${value}” needs a pattern letter, optionally followed by [transpose=12,mute=pulse,layers=chords:shadow].`, line, excerpt)
  const occurrence = makeArrangementOccurrence(patternId(match[1].toUpperCase(), line, excerpt))
  if (!match[2]) return occurrence

  const seen = new Set<string>()
  for (const assignment of match[2].split(',')) {
    const option = /^([a-z]+)=(.+)$/i.exec(assignment)
    if (!option) fail(`“${assignment}” needs the form name=value inside the arrangement occurrence.`, line, excerpt)
    const key = option[1].toLowerCase()
    const raw = option[2].toLowerCase()
    if (seen.has(key)) fail(`Occurrence setting “${key}” appears more than once.`, line, excerpt)
    seen.add(key)
    if (key === 'transpose') {
      const transpose = numberIn(raw, 'Occurrence transpose', -24, 24, line, excerpt)
      if (!Number.isInteger(transpose)) fail('Occurrence transpose needs a whole number from -24 to 24.', line, excerpt)
      occurrence.transpose = transpose
      continue
    }
    if (key === 'mute') {
      if (raw === 'none') continue
      const voices = raw.split('+')
      for (const voice of voices) {
        if (!VOICES.includes(voice as VoiceId)) fail(`Occurrence mute can use ${VOICES.join(', ')}.`, line, excerpt)
        if (occurrence.mute.includes(voice as VoiceId)) fail(`Occurrence mute lists “${voice}” more than once.`, line, excerpt)
        occurrence.mute.push(voice as VoiceId)
      }
      continue
    }
    if (key === 'layers') {
      if (raw === 'none') continue
      const configuredVoices = new Set<VoiceId>()
      for (const layerAssignment of raw.split('+')) {
        const layer = /^(chords|bass|pulse|texture):(all|primary|shadow)$/.exec(layerAssignment)
        if (!layer) fail('Occurrence layers use voice:all, voice:primary, or voice:shadow.', line, excerpt)
        const voice = layer[1] as VoiceId
        if (configuredVoices.has(voice)) fail(`Occurrence layers configures “${voice}” more than once.`, line, excerpt)
        configuredVoices.add(voice)
        if (layer[2] !== 'all') occurrence.layers[voice] = layer[2] as 'primary' | 'shadow'
      }
      continue
    }
    fail(`“${key}” is not an arrangement occurrence setting.`, line, excerpt)
  }
  occurrence.mute = VOICES.filter((voice) => occurrence.mute.includes(voice))
  return occurrence
}

function parseAssignments(value: string, stepCount: number, line: number, excerpt: string): Array<{ step: number; value: string; length?: number }> {
  if (value.toLowerCase() === 'none') return []
  return value.split(/\s+/).filter(Boolean).map((token) => {
    const match = /^(\d{1,2})=([^~]+?)(?:~(\d+))?$/.exec(token)
    if (!match) fail(`“${token}” needs the form 05=value.`, line, excerpt)
    const step = Number(match[1])
    if (step < 1 || step > stepCount) fail(`Step ${step} is outside this ${stepCount}-step bar/pattern.`, line, excerpt)
    const length = match[3] ? Number(match[3]) : undefined
    if (length !== undefined && ![1, 2, 3, 4, 8].includes(length)) fail('Note length can be 1, 2, 3, 4, or 8 steps.', line, excerpt)
    return { step: step - 1, value: match[2], length }
  })
}

function parseHits(value: string, stepCount: number, line: number, excerpt: string): number[] {
  if (value.toLowerCase() === 'none') return []
  return value.split(/\s+/).filter(Boolean).map((token) => {
    const step = Number(token)
    if (!Number.isInteger(step) || step < 1 || step > stepCount) fail(`“${token}” is not a step from 01 to ${String(stepCount).padStart(2, '0')}.`, line, excerpt)
    return step - 1
  })
}

function engineFor(raw: string, role: VoiceId, line: number, excerpt: string): InstrumentEngine {
  if (!ENGINES.includes(raw as InstrumentEngine)) fail(`Engine can be ${ENGINES.join(', ')}.`, line, excerpt)
  const engine = raw as InstrumentEngine
  if (!isEngineCompatible(role, engine)) fail(`${engine} is not available for the ${role} voice.`, line, excerpt)
  return engine
}

function parseVoice(value: string, role: VoiceId, voice: VoiceSettings, line: number, excerpt: string): void {
  const tokens = value.split(/\s+/).filter(Boolean)
  const waveform = tokens.shift()
  if (!waveform || !WAVEFORMS.includes(waveform as Waveform)) fail(`Voice starts with ${WAVEFORMS.join(', ')}.`, line, excerpt)
  voice.layers.primary.waveform = waveform as Waveform
  for (const token of tokens) {
    const match = /^(volume|cutoff|attack|decay|sustain|release|filter|resonance|detune|glide|mute|solo|engine|octave|character|layer-level|attack-scale|release-scale)=(.+)$/.exec(token)
    if (!match) fail(`“${token}” is not a voice setting.`, line, excerpt)
    const [, key, raw] = match
    if (key === 'volume') voice.volume = numberIn(raw, 'Voice volume', -36, -4, line, excerpt)
    if (key === 'cutoff') voice.cutoff = numberIn(raw, 'Voice cutoff', 80, 12000, line, excerpt)
    if (key === 'attack') voice.attack = numberIn(raw, 'Attack', 0.005, 2, line, excerpt)
    if (key === 'decay') voice.decay = numberIn(raw, 'Decay', 0.02, 3, line, excerpt)
    if (key === 'sustain') voice.sustain = numberIn(raw, 'Sustain', 0, 1, line, excerpt)
    if (key === 'release') voice.release = numberIn(raw, 'Release', 0.03, 5, line, excerpt)
    if (key === 'filter') {
      if (!FILTER_TYPES.includes(raw as FilterType)) fail(`Filter can be ${FILTER_TYPES.join(', ')}.`, line, excerpt)
      voice.filterType = raw as FilterType
    }
    if (key === 'resonance') voice.resonance = numberIn(raw, 'Resonance', 0, 12, line, excerpt)
    if (key === 'detune') voice.layers.primary.detune = numberIn(raw, 'Detune', -100, 100, line, excerpt)
    if (key === 'engine') voice.layers.primary.engine = engineFor(raw, role, line, excerpt)
    if (key === 'octave') {
      const octave = numberIn(raw, 'Octave', -2, 2, line, excerpt)
      if (!Number.isInteger(octave)) fail('Octave needs a whole number from -2 to 2.', line, excerpt)
      voice.layers.primary.octave = octave
    }
    if (key === 'character') voice.layers.primary.character = numberIn(raw, 'Character', 0, 1, line, excerpt)
    if (key === 'layer-level') voice.layers.primary.level = numberIn(raw, 'Layer level', -36, 0, line, excerpt)
    if (key === 'attack-scale') voice.layers.primary.attackScale = numberIn(raw, 'Attack scale', 0.25, 4, line, excerpt)
    if (key === 'release-scale') voice.layers.primary.releaseScale = numberIn(raw, 'Release scale', 0.25, 4, line, excerpt)
    if (key === 'glide') voice.glide = numberIn(raw, 'Glide', 0, 0.5, line, excerpt)
    if (key === 'mute') voice.mute = onOff(raw, 'Mute', line, excerpt)
    if (key === 'solo') voice.solo = onOff(raw, 'Solo', line, excerpt)
  }
}

function parseLayer(value: string, role: VoiceId, layer: VoiceLayerSettings, line: number, excerpt: string): void {
  const tokens = value.split(/\s+/).filter(Boolean)
  const enabled = tokens.shift()
  if (!enabled) fail('Layer starts with on or off.', line, excerpt)
  layer.enabled = onOff(enabled, 'Layer', line, excerpt)
  for (const token of tokens) {
    const match = /^(engine|waveform|octave|detune|level|character|attack-scale|release-scale)=(.+)$/.exec(token)
    if (!match) fail(`“${token}” is not a layer setting.`, line, excerpt)
    const [, key, raw] = match
    if (key === 'engine') layer.engine = engineFor(raw, role, line, excerpt)
    if (key === 'waveform') {
      if (!WAVEFORMS.includes(raw as Waveform)) fail(`Waveform can be ${WAVEFORMS.join(', ')}.`, line, excerpt)
      layer.waveform = raw as Waveform
    }
    if (key === 'octave') {
      const octave = numberIn(raw, 'Layer octave', -2, 2, line, excerpt)
      if (!Number.isInteger(octave)) fail('Layer octave needs a whole number from -2 to 2.', line, excerpt)
      layer.octave = octave
    }
    if (key === 'detune') layer.detune = numberIn(raw, 'Layer detune', -100, 100, line, excerpt)
    if (key === 'level') layer.level = numberIn(raw, 'Layer level', -36, 0, line, excerpt)
    if (key === 'character') layer.character = numberIn(raw, 'Layer character', 0, 1, line, excerpt)
    if (key === 'attack-scale') layer.attackScale = numberIn(raw, 'Layer attack scale', 0.25, 4, line, excerpt)
    if (key === 'release-scale') layer.releaseScale = numberIn(raw, 'Layer release scale', 0.25, 4, line, excerpt)
  }
}

export function parseComposition(source: string): ParseResult {
  const lines = source.replace(/\r/g, '').split('\n')
  let composition = makeEmptyComposition()
  let opened = false
  let closed = false
  let legacyPalette: string[] | null = null
  let legacyPattern: boolean[] | null = null

  try {
    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index]
      const lineNumber = index + 1
      const line = rawLine.trim()
      if (!line || line.startsWith('//')) continue
      if (!opened) {
        const header = /^(?:scene|track)\s+"([^"]+)"\s*\{\s*$/.exec(line)
        if (!header) fail('Begin with scene "A name" { so the signal has a home.', lineNumber, rawLine)
        composition.name = header[1].trim()
        composition.id = slugify(composition.name)
        opened = true
        continue
      }
      if (line === '}') { closed = true; continue }
      if (closed) fail('There is music after the closing brace. Move it back inside the scene.', lineNumber, rawLine)

      const property = /^([^:]+?)\s*:\s*(.*?)\s*$/.exec(line)
      if (!property) fail('This line needs the form “control: value”.', lineNumber, rawLine)
      const key = property[1].toLowerCase().trim()
      const value = property[2].trim()
      if (!value) fail(`“${property[1]}” is waiting for a value.`, lineNumber, rawLine)

      const patchMatch = /^patch\s+(chords|bass|pulse|texture)$/i.exec(key)
      if (patchMatch) {
        const id = patchMatch[1].toLowerCase() as VoiceId
        if (value.toLowerCase() === 'custom') composition.voices[id].patchId = null
        else {
          const patch = getInstrumentPatch(value)
          if (!patch || patch.role !== id) fail(`“${value}” is not a known ${id} patch.`, lineNumber, rawLine)
          composition.voices[id].patchId = patch.id
        }
        continue
      }
      const layerMatch = /^layer\s+(chords|bass|pulse|texture)\s+shadow$/i.exec(key)
      if (layerMatch) {
        const id = layerMatch[1].toLowerCase() as VoiceId
        parseLayer(value, id, composition.voices[id].layers.shadow, lineNumber, rawLine)
        continue
      }
      if (key.startsWith('voice ')) {
        const id = key.slice(6) as VoiceId
        if (!VOICES.includes(id)) fail(`“${id}” is not a voice.`, lineNumber, rawLine)
        parseVoice(value, id, composition.voices[id], lineNumber, rawLine)
        continue
      }
      const laneMatch = /^(notes|bass|pulse|texture|emphasis)\s+([a-d])$/i.exec(key)
      if (laneMatch) {
        const lane = laneMatch[1].toLowerCase()
        const id = patternId(laneMatch[2].toUpperCase(), lineNumber, rawLine)
        const pattern = composition.patterns.find((item) => item.id === id)!
        if (lane === 'notes' || lane === 'bass') {
          for (const assignment of parseAssignments(value, composition.stepCount, lineNumber, rawLine)) {
            if (lane === 'notes') {
              const notes = assignment.value.split('+')
              const invalid = notes.find((note) => !isNote(note))
              if (invalid) fail(`“${invalid}” is not a note I recognize. Try C4, Eb4, or F#3.`, lineNumber, rawLine)
              pattern.steps[assignment.step].notes = notes
              pattern.steps[assignment.step].chordLength = assignment.length ?? 1
            } else {
              if (!isNote(assignment.value)) fail(`“${assignment.value}” is not a bass note I recognize.`, lineNumber, rawLine)
              pattern.steps[assignment.step].bass = assignment.value
              pattern.steps[assignment.step].bassLength = assignment.length ?? 1
            }
          }
        } else if (lane === 'pulse' || lane === 'texture') {
          for (const step of parseHits(value, composition.stepCount, lineNumber, rawLine)) pattern.steps[step][lane === 'pulse' ? 'drum' : 'texture'] = true
        } else {
          for (const assignment of parseAssignments(value, composition.stepCount, lineNumber, rawLine)) {
            pattern.steps[assignment.step].velocity = numberIn(assignment.value, 'Emphasis', 0.1, 1, lineNumber, rawLine)
          }
        }
        continue
      }
      const expressionMatch = /^(chance|ratchet|shift)\s+([a-d])$/i.exec(key)
      if (expressionMatch) {
        const expression = expressionMatch[1].toLowerCase()
        const id = patternId(expressionMatch[2].toUpperCase(), lineNumber, rawLine)
        const pattern = composition.patterns.find((item) => item.id === id)!
        for (const assignment of parseAssignments(value, composition.stepCount, lineNumber, rawLine)) {
          if (expression === 'chance') pattern.steps[assignment.step].probability = numberIn(assignment.value, 'Chance', 0, 1, lineNumber, rawLine)
          if (expression === 'ratchet') {
            const ratchets = numberIn(assignment.value, 'Ratchet', 1, 4, lineNumber, rawLine)
            if (!Number.isInteger(ratchets)) fail('Ratchet needs a whole number from 1 to 4.', lineNumber, rawLine)
            pattern.steps[assignment.step].ratchets = ratchets
          }
          if (expression === 'shift') pattern.steps[assignment.step].microShift = numberIn(assignment.value, 'Shift', -0.45, 0.45, lineNumber, rawLine)
        }
        continue
      }
      const automationMatch = /^automate\s+(mask|memory|veil|fracture|ghost|overclock)\s+([a-d])$/i.exec(key)
      if (automationMatch) {
        const target = automationMatch[1].toLowerCase() as AutomationTarget
        const id = patternId(automationMatch[2].toUpperCase(), lineNumber, rawLine)
        const lane = composition.patterns.find((item) => item.id === id)!.automation[target]
        for (const assignment of parseAssignments(value, composition.stepCount, lineNumber, rawLine)) {
          const bounds: Record<AutomationTarget, [number, number]> = { mask: [80, 12000], memory: [0, 1], veil: [0, 1], fracture: [0, 1], ghost: [0, 1], overclock: [0, 1] }
          lane[assignment.step] = numberIn(assignment.value, `Automated ${target}`, ...bounds[target], lineNumber, rawLine)
        }
        continue
      }

      switch (key) {
        case 'format-version': {
          const version = numberIn(value, 'Format version', 1, FORMAT_VERSION, lineNumber, rawLine)
          if (!Number.isInteger(version)) fail('Format version needs a whole number.', lineNumber, rawLine)
          composition.formatVersion = FORMAT_VERSION; break
        }
        case 'tempo': composition.bpm = numberIn(value, 'Tempo', 40, 220, lineNumber, rawLine); break
        case 'style':
        case 'world': {
          const style = value.toLowerCase()
          if (!isStyleId(style)) fail(`Style can be ${STYLE_IDS.join(', ')}.`, lineNumber, rawLine)
          composition.world = style; break
        }
        case 'influences': {
          if (value.toLowerCase() === 'none') { composition.styleInfluences = []; break }
          composition.styleInfluences = value.split(/\s+/).map((token) => {
            const match = /^([a-z0-9-]+)=(.+)$/.exec(token)
            if (!match || !isStyleId(match[1])) fail(`“${token}” needs a known style and amount, such as ambient=0.25.`, lineNumber, rawLine)
            return { id: match[1], amount: numberIn(match[2], 'Influence', 0, 0.8, lineNumber, rawLine) }
          }); break
        }
        case 'style-version': {
          const version = numberIn(value, 'Style version', 1, 999, lineNumber, rawLine)
          if (!Number.isInteger(version)) fail('Style version needs a whole number.', lineNumber, rawLine)
          composition.styleVersion = version; break
        }
        case 'meter': {
          if (!METERS.includes(value as Meter)) fail(`Meter can be ${METERS.join(', ')}.`, lineNumber, rawLine)
          composition.meter = value as Meter; break
        }
        case 'steps': {
          const count = numberIn(value, 'Steps', Math.min(...STEP_COUNT_OPTIONS), Math.max(...STEP_COUNT_OPTIONS), lineNumber, rawLine)
          if (!Number.isInteger(count) || !STEP_COUNT_OPTIONS.includes(count as (typeof STEP_COUNT_OPTIONS)[number])) fail(`Steps can be ${STEP_COUNT_OPTIONS.join(', ')}.`, lineNumber, rawLine)
          composition = resizeComposition(composition, count); break
        }
        case 'swing': composition.swing = numberIn(value, 'Swing', 0, 0.75, lineNumber, rawLine); break
        case 'seed': {
          const seed = numberIn(value, 'Seed', 0, 2_147_483_647, lineNumber, rawLine)
          if (!Number.isInteger(seed)) fail('Seed needs a whole number so chance can repeat exactly.', lineNumber, rawLine)
          composition.seed = seed; break
        }
        case 'scale': {
          const scale = /^([A-G](?:#|b)?)\s+(.+)$/i.exec(value)
          const mode = scale?.[2].toLowerCase() as ScaleMode | undefined
          if (!scale || !mode || !SCALE_MODES.includes(mode) || noteToMidi(`${scale[1]}4`) === null) fail(`Scale needs a root and mode: ${SCALE_MODES.join(', ')}.`, lineNumber, rawLine)
          composition.scaleRoot = scale[1][0].toUpperCase() + scale[1].slice(1)
          composition.scaleMode = mode; break
        }
        case 'lock': composition.scaleLock = onOff(value, 'Scale lock', lineNumber, rawLine); break
        case 'patterns': {
          const ids = value.split(/\s+/).map((id) => patternId(id.toUpperCase(), lineNumber, rawLine))
          if (ids.length !== PATTERN_IDS.length || new Set(ids).size !== PATTERN_IDS.length) fail('Patterns must list A B C D once each.', lineNumber, rawLine)
          break
        }
        case 'active': composition.activePatternId = patternId(value.toUpperCase(), lineNumber, rawLine); break
        case 'arrangement': {
          const arrangement = value.split(/\s+/).map((token) => parseArrangementOccurrence(token, lineNumber, rawLine))
          if (!arrangement.length || arrangement.length > 16) fail('Arrangement needs between 1 and 16 pattern occurrences.', lineNumber, rawLine)
          composition.arrangement = arrangement; break
        }
        case 'memory': composition.sound.memory = numberIn(value, 'Memory', 0, 1, lineNumber, rawLine); break
        case 'environment': composition.sound.environment = numberIn(value, 'Environment', 0, 1, lineNumber, rawLine); break
        case 'veil': composition.sound.veil = numberIn(value, 'Veil', 0, 1, lineNumber, rawLine); break
        case 'fracture': composition.sound.fracture = numberIn(value, 'Fracture', 0, 1, lineNumber, rawLine); break
        case 'ghost': composition.sound.ghost = numberIn(value, 'Ghost', 0, 1, lineNumber, rawLine); break
        case 'humanize': composition.sound.humanize = numberIn(value, 'Humanize', 0, 0.2, lineNumber, rawLine); break
        case 'overclock': composition.sound.overclock = numberIn(value, 'Overclock', 0, 1, lineNumber, rawLine); break
        case 'output': composition.masterVolume = numberIn(value, 'Output', -36, -6, lineNumber, rawLine); break
        // Legacy teaching syntax remains importable.
        case 'instrument':
        case 'core':
          if (value === 'violet-glass') composition.voices.chords.layers.primary.waveform = 'triangle'
          else if (WAVEFORMS.includes(value as Waveform)) composition.voices.chords.layers.primary.waveform = value as Waveform
          else fail(`Core can be ${WAVEFORMS.join(', ')}.`, lineNumber, rawLine)
          break
        case 'filter':
        case 'mask': composition.voices.chords.cutoff = numberIn(value, 'Mask', 80, 12000, lineNumber, rawLine); break
        case 'attack': composition.voices.chords.attack = numberIn(value, 'Attack', 0.005, 2, lineNumber, rawLine); break
        case 'decay': composition.voices.chords.decay = numberIn(value, 'Decay', 0.02, 3, lineNumber, rawLine); break
        case 'sustain': composition.voices.chords.sustain = numberIn(value, 'Sustain', 0, 1, lineNumber, rawLine); break
        case 'release': composition.voices.chords.release = numberIn(value, 'Release', 0.03, 5, lineNumber, rawLine); break
        case 'notes': {
          const tokens = value.split(/\s+/).filter(Boolean)
          if (tokens.length < composition.stepCount && tokens.every(isNote)) legacyPalette = tokens
          else {
            if (tokens.length !== composition.stepCount) fail(`Notes has ${tokens.length} steps; this scene expects ${composition.stepCount}.`, lineNumber, rawLine)
            tokens.forEach((token, step) => {
              if (token === '.') return
              const notes = token.split('+')
              if (notes.some((note) => !isNote(note))) fail(`“${token}” contains a note I do not recognize.`, lineNumber, rawLine)
              composition.patterns[0].steps[step].notes = notes
            })
          }
          break
        }
        case 'bass': {
          const tokens = value.split(/\s+/).filter(Boolean)
          if (tokens.length !== composition.stepCount) fail(`Bass has ${tokens.length} steps; this scene expects ${composition.stepCount}.`, lineNumber, rawLine)
          tokens.forEach((token, step) => {
            if (token !== '.' && !isNote(token)) fail(`“${token}” is not a bass note I recognize.`, lineNumber, rawLine)
            if (token !== '.') composition.patterns[0].steps[step].bass = token
          })
          break
        }
        case 'rhythm': {
          const tokens = value.split(/\s+/).filter(Boolean)
          if (tokens.length !== composition.stepCount) fail(`Rhythm has ${tokens.length} steps; this scene expects ${composition.stepCount}.`, lineNumber, rawLine)
          tokens.forEach((token, step) => {
            if (!/^[x.]$/i.test(token)) fail('Rhythm uses x for a hit and . for silence.', lineNumber, rawLine)
            composition.patterns[0].steps[step].drum = token.toLowerCase() === 'x'
          })
          break
        }
        case 'pattern': {
          const compact = value.replace(/\s+/g, '')
          if (!/^[x.]+$/i.test(compact) || compact.length !== composition.stepCount) fail(`Pattern has ${compact.length} steps; this scene expects ${composition.stepCount}.`, lineNumber, rawLine)
          legacyPattern = [...compact].map((token) => token.toLowerCase() === 'x'); break
        }
        default: fail(`“${property[1]}” is not a control in this instrument yet.`, lineNumber, rawLine)
      }
    }

    if (!opened) fail('This scene is empty. Begin with scene "A name" {.', 1, lines[0] ?? '')
    if (!closed) fail('The scene needs a closing } on its own line.', lines.length, lines.at(-1) ?? '')
    if (legacyPalette && !legacyPattern) fail('A short note palette needs a pattern line to say when it plays.', 1, '')
    if (legacyPattern) {
      const palette = legacyPalette ?? ['C4']
      legacyPattern.forEach((active, step) => { composition.patterns[0].steps[step].notes = active ? [...palette] : [] })
    }
    for (const id of VOICES) {
      const patchId = composition.voices[id].patchId
      if (!patchId) continue
      const patch = getInstrumentPatch(patchId)
      if (!patch || JSON.stringify(composition.voices[id]) !== JSON.stringify(patch.settings)) composition.voices[id].patchId = null
    }
    return { ok: true, composition }
  } catch (error) {
    if (error instanceof DslError) return { ok: false, error: { line: error.line, message: error.message, excerpt: error.excerpt } }
    return { ok: false, error: { line: 1, message: 'The signal slipped out of tune. Check the scene text and try again.', excerpt: '' } }
  }
}
