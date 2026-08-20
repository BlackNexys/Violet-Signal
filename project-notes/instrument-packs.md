# Violet Signal instrument packs

Status: first vertical slice implemented 2026-08-19.

## Mental model

Violet Signal still has four musical voices: Chord, Bass, Pulse, and Texture. Each voice now mixes a required **Primary** source with an optional **Shadow** source before entering its existing channel filter and level.

```text
sequencer event -> Primary + Shadow -> voice filter/level -> shared effects -> limiter
```

This adds timbral depth without adding sequencer lanes. Mute, solo, Mask automation, and channel level apply to both layers together.

## Layer data introduced in format v2

`Composition.formatVersion` is independent of `styleVersion`. Missing versions and legacy flat `core`/`detune` voice data migrate to format v2 with:

- the legacy waveform and detune in Primary;
- the role's original synthesis engine;
- Shadow disabled;
- no patch provenance.

The migration runs through `cloneComposition`, so scenes, IndexedDB snapshots, undo history, and imported project objects share one normalization path. The safe notation parser continues accepting legacy voice lines. The current format is v3 because arrangement occurrences were added later; v2 layer data remains unchanged and canonical v3 notation includes it explicitly.

## Engines in the first slice

| Engine | Roles | Tone source |
| --- | --- | --- |
| `subtractive` | Chord, Bass | `PolySynth(Synth)` / `MonoSynth` |
| `fm` | Chord, Bass | `PolySynth(FMSynth)` / `FMSynth` |
| `am` | Chord, Bass | `PolySynth(AMSynth)` / `AMSynth` |
| `membrane` | Pulse | `MembraneSynth` |
| `noise` | Pulse, Texture | `NoiseSynth` |

Compatibility is declared once in `ENGINES_BY_VOICE` and enforced by model helpers, notation parsing, patch validation, state actions, and UI options.

Character is a normalized `0..1` macro. Pure mappings translate it to bounded FM harmonicity/modulation index, AM harmonicity, or membrane pitch decay/octave range. Engines that do not need a special mapping retain the normalized value for future-compatible patch data.

## Pack registry

Built-in definitions live in `src/model/instrumentPacks.ts`. A pack supplies identity and descriptive metadata; a patch supplies one role's complete concrete `VoiceSettings`.

The first registry contains:

- **Blacklight Core** — Quiet Circuit, Underline, Heart Signal, and Rain Carrier reproduce the calibrated original voices.
- **Veil Archive** — Glass Choir combines an AM Primary with a quiet octave-up FM Shadow; Undertow combines a sine subtractive bass with a restrained FM Shadow.

Patch ids use `pack-id/patch-id@version`. Applying a patch copies its complete settings into the composition. Playback never requires a registry lookup, so a future pack revision cannot silently alter an existing project. Changing a sound-defining layer, filter, envelope, or channel value clears provenance to **Custom**; mute and solo do not.

## Adding a built-in patch

1. Use an existing stable pack or add a unique kebab-case pack definition.
2. Add a `definePatch` entry with a unique versioned id, one compatible voice role, a conventional description, and concise tags.
3. Keep Primary enabled. Use conservative Shadow gain and voice channel gain.
4. Use only bounded layer and channel values. Do not place raw Tone.js options in a patch.
5. Run registry validation, notation round-trip, state/undo, live browser, and offline WAV tests.
6. Listen at matched loudness with long releases, dense chords, ratchets, and Overclock.

External pack import is intentionally out of scope. When added, it must validate data against an explicit schema and must never execute JavaScript.

## Audio parity

`src/audio/instrumentSource.ts` is shared by live and offline rendering. It owns engine construction, Character mapping, pitch transposition, layer gain, envelope response scaling, triggering, release, and disposal. The live engine may rebuild a source when its engine changes; all other safe updates are applied to the existing source.

The browser smoke test applies Glass Choir and renders it through the production offline WAV path. Node unit tests cover mappings and data behavior; the actual offline audio test is conditionally skipped when the test runtime has no native `OfflineAudioContext`.

## Current boundaries

- Exactly two layer slots per voice.
- No per-layer effects, automation, mute, or solo.
- No samples, remote assets, or new runtime dependencies.
- No dual-oscillator, metal, or pluck engines yet.
- Pack provenance is descriptive; concrete serialized values are authoritative.
