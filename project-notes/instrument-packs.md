# Violet Signal instrument packs

Status: expanded engine vocabulary and Signal role implemented 2026-08-20.

## Mental model

Violet Signal has five musical voices: Chord, Signal, Bass, Pulse, and Texture. Signal is the independent monophonic lead role. Each voice mixes a required **Primary** source with an optional **Shadow** source before entering its channel filter and level.

```text
sequencer event -> Primary + Shadow -> voice filter/level -> dry bus --------|
                                                      -> four voice sends ---|-> shared parallel returns -> drive -> limiter
```

This adds timbral depth without adding sequencer lanes. Mute, solo, Mask automation, and channel level apply to both layers together.

## Layer data introduced in format v2

`Composition.formatVersion` is independent of `styleVersion`. Missing versions and legacy flat `core`/`detune` voice data migrate to format v2 with:

- the legacy waveform and detune in Primary;
- the role's original synthesis engine;
- Shadow disabled;
- no patch provenance.

The migration runs through `cloneComposition`, so scenes, IndexedDB snapshots, undo history, and imported project objects share one normalization path. The safe notation parser continues accepting legacy voice lines. Format v3 added arrangement occurrences. The current format is v4: older projects gain a calibrated Signal voice and an empty Signal lane, preserving their exact authored sound until Signal notes are added.

## Engine compatibility

| Engine | Roles | Tone source |
| --- | --- | --- |
| `subtractive` | Chord, Signal, Bass | `PolySynth(Synth)` / `MonoSynth` |
| `fm` | Chord, Signal, Bass | `PolySynth(FMSynth)` / `FMSynth` |
| `am` | Chord, Signal, Bass | `PolySynth(AMSynth)` / `AMSynth` |
| `dual` | Chord, Signal, Bass | `PolySynth(DuoSynth)` / `DuoSynth` |
| `pluck` | Chord, Signal, Bass | managed `PluckSynth` pool |
| `membrane` | Pulse | `MembraneSynth` |
| `metal` | Pulse, Texture | `MetalSynth` |
| `noise` | Pulse, Texture | `NoiseSynth` |

Compatibility is declared once in `ENGINES_BY_VOICE` and enforced by model helpers, notation parsing, patch validation, state actions, and UI options.

Character is a normalized `0..1` macro. Pure mappings translate it to bounded FM harmonicity/modulation index, AM harmonicity, dual-oscillator spread/vibrato, pluck excitation/dampening/resonance, membrane pitch decay/octave range, or metallic harmonicity/modulation/filter range. Engines that do not need a special mapping retain the normalized value for future-compatible patch data.

Chord layers cap Tone polyphony at eight voices. The physical-pluck adapter uses an explicit eight-source Chord pool and four-source Bass pool, reusing sources in deterministic round-robin order and scheduling every release. Per-source gains retain step velocity. This keeps dense chords and ratchets bounded without making pluck live-only; the same pool runs inside Tone Offline.

## Pack registry

Built-in definitions live in `src/model/instrumentPacks.ts`. A pack supplies identity and descriptive metadata; a patch supplies one role's complete concrete `VoiceSettings`.

The first registry contains:

- **Blacklight Core** — Quiet Circuit, Carrier Line, Underline, Heart Signal, and Rain Carrier provide the calibrated starting voices.
- **Veil Archive** — Glass Choir combines an AM Primary with a quiet octave-up FM Shadow; Undertow combines a sine subtractive bass with a restrained FM Shadow; Cold Beacon gives Signal a glassy AM/FM lead.
- **Chrome Wound** — Razor Assembly and Reactor use dual oscillators; Iron Pulse and Arc Ash combine membrane, metal, and noise layers.
- **Fractured Relay** — Wire Below provides a managed physical-pluck bass; Needle Light gives Signal a plucked lead; Relay Click provides a clipped metallic transient.

Patch ids use `pack-id/patch-id@version`. Applying a patch copies its complete sound settings into the composition while preserving that voice's four effect sends. Playback never requires a registry lookup, so a future pack revision cannot silently alter an existing project. Changing a sound-defining layer, filter, envelope, or channel value clears provenance to **Custom**; routing sends, mute, and solo do not.

## Adding a built-in patch

1. Use an existing stable pack or add a unique kebab-case pack definition.
2. Add a `definePatch` entry with a unique versioned id, one compatible voice role, a conventional description, and concise tags.
3. Keep Primary enabled. Use conservative Shadow gain and voice channel gain.
4. Use only bounded layer and channel values. Do not place raw Tone.js options in a patch.
5. Run registry validation, notation round-trip, state/undo, live browser, and offline WAV tests.
6. Listen at matched loudness with long releases, dense chords, ratchets, and Overclock.

External pack import is intentionally out of scope. When added, it must validate data against an explicit schema and must never execute JavaScript.

## Audio parity

`src/audio/instrumentSource.ts` is shared by live and offline rendering. It owns engine construction, Character mapping, pitch transposition, layer gain, envelope response scaling, one-shot triggering, tied attack/pitch-change/release lifecycles, and disposal. The live engine may rebuild a source when its engine changes; all other safe updates are applied to the existing source.

The browser smoke test authors a tied Signal phrase, applies dual, pluck, and metal patches across all five voices, and renders them together through the production offline WAV path. Node unit tests cover mappings, compatibility, notation, migration, and data behavior; the actual Node offline audio test is conditionally skipped when the runtime has no native `OfflineAudioContext`.

## Current boundaries

- Exactly two layer slots per voice.
- Per-voice sends feed four shared processors; there are no per-layer effects, sends, automation, mute, or solo.
- No samples, remote assets, or new runtime dependencies.
- Pluck articulation is intentionally short and pooled. Explicit ties retain shared strings and re-excite only changed pitches because a physical-pluck delay line cannot be continuously repitched.
- Pack provenance is descriptive; concrete serialized values are authoritative.
