# Arrangement occurrences

Status: whole-memory rotation and bounded effect modifiers implemented 2026-08-20.

## Purpose

Patterns define reusable musical material. Arrangement occurrences define what happens to that material on one repetition without copying or mutating the pattern. This gives the arrangement a compositional role beyond ordering pattern letters.

## Persisted model

Format v3 replaces `PatternId[]` in `Composition.arrangement` with explicit occurrence objects:

```ts
interface ArrangementOccurrence {
  pattern: PatternId
  transpose: number
  rotate: number
  mute: VoiceId[]
  layers: Partial<Record<VoiceId, 'all' | 'primary' | 'shadow'>>
  effects: Partial<Record<AutomationTarget, number>>
}
```

Neutral values are `transpose: 0`, `rotate: 0`, `mute: []`, no layer overrides, and no effect modifiers. Legacy string entries normalize to neutral objects in `cloneComposition`; normalization is bounded, canonical, and idempotent. Invalid or empty restored arrangements fall back to one occurrence of the active pattern.

## Notation

Neutral occurrences remain bare letters. Transforms use a compact bracket suffix with no internal whitespace:

```text
arrangement: A A[transpose=12,rotate=-3] B[mute=pulse+texture,effects=veil:0.2+fracture:0.15] C[layers=chords:shadow+bass:primary,effects=mask:1.5]
```

Options are comma-separated and canonicalized in this order:

1. `transpose=-24..24`, whole semitones;
2. `rotate=-63..63`, whole steps;
3. `mute=voice[+voice...]`;
4. `layers=voice:(all|primary|shadow)[+voice:selection...]`;
5. `effects=target:number[+target:number...]`.

Mask effect values are multipliers from `0.25` to `4`; Memory, Veil, Fracture, Ghost, and Overclock are offsets from `-1` to `1`. Voices are canonicalized as Chord, Bass, Pulse, Texture and effects as Mask, Memory, Veil, Fracture, Ghost, Overclock. Duplicate fields, duplicate targets or voices, unsupported fields, invalid layer selections, and out-of-range values produce line-specific parser errors. Formats v1 and v2 and arrangements containing only letters remain importable; formatting emits v3.

## Resolution semantics

The shared resolver in `src/model/arrangement.ts` is used by live and offline playback:

```text
pattern data and resolved Hold/Linear automation
    -> occurrence rotation / transpose / mute / layer focus / effect modifier
    -> live performance gestures
    -> bounded audio safety mapping
```

- Positive rotation moves the final pattern steps to the front. Steps, expression values, and every automation lane rotate together in a cloned virtual pattern.
- Transposition applies only to Chord, Signal, and Bass pitches at trigger time.
- Occurrence mute prevents new events for that voice; existing release tails end naturally.
- `all` plays Primary and follows the voice's normal Shadow enabled state.
- `primary` plays Primary only.
- `shadow` plays Shadow only and explicitly summons it even if its normal enabled state is off.
- Global voice mute and solo still take precedence when determining whether a voice can trigger.
- Mask is multiplied by its occurrence value; Memory, Veil, Fracture, Ghost, and Overclock add their occurrence values after pattern automation.
- Performance gestures apply after those written modifiers, and processor safety bounds apply last.
- Source patterns, their automation lanes, and their stored notes are never rewritten.

## Interface

Song-strip cells select occurrences rather than deleting them. The selected occurrence exposes bounded transpose and rotation buttons, four occurrence-mute toggles, per-voice layer-focus selectors, a target-specific effect slider, and an explicit Remove action. Cells summarize transformations and retain a detailed accessible title. Adding a pattern selects the new occurrence; resetting the arrangement returns selection to the first occurrence.

## Compatibility contract

Rotation and effects were introduced additively in format v3. Format v4 adds Signal to the existing transpose, mute, and layer-selection rules. Bare pattern letters and neutral values retain their previous sound, and migrated Signal lanes are empty.
