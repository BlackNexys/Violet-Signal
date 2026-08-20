# Arrangement occurrences

Status: first expressive slice implemented 2026-08-20.

## Purpose

Patterns define reusable musical material. Arrangement occurrences define what happens to that material on one repetition without copying or mutating the pattern. This gives the arrangement a compositional role beyond ordering pattern letters.

## Persisted model

Format v3 replaces `PatternId[]` in `Composition.arrangement` with explicit occurrence objects:

```ts
interface ArrangementOccurrence {
  pattern: PatternId
  transpose: number
  mute: VoiceId[]
  layers: Partial<Record<VoiceId, 'all' | 'primary' | 'shadow'>>
}
```

Neutral values are `transpose: 0`, `mute: []`, and no layer overrides. Legacy string entries normalize to neutral objects in `cloneComposition`; normalization is bounded, canonical, and idempotent. Invalid or empty restored arrangements fall back to one occurrence of the active pattern.

## Notation

Neutral occurrences remain bare letters. Transforms use a compact bracket suffix with no internal whitespace:

```text
arrangement: A A[transpose=12] B[mute=pulse+texture] C[layers=chords:shadow+bass:primary]
```

Options are comma-separated and canonicalized in this order:

1. `transpose=-24..24`, whole semitones;
2. `mute=voice[+voice...]`;
3. `layers=voice:(all|primary|shadow)[+voice:selection...]`.

Voices are canonicalized as Chord, Bass, Pulse, Texture. Duplicate fields, duplicate voices, unsupported fields, invalid layer selections, and out-of-range transposition produce line-specific parser errors. Formats v1 and v2 and arrangements containing only letters remain importable; formatting emits v3.

## Resolution semantics

The shared resolver in `src/model/arrangement.ts` is used by live and offline playback:

```text
pattern data and held automation
    -> occurrence transpose / mute / layer focus
    -> live performance gestures
    -> bounded audio safety mapping
```

- Transposition applies only to Chord and Bass pitches at trigger time.
- Occurrence mute prevents new events for that voice; existing release tails end naturally.
- `all` plays Primary and follows the voice's normal Shadow enabled state.
- `primary` plays Primary only.
- `shadow` plays Shadow only and explicitly summons it even if its normal enabled state is off.
- Global voice mute and solo still take precedence when determining whether a voice can trigger.
- Source patterns, their automation lanes, and their stored notes are never rewritten.

## Interface

Song-strip cells now select occurrences rather than deleting them. The selected occurrence exposes bounded transpose buttons, four occurrence-mute toggles, per-voice layer-focus selectors, and an explicit Remove action. Cells summarize transformations and retain a detailed accessible title. Adding a pattern selects the new occurrence; resetting the arrangement returns selection to the first occurrence.

## Deferred fields

Rotation and effect modifiers are intentionally absent from the first persisted shape. Whole-memory rotation will rotate steps and automation together through virtual indices. Effect modifiers will be introduced only after a shared precedence rule can preserve pattern automation. Both can extend format v3 additively if their grammar and defaults remain unambiguous.
