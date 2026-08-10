import { autocompletion, type CompletionContext } from '@codemirror/autocomplete'
import { StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, MatchDecorator, ViewPlugin, type DecorationSet } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { useEffect, useRef } from 'react'
import { activeTokenRanges } from '../dsl/serializer'
import type { PatternId } from '../model/composition'
import { STYLE_DEFINITIONS } from '../model/styles'

interface CodeEditorProps {
  value: string
  activeStep: number
  playingPatternId: PatternId
  errorLine: number | null
  errorNavigationRequest: number
  onChange: (value: string) => void
}

const setPlayingRanges = StateEffect.define<Array<{ from: number; to: number }>>()
const playingField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes)
    for (const effect of transaction.effects) if (effect.is(setPlayingRanges)) next = Decoration.set(effect.value.map((range) => Decoration.mark({ class: 'cm-playing-token' }).range(range.from, range.to)))
    return next
  },
  provide: (field) => EditorView.decorations.from(field),
})

const setErrorLine = StateEffect.define<number | null>()
const errorField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes)
    for (const effect of transaction.effects) {
      if (!effect.is(setErrorLine)) continue
      const lineNumber = effect.value
      next = lineNumber && lineNumber <= transaction.state.doc.lines
        ? Decoration.set([Decoration.line({ class: 'cm-error-line' }).range(transaction.state.doc.line(lineNumber).from)])
        : Decoration.none
    }
    return next
  },
  provide: (field) => EditorView.decorations.from(field),
})

function matcherPlugin(regexp: RegExp, className: string) {
  const matcher = new MatchDecorator({ regexp, decoration: Decoration.mark({ class: className }) })
  return ViewPlugin.define((view) => ({
    decorations: matcher.createDeco(view),
    update(update) { this.decorations = matcher.updateDeco(update, this.decorations) },
  }), { decorations: (plugin) => plugin.decorations })
}

const keywordHighlights = matcherPlugin(/\b(scene|track|style|style-version|world|influences|tempo|meter|steps|swing|seed|scale|lock|patterns|active|arrangement|voice|memory|environment|veil|fracture|ghost|humanize|overclock|output|notes|bass|pulse|texture|emphasis|chance|ratchet|shift|automate)\b/g, 'cm-dsl-keyword')
const noteHighlights = matcherPlugin(/\b[A-G](?:#|b)?-?\d\b/g, 'cm-dsl-note')
const patternHighlights = matcherPlugin(/\b(?:A|B|C|D)\b/g, 'cm-dsl-pattern')

const completions = [
  ...STYLE_DEFINITIONS.map((style) => `style: ${style.id}`), 'style-version: 1', 'influences: ambient=0.25', 'tempo: ', 'meter: 4/4', 'steps: 16', 'swing: 0.08', 'seed: ', 'scale: C minor', 'lock: on', 'patterns: A B C D', 'active: A',
  'arrangement: A A B C', 'voice chords: triangle filter=lowpass cutoff=2800 resonance=0.8 detune=0 glide=0 volume=-10 attack=0.05 decay=0.38 sustain=0.58 release=1.4 mute=off solo=off',
  'notes A: 01=C4+Eb4+G4~4', 'bass A: 01=C2~4', 'pulse A: 01 05 09 13', 'texture A: none',
  'chance A: 07=0.65', 'ratchet A: 15=3', 'shift A: 03=-0.08',
  'automate mask A: 01=1200 09=4200', 'automate veil A: 01=0.2 09=0.7', 'automate fracture A: 01=0.05 13=0.65',
  'memory: 0.28', 'environment: 0.2', 'veil: 0.35', 'fracture: 0.08', 'ghost: 0.12', 'humanize: 0.03', 'overclock: 0',
]

function completeDsl(context: CompletionContext) {
  const word = context.matchBefore(/[\w ]*/)
  if (!word || (word.from === word.to && !context.explicit)) return null
  return { from: word.from, options: completions.map((label) => ({ label, type: 'keyword' })) }
}

const violetTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'transparent', color: '#f1eaf0' },
  '.cm-content': { padding: '20px 10px 34px', caretColor: '#d9a2ff', fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace', fontSize: '13px', lineHeight: '1.72' },
  '.cm-cursor': { borderLeftColor: '#d9a2ff', borderLeftWidth: '2px' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: '#53366f99' },
  '.cm-gutters': { backgroundColor: '#0b0910', color: '#776d7c', borderRight: '1px solid #282132', paddingLeft: '6px' },
  '.cm-activeLine': { backgroundColor: '#9668f00a', boxShadow: 'inset 2px 0 #9668f066' },
  '.cm-activeLineGutter': { backgroundColor: '#9668f010', color: '#c3a9d1' },
  '.cm-focused': { outline: 'none' },
  '.cm-playing-token': { backgroundColor: '#9668f038', color: '#f0d4ff', borderRadius: '2px', boxShadow: 'inset 0 -1px #d58cff, 0 0 10px #9668f02b' },
  '.cm-error-line': { backgroundColor: '#e6506215', boxShadow: 'inset 2px 0 #e65062' },
  '.cm-dsl-keyword': { color: '#c697ee', fontWeight: '600' },
  '.cm-dsl-note': { color: '#e9c4ff' },
  '.cm-dsl-pattern': { color: '#d99a62' },
  '.cm-tooltip-autocomplete': { backgroundColor: '#191423', border: '1px solid #514064', color: '#f1eaf0' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#2a1c39', color: '#e9c4ff' },
})

export function CodeEditor({ value, activeStep, playingPatternId, errorLine, errorNavigationRequest, onChange }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const externalUpdate = useRef(false)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!hostRef.current) return
    const view = new EditorView({
      doc: value,
      parent: hostRef.current,
      extensions: [
        basicSetup, playingField, errorField, keywordHighlights, noteHighlights, patternHighlights,
        autocompletion({ override: [completeDsl], activateOnTyping: true }), violetTheme, EditorView.lineWrapping,
        EditorView.updateListener.of((update) => { if (update.docChanged && !externalUpdate.current) onChangeRef.current(update.state.doc.toString()) }),
      ],
    })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
    // Editor lifetime is intentionally tied only to its host node.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      externalUpdate.current = true
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
      externalUpdate.current = false
    }
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const ranges = activeStep >= 0 ? activeTokenRanges(view.state.doc.toString(), activeStep, playingPatternId) : []
    view.dispatch({ effects: setPlayingRanges.of(ranges) })
  }, [activeStep, playingPatternId, value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setErrorLine.of(errorLine) })
  }, [errorLine, value])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !errorLine || errorNavigationRequest === 0) return
    const line = view.state.doc.line(Math.min(errorLine, view.state.doc.lines))
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true })
    view.focus()
  }, [errorLine, errorNavigationRequest])

  return <div ref={hostRef} className="code-editor" aria-label="Scene code editor" />
}
